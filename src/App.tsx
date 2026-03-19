import { useState, useEffect, useRef } from 'react';
import { Code2, Columns2, Square, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';


import { LanguageConfig, SupportedLanguage } from './types';
import { fetchCompilerList, parseCompiler } from './services/compilerService';
import IDEPane, { LANGUAGE_CONFIGS } from './IDEPane';

// Sort compilers: head/latest first, then descending semver
function sortCompilers<T extends { isHead: boolean; version: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.isHead && !b.isHead) return -1;
    if (!a.isHead && b.isHead) return 1;
    const va = a.version.split(' ')[0].split('.').map(Number);
    const vb = b.version.split(' ')[0].split('.').map(Number);
    for (let i = 0; i < Math.max(va.length, vb.length); i++) {
      const d = (vb[i] ?? 0) - (va[i] ?? 0);
      if (d !== 0) return d;
    }
    return 0;
  });
}

export default function App() {
  const [liveConfigs, setLiveConfigs]       = useState<LanguageConfig[]>(LANGUAGE_CONFIGS);
  const [compilersLoading, setLoading]      = useState(true);
  const [compilersError, setError]          = useState<string | null>(null);
  const [isSplit, setIsSplit]               = useState(false);
  const [splitPct, setSplitPct]             = useState(50);
  const isDragging = useRef(false);

  // Fetch live compiler list once
  useEffect(() => {
    fetchCompilerList()
      .then(rawList => {
        setLiveConfigs(prev => prev.map(cfg => {
          const matches = rawList
            .filter(r => r.language === cfg.wandboxLanguage)
            .map(parseCompiler);
          if (!matches.length) return cfg;
          return { ...cfg, compilers: sortCompilers(matches) };
        }));
        setError(null);
      })
      .catch(() => setError('Using cached compiler list — Wandbox unreachable.'))
      .finally(() => setLoading(false));
  }, []);

  // Horizontal drag to resize split panes
  const onSplitDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    const startX = e.clientX;
    const startPct = splitPct;
    const totalW = window.innerWidth;
    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = ev.clientX - startX;
      setSplitPct(Math.max(25, Math.min(75, startPct + (dx / totalW) * 100)));
    };
    const onUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div
      className="flex flex-col h-screen w-full bg-[#0d1117] overflow-hidden"
      style={{ fontFamily: '"Geist", sans-serif' }}
    >
      {/* ── Global topbar ── */}
      <header className="h-11 border-b border-[#21262d] bg-[#0a0e13] flex items-center justify-between px-4 shrink-0 z-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-900/30">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white text-sm tracking-tight">PolyCode</span>
          <span className="text-[10px] text-[#484f58] border border-[#21262d] px-1.5 py-0.5 rounded">
            Multi-Language IDE
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#161b22] border border-[#30363d] rounded-lg p-1">
            <button
              onClick={() => setIsSplit(false)}
              title="Single pane"
              className={`p-1.5 rounded-md transition-all ${!isSplit ? 'bg-indigo-600 text-white shadow' : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'}`}
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsSplit(true)}
              title="Split pane — run two programs side by side"
              className={`p-1.5 rounded-md transition-all ${isSplit ? 'bg-indigo-600 text-white shadow' : 'text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'}`}
            >
              <Columns2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-[#484f58]">
            <Zap className="w-3 h-3 text-emerald-500" />
            Wandbox · free · no key needed
          </div>
        </div>
      </header>

      {/* ── Pane area ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <AnimatePresence initial={false} mode="sync">

          {/* Pane 1 */}
          <motion.div
            key="pane1"
            style={{ width: isSplit ? `${splitPct}%` : '100%' }}
            animate={{ width: isSplit ? `${splitPct}%` : '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="h-full overflow-hidden"
          >
            <IDEPane
              paneId="p1"
              liveConfigs={liveConfigs}
              compilersLoading={compilersLoading}
              compilersError={compilersError}
              defaultLang="c"
            />
          </motion.div>

          {/* Drag divider */}
          {isSplit && (
            <motion.div
              key="divider"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0 }}
              onMouseDown={onSplitDrag}
              className="w-1 shrink-0 bg-[#21262d] hover:bg-indigo-500/60 cursor-col-resize transition-colors flex items-center justify-center group z-10 relative"
              title="Drag to resize panes"
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
              <div className="w-0.5 h-12 rounded-full bg-[#30363d] group-hover:bg-indigo-400 transition-colors" />
            </motion.div>
          )}

          {/* Pane 2 */}
          {isSplit && (
            <motion.div
              key="pane2"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              style={{ width: `${100 - splitPct}%` }}
              className="h-full overflow-hidden border-l border-[#21262d]"
            >
              <IDEPane
                paneId="p2"
                liveConfigs={liveConfigs}
                compilersLoading={compilersLoading}
                compilersError={compilersError}
                defaultLang="python"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #21262d; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #30363d; }
        .token.comment  { color: #8b949e; }
        .token.string   { color: #a5d6ff; }
        .token.keyword  { color: #ff7b72; }
        .token.function { color: #d2a8ff; }
        .token.number   { color: #79c0ff; }
        .token.operator { color: #c9d1d9; }
        .token.class-name { color: #ffa657; }
        .token.punctuation { color: #8b949e; }
        .token.builtin  { color: #ffa657; }
        .token.boolean  { color: #79c0ff; }
        textarea, .npm__react-simple-code-editor__textarea { caret-color: #58a6ff; }
      `}</style>
    </div>
  );
}
