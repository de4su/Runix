export interface CodeFile {
  id: string;
  name: string;
  content: string;
}

export type SupportedLanguage =
  | 'c' | 'cpp' | 'python' | 'java' | 'javascript'
  | 'typescript' | 'rust' | 'go' | 'ruby' | 'swift' | 'php' | 'lua';

export interface WandboxCompiler {
  name: string;
  displayName: string;
  language: string;
  version: string;
  isHead: boolean;
}

export interface WandboxRawCompiler {
  name: string;
  language: string;
  'display-name': string;
  version: string;
  'display-compile-command': string;
}

export interface LanguageConfig {
  id: SupportedLanguage;
  name: string;
  wandboxLanguage: string;
  defaultCompiler: string;
  extension: string;
  prismLanguage: string;
  compilers: WandboxCompiler[];
  defaultFiles: CodeFile[];
  defaultStdin?: string;
  supportsFlagGroups?: FlagGroupId[];
}

// ─── Compiler flags ─────────────────────────────────────────────────────────
export type FlagGroupId = 'warnings' | 'standard' | 'optimize' | 'sanitize' | 'libraries';

export interface FlagPreset {
  flag: string;       // e.g. "-Wall"
  label: string;      // short label for pill
  description: string;
  group: FlagGroupId;
  langs: SupportedLanguage[];  // which languages it applies to
  exclusive?: string; // flag group key — only one active at a time (e.g. std, opt level)
}

export interface CompilerFlags {
  active: Set<string>;   // set of active flag strings
  custom: string;        // raw extra flags
}

// ─── Execution result ────────────────────────────────────────────────────────
export interface CompilerResult {
  stdout: string;
  stderr: string;
  compilerOutput: string;       // raw compiler message
  warnings: string[];           // parsed warning lines
  errors: string[];             // parsed error lines
  exitCode: number;
  signal?: string;
  elapsedMs?: number;
}
