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
    else if (currentType === 'error') errors.push(currentBlock.join('\n'));
    currentBlock = [];
    currentType = null;
  };

  for (const line of lines) {
    const isWarning = /warning:/i.test(line);
    const isError   = /error:/i.test(line) && !/^\s*(note:|=|\^|~)/.test(line);
    const isCont    = /^\s*(note:|=|\^|~|\|)/.test(line) || (currentType && !isWarning && !isError);
    if (isError)       { flush(); currentType = 'error';   currentBlock = [line]; }
    else if (isWarning){ flush(); currentType = 'warning'; currentBlock = [line]; }
    else if (isCont && currentType) currentBlock.push(line);
    else if (currentType) currentBlock.push(line);
  }
  flush();
  return { warnings, errors };
}

// Check payload size before sending — Wandbox rejects > ~50KB
const MAX_PAYLOAD_BYTES = 48_000;

function friendlyHttpError(status: number, totalBytes: number): string {
  if (status === 413) {
    return [
      `Your combined files (${(totalBytes / 1024).toFixed(1)} KB) exceed Wandbox's size limit.`,
      '',
      'If you\'re using #include "file.c" to include another .c file directly:',
      '→ Copy the contents of that file and paste them above your code instead.',
      '→ Wandbox treats each file separately — it can\'t resolve local .c includes the same way GCC does on your machine.',
    ].join('\n');
  }
  if (status === 429) return 'Rate limited by Wandbox — please wait a few seconds and try again.';
  if (status === 503 || status === 502) return 'Wandbox is temporarily unavailable. Try again in a moment.';
  return `Wandbox returned HTTP ${status}. Try again or check wandbox.org.`;
}

export async function compileAndRun(
  compiler: string,
  files: CodeFile[],
  stdin: string,
  flags: string,
): Promise<CompilerResult> {
  const [main, ...rest] = files;
  const t0 = Date.now();

  const body: Record<string, unknown> = {
    compiler,
    code: main.content,
    save: false,
  };
  if (stdin.trim())  body.stdin = stdin;
  if (flags.trim())  body['compiler-option-raw'] = flags.trim();
  if (rest.length)   body.codes = rest.map(f => ({ file: f.name, code: f.content }));

  const bodyStr = JSON.stringify(body);
  const totalBytes = new TextEncoder().encode(bodyStr).length;

  // Warn before sending if we know it will be rejected
  if (totalBytes > MAX_PAYLOAD_BYTES) {
    return {
      stdout: '',
      stderr: friendlyHttpError(413, totalBytes),
      compilerOutput: '',
      warnings: [],
      errors: [`Payload too large (${(totalBytes / 1024).toFixed(1)} KB). Wandbox limit is ~48 KB.\n\nIf you are using #include "file.c": paste the contents of that file directly into your main file instead — Wandbox cannot resolve local .c includes.`],
      exitCode: 1,
      elapsedMs: Date.now() - t0,
    };
  }

  const res = await fetch(`${BASE}/compile.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: bodyStr,
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    return {
      stdout: '',
      stderr: friendlyHttpError(res.status, totalBytes),
      compilerOutput: '',
      warnings: [],
      errors: [friendlyHttpError(res.status, totalBytes)],
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
