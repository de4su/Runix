import { FlagPreset, SupportedLanguage } from './types';

const C_CPP: SupportedLanguage[] = ['c', 'cpp'];
const ALL_COMPILED: SupportedLanguage[] = ['c', 'cpp', 'rust', 'go', 'swift'];

export const FLAG_PRESETS: FlagPreset[] = [
  // ── Warnings ──────────────────────────────────────────────────────────────
  {
    flag: '-Wall', label: '-Wall', group: 'warnings',
    description: 'Enable all common warnings — always use this',
    langs: C_CPP,
  },
  {
    flag: '-Wextra', label: '-Wextra', group: 'warnings',
    description: 'Extra warnings beyond -Wall (uninitialized vars, unused params…)',
    langs: C_CPP,
  },
  {
    flag: '-Werror', label: '-Werror', group: 'warnings',
    description: 'Treat all warnings as hard errors — forces clean code',
    langs: C_CPP,
  },
  {
    flag: '-Wshadow', label: '-Wshadow', group: 'warnings',
    description: 'Warn when a local variable shadows an outer variable',
    langs: C_CPP,
  },
  {
    flag: '-Wno-unused-variable', label: '-Wno-unused', group: 'warnings',
    description: 'Silence unused variable warnings',
    langs: C_CPP,
  },

  // ── Standard ──────────────────────────────────────────────────────────────
  {
    flag: '-std=c99', label: 'C99', group: 'standard', exclusive: 'std',
    description: 'C99 standard — VLAs, inline, designated initializers',
    langs: ['c'],
  },
  {
    flag: '-std=c11', label: 'C11', group: 'standard', exclusive: 'std',
    description: 'C11 standard — _Generic, _Atomic, threads (most common in courses)',
    langs: ['c'],
  },
  {
    flag: '-std=c17', label: 'C17', group: 'standard', exclusive: 'std',
    description: 'C17 — latest stable C standard, bug-fixes on C11',
    langs: ['c'],
  },
  {
    flag: '-std=c++14', label: 'C++14', group: 'standard', exclusive: 'std',
    description: 'C++14 — lambdas, auto, range-for',
    langs: ['cpp'],
  },
  {
    flag: '-std=c++17', label: 'C++17', group: 'standard', exclusive: 'std',
    description: 'C++17 — structured bindings, std::optional, if constexpr',
    langs: ['cpp'],
  },
  {
    flag: '-std=c++20', label: 'C++20', group: 'standard', exclusive: 'std',
    description: 'C++20 — concepts, ranges, coroutines, modules',
    langs: ['cpp'],
  },

  // ── Optimization ──────────────────────────────────────────────────────────
  {
    flag: '-O0', label: '-O0', group: 'optimize', exclusive: 'opt',
    description: 'No optimization — best for debugging, variables stay in scope',
    langs: C_CPP,
  },
  {
    flag: '-O1', label: '-O1', group: 'optimize', exclusive: 'opt',
    description: 'Minimal optimization — small & fast without affecting debug',
    langs: C_CPP,
  },
  {
    flag: '-O2', label: '-O2', group: 'optimize', exclusive: 'opt',
    description: 'Standard release optimization — what most production code uses',
    langs: C_CPP,
  },
  {
    flag: '-O3', label: '-O3', group: 'optimize', exclusive: 'opt',
    description: 'Aggressive optimization — vectorization, inlining, loop unrolling',
    langs: C_CPP,
  },
  {
    flag: '-Os', label: '-Os', group: 'optimize', exclusive: 'opt',
    description: 'Optimize for binary size — embedded systems, OS kernels',
    langs: C_CPP,
  },
  {
    flag: '-g', label: '-g', group: 'optimize',
    description: 'Emit debug info — needed for gdb, valgrind, sanitizer stack traces',
    langs: C_CPP,
  },

  // ── Sanitizers ────────────────────────────────────────────────────────────
  {
    flag: '-fsanitize=address', label: 'AddressSanitizer', group: 'sanitize',
    description: 'Detects buffer overflows, heap use-after-free, stack overflows — essential for C/C++ assignments',
    langs: C_CPP,
  },
  {
    flag: '-fsanitize=undefined', label: 'UBSanitizer', group: 'sanitize',
    description: 'Catches undefined behavior: integer overflow, null deref, bad shifts',
    langs: C_CPP,
  },
  {
    flag: '-fsanitize=thread', label: 'ThreadSanitizer', group: 'sanitize',
    description: 'Detects data races — critical for OS / multithreading assignments',
    langs: C_CPP,
  },
  {
    flag: '-fsanitize=leak', label: 'LeakSanitizer', group: 'sanitize',
    description: 'Reports memory leaks — great for DSA linked list / tree assignments',
    langs: C_CPP,
  },

  // ── Libraries ─────────────────────────────────────────────────────────────
  {
    flag: '-lm', label: '-lm', group: 'libraries',
    description: 'Link libm — required for math.h functions (sqrt, pow, sin…)',
    langs: ['c'],
  },
  {
    flag: '-lpthread', label: '-lpthread', group: 'libraries',
    description: 'Link POSIX threads — OS class, concurrent programming',
    langs: C_CPP,
  },
];

// Returns only the presets relevant to a given language
export function presetsForLang(lang: SupportedLanguage): FlagPreset[] {
  return FLAG_PRESETS.filter(p => p.langs.includes(lang));
}

// Languages that actually support compiler flags
export const FLAGGABLE_LANGS: SupportedLanguage[] = ['c', 'cpp'];

export const GROUP_LABELS: Record<string, string> = {
  warnings:  'Warnings',
  standard:  'Standard',
  optimize:  'Optimize',
  sanitize:  'Sanitizers',
  libraries: 'Libraries',
};

export const GROUP_ORDER = ['warnings', 'standard', 'optimize', 'sanitize', 'libraries'];
