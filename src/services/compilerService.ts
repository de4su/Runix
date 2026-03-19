import { CodeFile, CompilerResult, WandboxRawCompiler, WandboxCompiler } from '../types';

const BASE = 'https://wandbox.org/api';

export async function fetchCompilerList(): Promise<WandboxRawCompiler[]> {
  const res = await fetch(`${BASE}/list.json`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function parseCompiler(raw: WandboxRawCompiler): WandboxCompiler {
  const isHead = /head/i.test(raw.name);
  const vShort = raw.version.split(' ')[0];
  return {
    name: raw.name,
    displayName: isHead ? `${raw['display-name']} (latest)` : `${raw['display-name']} ${vShort}`,
    language: raw.language,
    version: raw.version,
    isHead,
  };
}

export function parseCompilerMessages(raw: string): { warnings: string[]; errors: string[] } {
  const lines = raw.split('\n').filter(Boolean);
  const warnings: string[] = [];
  const errors: string[] = [];
  let currentBlock: string[] = [];
  let currentType: 'warning' | 'error' | null = null;

  const flush = () => {
    if (!currentBlock.length) return;
    if (currentType === 'warning') warnings.push(currentBlock.join('\n'));
    else if (currentType === 'error')   errors.push(currentBlock.join('\n'));
    currentBlock = [];
    currentType = null;
  };

  for (const line of lines) {
    const isWarning = /warning:/i.test(line);
    const isError   = /error:/i.test(line) && !/^\s*(note:|=|\^|~)/.test(line);
    const isCont    = /^\s*(note:|=|\^|~|\|)/.test(line) || (currentType && !isWarning && !isError);
    if (isError)        { flush(); currentType = 'error';   currentBlock = [line]; }
    else if (isWarning) { flush(); currentType = 'warning'; currentBlock = [line]; }
    else if (isCont && currentType) currentBlock.push(line);
    else if (currentType) currentBlock.push(line);
  }
  flush();
  return { warnings, errors };
}

/**
 * Recursively resolves local #include "filename" directives by inlining
 * the content of any matching open file. This mirrors what the C preprocessor
 * does locally — so files like `#include "binary_tree_from_list.c"` work
 * without modification, as long as that file is open in the editor.
 *
 * Guards against circular includes via a visited set.
 */
function resolveIncludes(
  content: string,
  fileName: string,
  fileMap: Map<string, string>,
  visited: Set<string> = new Set(),
): string {
  if (visited.has(fileName)) return content; // circular guard
  visited.add(fileName);

  return content.replace(
    /^[ \t]*#include\s+"([^"]+)"\s*$/gm,
    (_match, included: string) => {
      const file = fileMap.get(included);
      if (!file) return _match; // not one of our files — leave it (system headers etc.)
      const resolved = resolveIncludes(file, included, fileMap, new Set(visited));
      return `/* ---- inlined from ${included} ---- */\n${resolved}\n/* ---- end ${included} ---- */`;
    },
  );
}

function friendlyHttpError(status: number): string {
  if (status === 413) return 'Payload too large — try removing unused files from the editor.';
  if (status === 429) return 'Rate limited by Wandbox — wait a few seconds and try again.';
  if (status === 503 || status === 502) return 'Wandbox is temporarily unavailable. Try again shortly.';
  return `Wandbox returned HTTP ${status}.`;
}

export async function compileAndRun(
  compiler: string,
  files: CodeFile[],
  stdin: string,
  flags: string,
): Promise<CompilerResult> {
  const t0 = Date.now();
  const [main, ...rest] = files;

  // Build a name→content map for all open files so resolveIncludes can find them
  const fileMap = new Map<string, string>();
  for (const f of files) fileMap.set(f.name, f.content);

  // Inline any #include "localfile" that matches an open editor file
  const resolvedMain = resolveIncludes(main.content, main.name, fileMap);

  // After inlining, secondary files that were only referenced via #include
  // no longer need to be sent. We keep only files NOT already inlined.
  const inlinedNames = new Set<string>();
  const scanForInlined = (content: string) => {
    const re = /\/\* ---- inlined from ([^\s]+) ----/g;
    let m;
    while ((m = re.exec(content)) !== null) inlinedNames.add(m[1]);
  };
  scanForInlined(resolvedMain);

  const remainingSecondary = rest.filter(f => !inlinedNames.has(f.name));

  const body: Record<string, unknown> = {
    compiler,
    code: resolvedMain,
    save: false,
  };
  if (stdin.trim()) body.stdin = stdin;
  if (flags.trim()) body['compiler-option-raw'] = flags.trim();
  if (remainingSecondary.length) {
    body.codes = remainingSecondary.map(f => ({
      file: f.name,
      code: resolveIncludes(f.content, f.name, fileMap),
    }));
  }

  const res = await fetch(`${BASE}/compile.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const msg = friendlyHttpError(res.status);
    return {
      stdout: '',
      stderr: msg,
      compilerOutput: '',
      warnings: [],
      errors: [msg],
      exitCode: 1,
      elapsedMs: Date.now() - t0,
    };
  }

  const d = await res.json();
  const raw = d.compiler_message ?? d.compiler_error ?? '';
  const { warnings, errors } = parseCompilerMessages(raw);

  return {
    stdout: d.program_output ?? '',
    stderr: d.program_error  ?? '',
    compilerOutput: raw,
    warnings,
    errors,
    exitCode: Number(d.status ?? 0),
    signal: d.signal || undefined,
    elapsedMs: Date.now() - t0,
  };
}
