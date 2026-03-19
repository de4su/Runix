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

// Parse compiler message into separate warnings and errors
export function parseCompilerMessages(raw: string): { warnings: string[]; errors: string[] } {
  const lines = raw.split('\n').filter(Boolean);
  const warnings: string[] = [];
  const errors: string[] = [];
  let currentBlock: string[] = [];
  let currentType: 'warning' | 'error' | null = null;

  const flush = () => {
    if (!currentBlock.length) return;
    if (currentType === 'warning') warnings.push(currentBlock.join('\n'));
    else if (currentType === 'error') errors.push(currentBlock.join('\n'));
    currentBlock = [];
    currentType = null;
  };

  for (const line of lines) {
    const isWarning = /warning:/i.test(line);
    const isError   = /error:/i.test(line) && !/^\s*(note:|=|\^|~)/.test(line);
    const isContinuation = /^\s*(note:|=|\^|~|\|)/.test(line) || (currentType && !isWarning && !isError);

    if (isError) {
      flush();
      currentType = 'error';
      currentBlock = [line];
    } else if (isWarning) {
      flush();
      currentType = 'warning';
      currentBlock = [line];
    } else if (isContinuation && currentType) {
      currentBlock.push(line);
    } else {
      // unclassified — treat as error context if we have an active block
      if (currentType) currentBlock.push(line);
    }
  }
  flush();

  return { warnings, errors };
}

export async function compileAndRun(
  compiler: string,
  files: CodeFile[],
  stdin: string,
  flags: string,   // space-separated raw flags e.g. "-Wall -O2 -std=c17"
): Promise<CompilerResult> {
  const [main, ...rest] = files;
  const t0 = Date.now();

  const body: Record<string, unknown> = {
    compiler,
    code: main.content,
    save: false,
  };
  if (stdin.trim())          body.stdin = stdin;
  if (flags.trim())          body['compiler-option-raw'] = flags.trim();
  if (rest.length)           body.codes = rest.map(f => ({ file: f.name, code: f.content }));

  const res = await fetch(`${BASE}/compile.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`Wandbox returned HTTP ${res.status}`);
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
