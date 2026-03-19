# Runix — Multi-Language IDE

> Write, compile, and run code in 12 programming languages — directly in your browser. No install, no account, no API key required.

🔗 **Live demo:** [runix.vercel.app](https://runix.vercel.app)

---

## What it does

Runix is a browser-based code editor and execution environment built for CS students and developers who need a fast, zero-setup sandbox for algorithms, data structures, and systems programming exercises.

You write code, click Run, and see output — that's it.

---

## Languages supported

| Language | Compilers / Runtimes |
|---|---|
| C | GCC 10–13, Clang 16–17 |
| C++ | GCC 10–13, Clang 16–17 |
| Python | CPython 2.7, 3.10–3.12, PyPy 3.10 |
| Java | OpenJDK 11, 17, 21 |
| JavaScript | Node.js 16, 18, 20 |
| TypeScript | TypeScript 5.0–5.3 |
| Rust | Rust 1.65–1.74 |
| Go | Go 1.19–1.21 |
| Ruby | Ruby 2.7–3.3 |
| Swift | Swift 5.8–5.9 |
| PHP | PHP 8.1–8.3 |
| Lua | Lua 5.3–5.4 |

Compiler list is fetched live from Wandbox on startup so versions stay current.

---

## Features

- **Multi-file support** — create multiple files per project, cross-reference between them (`#include "utils.h"` etc.)
- **File import** — upload files directly from your computer via the Files tab
- **Compiler flags** — toggle `-Wall`, `-O2`, `-fsanitize=address`, `-std=c17` and more with one click (C/C++ only), or type raw flags manually
- **Split terminal** — run two completely independent programs side by side, each with its own language and output
- **3-tab output** — stdout, errors, and warnings displayed separately with badge counts
- **stdin support** — type program input in the Input tab; works with `scanf`, `input()`, `Scanner`, etc.
- **Resizable panels** — drag the sidebar edge, the editor/terminal divider, and the split pane divider
- **Tabbed sidebar** — Files / Config / Input each get their own full-height panel so nothing feels cramped
- **Mobile-friendly** — sidebar becomes a bottom sheet on phones; editor stays full width
- **Live compiler versions** — fetched from Wandbox at startup; head/latest compilers always available

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Animations | Motion (Framer Motion) |
| Syntax highlighting | PrismJS (loaded from CDN) |
| Code execution | [Wandbox API](https://wandbox.org) — free, no key needed |
| Deployment | Vercel |

---

## Running locally

```bash
git clone https://github.com/de4su/Runix.git
cd Runix
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No `.env` file needed — Wandbox requires no API key.

---

## Deploying to Vercel

1. Push to GitHub
2. Import the repo at [vercel.com](https://vercel.com)
3. Framework: **Vite** · Build: `npm run build` · Output: `dist`
4. No environment variables needed
5. Click Deploy

Every `git push` to `main` triggers an automatic redeploy.

---

## Known limitations

Runix uses Wandbox as its execution backend, which means:

- **No local filesystem** — can't link against `.a`/`.so` libraries or read local files
- **No debugger** — no `gdb`, `valgrind`, or sanitizer stack traces with line numbers
- **No build systems** — no `make`, `cmake`, or `meson`
- **Size limit** — combined file payload must be under ~48 KB
- **`#include "file.c"` pattern** — Wandbox can't resolve `.c` includes the same way GCC does; paste the included file's contents into the main file instead, or use a `.h` header
- **Network latency** — every compile adds ~1–3s for the round trip

Think of it as a scratchpad, not a workstation.

---

## License

MIT
