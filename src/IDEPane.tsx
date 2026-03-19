import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play, Plus, Trash2, FileCode, Terminal, Cpu,
  Loader2, X, AlertTriangle, Check, Copy, Clock,
  ChevronRight, Upload, Settings, FolderOpen, Menu,
  CornerDownLeft, Square, Zap,
} from 'lucide-react';
import Editor from 'react-simple-code-editor';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'motion/react';

import {
  CodeFile, SupportedLanguage, LanguageConfig,
  WandboxCompiler, CompilerResult, CompilerFlags,
} from './types';
import { compileAndRun } from './services/compilerService';
import { FLAG_PRESETS, FLAGGABLE_LANGS, GROUP_LABELS, GROUP_ORDER, presetsForLang } from './flags';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

function highlightCode(code: string, lang: string): string {
  const P = (window as any).Prism;
  if (!P) return code;
  const grammar = P.languages[lang] ?? P.languages.clike;
  if (!grammar) return code;
  return P.highlight(code, grammar, lang);
}

// ─── Compiler lists ───────────────────────────────────────────────────────────
const mkC = (name: string, displayName: string, language: string, version: string, isHead = false): WandboxCompiler =>
  ({ name, displayName, language, version, isHead });

const C_COMPILERS = [
  mkC('gcc-head','GCC (latest)','C','latest',true),
  mkC('gcc-13.2.0','GCC 13.2.0','C','13.2.0'),
  mkC('gcc-12.2.0','GCC 12.2.0','C','12.2.0'),
  mkC('gcc-11.1.0','GCC 11.1.0','C','11.1.0'),
  mkC('gcc-10.2.0','GCC 10.2.0','C','10.2.0'),
  mkC('clang-head','Clang (latest)','C','latest',true),
  mkC('clang-17.0.1','Clang 17.0.1','C','17.0.1'),
  mkC('clang-16.0.0','Clang 16.0.0','C','16.0.0'),
];
const CPP_COMPILERS = [
  mkC('gcc-head','GCC (latest)','C++','latest',true),
  mkC('gcc-13.2.0','GCC 13.2.0','C++','13.2.0'),
  mkC('gcc-12.2.0','GCC 12.2.0','C++','12.2.0'),
  mkC('gcc-11.1.0','GCC 11.1.0','C++','11.1.0'),
  mkC('clang-head','Clang (latest)','C++','latest',true),
  mkC('clang-17.0.1','Clang 17.0.1','C++','17.0.1'),
];
const PY_COMPILERS = [
  mkC('cpython-3.12.0','CPython 3.12.0','Python','3.12.0'),
  mkC('cpython-3.11.0','CPython 3.11.0','Python','3.11.0'),
  mkC('cpython-3.10.0','CPython 3.10.0','Python','3.10.0'),
  mkC('cpython-2.7.18','CPython 2.7.18','Python','2.7.18'),
  mkC('pypy-3.10-v7.3.13','PyPy 3.10 v7.3.13','Python','3.10'),
];
const JS_COMPILERS = [
  mkC('nodejs-head','Node.js (latest)','JavaScript','latest',true),
  mkC('nodejs-20.11.0','Node.js 20.11.0','JavaScript','20.11.0'),
  mkC('nodejs-18.18.2','Node.js 18.18.2','JavaScript','18.18.2'),
  mkC('nodejs-16.20.2','Node.js 16.20.2','JavaScript','16.20.2'),
];
const TS_COMPILERS = [
  mkC('typescript-5.3.3','TypeScript 5.3.3','TypeScript','5.3.3'),
  mkC('typescript-5.2.2','TypeScript 5.2.2','TypeScript','5.2.2'),
  mkC('typescript-5.0.4','TypeScript 5.0.4','TypeScript','5.0.4'),
];
const JAVA_COMPILERS = [
  mkC('openjdk-head','OpenJDK (latest)','Java','latest',true),
  mkC('openjdk-21.0.1','OpenJDK 21.0.1','Java','21.0.1'),
  mkC('openjdk-17.0.8.1','OpenJDK 17.0.8','Java','17.0.8.1'),
  mkC('openjdk-11.0.10','OpenJDK 11.0.10','Java','11.0.10'),
];
const RUST_COMPILERS = [
  mkC('rust-head','Rust (latest)','Rust','latest',true),
  mkC('rust-1.74.0','Rust 1.74.0','Rust','1.74.0'),
  mkC('rust-1.70.0','Rust 1.70.0','Rust','1.70.0'),
  mkC('rust-1.65.0','Rust 1.65.0','Rust','1.65.0'),
];
const GO_COMPILERS = [
  mkC('go-head','Go (latest)','Go','latest',true),
  mkC('go-1.21.5','Go 1.21.5','Go','1.21.5'),
  mkC('go-1.20.12','Go 1.20.12','Go','1.20.12'),
  mkC('go-1.19.13','Go 1.19.13','Go','1.19.13'),
];
const RUBY_COMPILERS = [
  mkC('ruby-head','Ruby (latest)','Ruby','latest',true),
  mkC('ruby-3.3.0','Ruby 3.3.0','Ruby','3.3.0'),
  mkC('ruby-3.2.0','Ruby 3.2.0','Ruby','3.2.0'),
  mkC('ruby-2.7.8','Ruby 2.7.8','Ruby','2.7.8'),
];
const SWIFT_COMPILERS = [
  mkC('swift-head','Swift (latest)','Swift','latest',true),
  mkC('swift-5.9.2','Swift 5.9.2','Swift','5.9.2'),
  mkC('swift-5.8','Swift 5.8','Swift','5.8'),
];
const PHP_COMPILERS = [
  mkC('php-head','PHP (latest)','PHP','latest',true),
  mkC('php-8.3.1','PHP 8.3.1','PHP','8.3.1'),
  mkC('php-8.2.14','PHP 8.2.14','PHP','8.2.14'),
  mkC('php-8.1.27','PHP 8.1.27','PHP','8.1.27'),
];
const LUA_COMPILERS = [
  mkC('lua-5.4.6','Lua 5.4.6','Lua','5.4.6'),
  mkC('lua-5.3.6','Lua 5.3.6','Lua','5.3.6'),
];

// ─── Default files ────────────────────────────────────────────────────────────
const f = (id: string, name: string, content: string): CodeFile => ({ id, name, content });

const DEFAULT_FILES: Record<SupportedLanguage, CodeFile[]> = {
  c: [
    f('c-main','main.c',`#include <stdio.h>\n#include <stdlib.h>\n#include "utils.h"\n\nint main() {\n    greet("PolyCode");\n    int values[] = {3, 1, 4, 1, 5, 9, 2, 6};\n    int n = sizeof(values) / sizeof(values[0]);\n    printf("Sum: %d\\n", sum(values, n));\n    printf("Max: %d\\n", max(values, n));\n    return 0;\n}`),
    f('c-utils','utils.h',`#ifndef UTILS_H\n#define UTILS_H\n#include <stdio.h>\nvoid greet(const char* name) { printf("Hello from %s!\\n", name); }\nint sum(int* arr, int n) { int t=0; for(int i=0;i<n;i++) t+=arr[i]; return t; }\nint max(int* arr, int n) { int m=arr[0]; for(int i=1;i<n;i++) if(arr[i]>m) m=arr[i]; return m; }\n#endif`),
  ],
  cpp: [
    f('cpp-main','main.cpp',`#include <iostream>\n#include "Vec2.h"\nint main() {\n    Vec2 a(3.0,4.0), b(1.0,2.0);\n    std::cout<<"a="<<a<<"\\nb="<<b<<"\\na+b="<<(a+b)<<"\\n|a|="<<a.magnitude()<<"\\n";\n}`),
    f('cpp-vec','Vec2.h',`#pragma once\n#include <cmath>\n#include <ostream>\nstruct Vec2 {\n    double x,y;\n    Vec2(double x=0,double y=0):x(x),y(y){}\n    Vec2 operator+(const Vec2& o)const{return{x+o.x,y+o.y};}\n    double magnitude()const{return std::sqrt(x*x+y*y);}\n    friend std::ostream& operator<<(std::ostream& os,const Vec2& v){return os<<"("<<v.x<<","<<v.y<<")";}\n};`),
  ],
  python:     [f('py-main','main.py',`name = input("Enter your name: ")\nprint(f"Hello, {name}!\\n")\nnumbers = list(range(1, 6))\nprint("Squares:", {n: n**2 for n in numbers})`)],
  java:       [f('java-main','Main.java',`import java.util.*;\npublic class Main {\n    record Person(String name, int age) { String greet(){return "Hi, I'm "+name+" ("+age+")";} }\n    public static void main(String[] args) {\n        List.of(new Person("Alice",30),new Person("Bob",25),new Person("Carol",35))\n            .stream().sorted(Comparator.comparingInt(Person::age))\n            .map(Person::greet).forEach(System.out::println);\n    }\n}`)],
  javascript: [f('js-main','main.js',`console.log("Hello from JavaScript!");\nconst nums=[1,2,3,4,5,6,7,8,9,10];\nconst result=nums.filter(n=>n%2!==0).map(n=>n**2).reduce((a,n)=>a+n,0);\nconsole.log(\`Sum of odd squares: \${result}\`);`)],
  typescript: [f('ts-main','main.ts',`interface Shape{name:string;area():number;}\nclass Circle implements Shape{constructor(public name:string,private r:number){}area(){return Math.PI*this.r**2;}}\nclass Rectangle implements Shape{constructor(public name:string,private w:number,private h:number){}area(){return this.w*this.h;}}\n[new Circle("r=5",5),new Rectangle("4x6",4,6)].forEach(s=>console.log(\`\${s.name}: \${s.area().toFixed(2)}\`));`)],
  rust:       [f('rust-main','main.rs',`#[derive(Debug)]\nenum Shape{Circle{radius:f64},Rectangle{width:f64,height:f64}}\nimpl Shape{\n    fn area(&self)->f64{\n        match self{\n            Shape::Circle{radius}=>std::f64::consts::PI*radius*radius,\n            Shape::Rectangle{width,height}=>width*height,\n        }\n    }\n}\nfn main(){\n    let shapes=vec![Shape::Circle{radius:5.0},Shape::Rectangle{width:4.0,height:6.0}];\n    for s in &shapes{println!("{:?}: area={:.2}",s,s.area());}\n    println!("Total: {:.2}",shapes.iter().map(|s|s.area()).sum::<f64>());\n}`)],
  go:         [f('go-main','main.go',`package main\nimport("fmt";"sort")\nfunc fibonacci(n int)[]int{\n    seq:=make([]int,n)\n    if n>1{seq[1]=1}\n    for i:=2;i<n;i++{seq[i]=seq[i-1]+seq[i-2]}\n    return seq\n}\nfunc main(){\n    fmt.Println("Fibonacci:",fibonacci(10))\n    words:=[]string{"banana","apple","cherry","date"}\n    sort.Strings(words)\n    fmt.Println("Sorted:",words)\n}`)],
  ruby:       [f('rb-main','main.rb',`puts "Hello from Ruby!"\nputs "Squares: #{(1..5).map{|n|n**2}.join(', ')}"\nclass Integer\n  def factorial\n    return 1 if self<=1\n    self*(self-1).factorial\n  end\nend\nputs "5! = #{5.factorial}, 10! = #{10.factorial}"`)],
  swift:      [f('swift-main','main.swift',`struct Person{let name:String;let age:Int;var greeting:String{"Hi, I'm \\(name) (\\(age))"}}\n[Person(name:"Alice",age:30),Person(name:"Bob",age:25),Person(name:"Carol",age:35)]\n    .sorted{$0.age<$1.age}.forEach{print($0.greeting)}`)],
  php:        [f('php-main','main.php',`<?php\nfunction greet(string $name):string{return "Hello from {$name}!";}\necho greet("PHP")."\\n";\n$nums=range(1,10);\necho "Sum of odd squares: ".array_sum(array_map(fn($n)=>$n**2,array_filter($nums,fn($n)=>$n%2!==0)))."\\n";`)],
  lua:        [f('lua-main','main.lua',`print("Hello from Lua!")\nlocal function map(t,fn) local r={} for i,v in ipairs(t) do r[i]=fn(v) end return r end\nlocal sq=map({1,2,3,4,5},function(n)return n*n end)\nprint("Squares: "..table.concat(sq,", "))`)],
};

export const LANGUAGE_CONFIGS: LanguageConfig[] = [
  {id:'c',         name:'C',         wandboxLanguage:'C',         defaultCompiler:'gcc-head',        extension:'.c',    prismLanguage:'c',         compilers:C_COMPILERS,    defaultFiles:DEFAULT_FILES.c},
  {id:'cpp',       name:'C++',       wandboxLanguage:'C++',       defaultCompiler:'gcc-head',        extension:'.cpp',  prismLanguage:'cpp',       compilers:CPP_COMPILERS,  defaultFiles:DEFAULT_FILES.cpp},
  {id:'python',    name:'Python',    wandboxLanguage:'Python',    defaultCompiler:'cpython-3.12.0',  extension:'.py',   prismLanguage:'python',    compilers:PY_COMPILERS,   defaultFiles:DEFAULT_FILES.python, defaultStdin:'Alice'},
  {id:'java',      name:'Java',      wandboxLanguage:'Java',      defaultCompiler:'openjdk-21.0.1',  extension:'.java', prismLanguage:'java',      compilers:JAVA_COMPILERS, defaultFiles:DEFAULT_FILES.java},
  {id:'javascript',name:'JavaScript',wandboxLanguage:'JavaScript',defaultCompiler:'nodejs-head',     extension:'.js',   prismLanguage:'javascript',compilers:JS_COMPILERS,   defaultFiles:DEFAULT_FILES.javascript},
  {id:'typescript',name:'TypeScript',wandboxLanguage:'TypeScript',defaultCompiler:'typescript-5.3.3',extension:'.ts',   prismLanguage:'typescript',compilers:TS_COMPILERS,   defaultFiles:DEFAULT_FILES.typescript},
  {id:'rust',      name:'Rust',      wandboxLanguage:'Rust',      defaultCompiler:'rust-head',       extension:'.rs',   prismLanguage:'rust',      compilers:RUST_COMPILERS, defaultFiles:DEFAULT_FILES.rust},
  {id:'go',        name:'Go',        wandboxLanguage:'Go',        defaultCompiler:'go-head',         extension:'.go',   prismLanguage:'go',        compilers:GO_COMPILERS,   defaultFiles:DEFAULT_FILES.go},
  {id:'ruby',      name:'Ruby',      wandboxLanguage:'Ruby',      defaultCompiler:'ruby-head',       extension:'.rb',   prismLanguage:'ruby',      compilers:RUBY_COMPILERS, defaultFiles:DEFAULT_FILES.ruby},
  {id:'swift',     name:'Swift',     wandboxLanguage:'Swift',     defaultCompiler:'swift-head',      extension:'.swift',prismLanguage:'clike',     compilers:SWIFT_COMPILERS,defaultFiles:DEFAULT_FILES.swift},
  {id:'php',       name:'PHP',       wandboxLanguage:'PHP',       defaultCompiler:'php-head',        extension:'.php',  prismLanguage:'php',       compilers:PHP_COMPILERS,  defaultFiles:DEFAULT_FILES.php},
  {id:'lua',       name:'Lua',       wandboxLanguage:'Lua',       defaultCompiler:'lua-5.4.6',       extension:'.lua',  prismLanguage:'lua',       compilers:LUA_COMPILERS,  defaultFiles:DEFAULT_FILES.lua},
];

// ─── Flag pill ────────────────────────────────────────────────────────────────
function FlagPill({flag,active,onToggle}:{flag:string;active:boolean;onToggle:()=>void}) {
  const preset = FLAG_PRESETS.find(p=>p.flag===flag);
  return (
    <button onClick={onToggle} title={preset?.description??flag}
      className={cn('px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold border transition-all',
        active?'bg-indigo-600/20 border-indigo-500/60 text-indigo-300':'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:border-[#484f58] hover:text-[#c9d1d9]')}>
      {preset?.label??flag}
    </button>
  );
}

// ─── Sidebar tab types ────────────────────────────────────────────────────────
type SidebarTab = 'files' | 'config' | 'input';

const SIDEBAR_TABS: {id: SidebarTab; icon: React.ReactNode; label: string}[] = [
  {id:'files',  icon:<FolderOpen className="w-4 h-4"/>,  label:'Files'},
  {id:'config', icon:<Settings className="w-4 h-4"/>,    label:'Config'},
  {id:'input',  icon:<Terminal className="w-4 h-4"/>,    label:'Input'},
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface IDEPaneProps {
  paneId: string;
  liveConfigs: LanguageConfig[];
  compilersLoading: boolean;
  compilersError: string | null;
  defaultLang?: SupportedLanguage;
}

type OutputTab = 'output'|'errors'|'warnings';
const SIDEBAR_MIN=180, SIDEBAR_MAX=460, SIDEBAR_DEFAULT=260;

// ─── IDEPane ──────────────────────────────────────────────────────────────────
export default function IDEPane({paneId,liveConfigs,compilersLoading,compilersError,defaultLang='c'}:IDEPaneProps) {
  const initCfg = liveConfigs.find(l=>l.id===defaultLang)??liveConfigs[0];

  const [selectedLangId,  setSelectedLangId]  = useState<SupportedLanguage>(initCfg.id);
  const [selectedCompiler,setSelectedCompiler]= useState<string>(initCfg.defaultCompiler);
  const [files,           setFiles]           = useState<CodeFile[]>([...initCfg.defaultFiles]);
  const [activeFileId,    setActiveFileId]    = useState<string>(initCfg.defaultFiles[0].id);
  const [stdin,           setStdin]           = useState<string>(initCfg.defaultStdin??'');
  const [result,          setResult]          = useState<CompilerResult|null>(null);
  const [isRunning,       setIsRunning]       = useState(false);
  const [outputTab,       setOutputTab]       = useState<OutputTab>('output');
  const [sidebarTab,      setSidebarTab]      = useState<SidebarTab>('files');
  const [sidebarWidth,    setSidebarWidth]    = useState(SIDEBAR_DEFAULT);
  const [sidebarOpen,     setSidebarOpen]     = useState(true);
  const [bottomPct,       setBottomPct]       = useState(35);
  const [mobilePanel,     setMobilePanel]     = useState<SidebarTab|null>(null);
  const [addingFile,      setAddingFile]      = useState(false);
  const [newFileName,     setNewFileName]     = useState('');
  const [copied,          setCopied]          = useState(false);
  const [flags,           setFlags]           = useState<CompilerFlags>({active:new Set(['-Wall']),custom:''});

  const isDraggingSidebar = useRef(false);
  const isDraggingBottom  = useRef(false);
  const fileInputRef      = useRef<HTMLInputElement>(null);

  // ── Interactive terminal state ──────────────────────────────────────────────
  const [interactiveMode,  setInteractiveMode]  = useState(false);
  const [iInputs,          setIInputs]          = useState<string[]>([]);
  const [iLines,           setILines]           = useState<{type:'out'|'in'|'err';text:string}[]>([]);
  const [iPrevStdout,      setIPrevStdout]      = useState('');
  const [iCurrentInput,    setICurrentInput]    = useState('');
  const [iDone,            setIDone]            = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const currentLang = liveConfigs.find(l=>l.id===selectedLangId)??liveConfigs[0];
  const activeFile  = files.find(f=>f.id===activeFileId)??files[0];
  const showFlags   = FLAGGABLE_LANGS.includes(selectedLangId);
  const langPresets = presetsForLang(selectedLangId);

  const buildFlagString = ()=>{
    const parts=Array.from(flags.active);
    if(flags.custom.trim()) parts.push(flags.custom.trim());
    return parts.join(' ');
  };

  const toggleFlag=(flag:string)=>{
    const preset=FLAG_PRESETS.find(p=>p.flag===flag);
    setFlags(prev=>{
      const next=new Set(prev.active);
      if(next.has(flag)){next.delete(flag);}
      else{
        if(preset?.exclusive) langPresets.filter(p=>p.exclusive===preset.exclusive&&p.flag!==flag).forEach(p=>next.delete(p.flag));
        next.add(flag);
      }
      return{...prev,active:next};
    });
  };

  useEffect(()=>{
    if(!currentLang.compilers.some(c=>c.name===selectedCompiler))
      setSelectedCompiler(currentLang.compilers[0].name);
  },[currentLang,selectedCompiler]);

  const handleLangChange=(langId:SupportedLanguage)=>{
    if(!confirm('Switching languages will reset your files. Continue?')) return;
    const cfg=liveConfigs.find(l=>l.id===langId)!;
    setSelectedLangId(langId);
    setSelectedCompiler(cfg.compilers[0].name);
    setFiles([...cfg.defaultFiles]);
    setActiveFileId(cfg.defaultFiles[0].id);
    setStdin(cfg.defaultStdin??'');
    setResult(null);
    setFlags({active:new Set(FLAGGABLE_LANGS.includes(langId)?['-Wall']:[]),custom:''});
  };

  const handleRun=useCallback(async()=>{
    if(isRunning) return;
    setIsRunning(true); setResult(null); setOutputTab('output');
    try{
      // Always put the active file first — it becomes the entry point Wandbox compiles
      const activeFirst = [
        ...files.filter(f => f.id === activeFileId),
        ...files.filter(f => f.id !== activeFileId),
      ];
      const res=await compileAndRun(selectedCompiler,activeFirst,stdin,buildFlagString());
      setResult(res);
      if(res.errors.length>0) setOutputTab('errors');
      else if(res.warnings.length>0&&!res.stdout) setOutputTab('warnings');
      else setOutputTab('output');
    }catch(err){
      setResult({stdout:'',stderr:err instanceof Error?err.message:'Execution failed.',compilerOutput:'',warnings:[],errors:[],exitCode:1});
      setOutputTab('errors');
    }finally{setIsRunning(false);}
  },[isRunning,selectedCompiler,files,stdin,flags]);

  // ── Interactive terminal functions ─────────────────────────────────────────
  const getActiveFirst = () => [
    ...files.filter(f=>f.id===activeFileId),
    ...files.filter(f=>f.id!==activeFileId),
  ];

  const startInteractive = useCallback(async () => {
    setInteractiveMode(true);
    setIInputs([]);
    setILines([]);
    setIPrevStdout('');
    setIDone(false);
    setICurrentInput('');
    setIsRunning(true);
    try {
      const res = await compileAndRun(selectedCompiler, getActiveFirst(), '', buildFlagString());
      if (res.errors.length > 0) {
        setILines([{type:'err', text: res.errors.join('\n')}]);
        setIDone(true);
      } else {
        if (res.stdout) setILines([{type:'out', text: res.stdout}]);
        setIPrevStdout(res.stdout);
        if (res.exitCode === 0 && !res.stdout) setIDone(true);
      }
    } catch(e) {
      setILines([{type:'err', text: String(e)}]);
      setIDone(true);
    } finally { setIsRunning(false); }
  }, [selectedCompiler, files, activeFileId, flags]);

  const sendInteractiveInput = useCallback(async () => {
    const val = iCurrentInput;
    if (!val.trim() && !iDone) return;
    setICurrentInput('');
    const newInputs = [...iInputs, val];
    setIInputs(newInputs);
    setILines(prev => [...prev, {type:'in', text: val}]);
    setIsRunning(true);
    try {
      const allStdin = newInputs.join('\n');
      const res = await compileAndRun(selectedCompiler, getActiveFirst(), allStdin, buildFlagString());
      const delta = res.stdout.slice(iPrevStdout.length);
      if (delta) {
        setILines(prev => [...prev, {type:'out', text: delta}]);
        setIPrevStdout(res.stdout);
      }
      if (res.stderr) setILines(prev => [...prev, {type:'err', text: res.stderr}]);
      // Program done when it exits cleanly or stdout stopped growing
      if (res.exitCode !== 0 || (!delta && res.exitCode === 0)) setIDone(true);
    } catch(e) {
      setILines(prev => [...prev, {type:'err', text: String(e)}]);
      setIDone(true);
    } finally { setIsRunning(false); }
  }, [iCurrentInput, iInputs, iPrevStdout, selectedCompiler, files, activeFileId, flags]);

  const stopInteractive = () => {
    setInteractiveMode(false);
    setILines([]);
    setIInputs([]);
    setIPrevStdout('');
    setIDone(false);
    setICurrentInput('');
  };

  // Auto-scroll terminal to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({behavior:'smooth'});
  }, [iLines, isRunning]);

  const handleFileImport=(e:React.ChangeEvent<HTMLInputElement>)=>{
    Array.from(e.target.files??[]).forEach(file=>{
      const reader=new FileReader();
      reader.onload=(ev)=>{
        const content=ev.target?.result as string;
        setFiles(prev=>{
          const exists=prev.find(f=>f.name===file.name);
          if(exists) return prev.map(f=>f.name===file.name?{...f,content}:f);
          const nf:CodeFile={id:`${paneId}-imp-${Math.random().toString(36).slice(2)}`,name:file.name,content};
          return[...prev,nf];
        });
      };
      reader.readAsText(file);
    });
    e.target.value='';
  };

  // Sidebar resize
  const onSidebarDrag=(e:React.MouseEvent)=>{
    e.preventDefault();
    isDraggingSidebar.current=true;
    const startX=e.clientX,startW=sidebarWidth;
    const onMove=(ev:MouseEvent)=>{if(isDraggingSidebar.current) setSidebarWidth(Math.max(SIDEBAR_MIN,Math.min(SIDEBAR_MAX,startW+ev.clientX-startX)));};
    const onUp=()=>{isDraggingSidebar.current=false;document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);};
    document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
  };

  // Bottom panel resize
  const onBottomDrag=(e:React.MouseEvent)=>{
    e.preventDefault();
    isDraggingBottom.current=true;
    const startY=e.clientY,startPct=bottomPct;
    const onMove=(ev:MouseEvent)=>{if(isDraggingBottom.current) setBottomPct(Math.max(15,Math.min(70,startPct+((startY-ev.clientY)/window.innerHeight)*100)));};
    const onUp=()=>{isDraggingBottom.current=false;document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp);};
    document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp);
  };

  const confirmAddFile=()=>{
    const name=newFileName.trim()||`file${currentLang.extension}`;
    if(files.some(f=>f.name===name)){alert('File already exists.');return;}
    const nf:CodeFile={id:`${paneId}-${Math.random().toString(36).slice(2)}`,name,content:`// ${name}\n`};
    setFiles(p=>[...p,nf]);setActiveFileId(nf.id);setAddingFile(false);setNewFileName('');
  };

  const deleteFile=(id:string)=>{
    if(files.length<=1) return;
    if(!confirm('Delete this file?')) return;
    const next=files.filter(f=>f.id!==id);
    setFiles(next);if(activeFileId===id) setActiveFileId(next[0].id);
  };

  const copyOutput=()=>{
    const text=[result?.compilerOutput,result?.stdout,result?.stderr].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1500);});
  };

  const warnCount=result?.warnings.length??0;
  const errCount =result?.errors.length??0;

  // ── Sidebar tab content ──────────────────────────────────────────────────────
  const renderSidebarContent=(overrideTab?: SidebarTab)=>{
    const activeTab = overrideTab ?? sidebarTab;
    switch(activeTab){
      // ── FILES TAB ──
      case 'files': return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#21262d]">
            <span className="text-xs font-semibold text-[#c9d1d9]">Project Files</span>
            <div className="flex items-center gap-1">
              <button onClick={()=>fileInputRef.current?.click()} title="Import from computer"
                className="p-1.5 hover:bg-[#21262d] rounded text-[#8b949e] hover:text-indigo-400 transition-colors">
                <Upload className="w-3.5 h-3.5"/>
              </button>
              <button onClick={()=>{setAddingFile(true);setNewFileName('');}} title="New file"
                className="p-1.5 hover:bg-[#21262d] rounded text-[#8b949e] hover:text-[#c9d1d9] transition-colors">
                <Plus className="w-3.5 h-3.5"/>
              </button>
            </div>
          </div>

          <AnimatePresence>
            {addingFile&&(
              <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="px-3 py-2 border-b border-[#21262d] overflow-hidden">
                <div className="flex items-center gap-1.5 bg-[#0d1117] border border-indigo-500/50 rounded-md px-2.5 py-1.5">
                  <input autoFocus value={newFileName} onChange={e=>setNewFileName(e.target.value)}
                    onKeyDown={e=>{if(e.key==='Enter')confirmAddFile();if(e.key==='Escape')setAddingFile(false);}}
                    placeholder={`file${currentLang.extension}`}
                    className="flex-1 bg-transparent text-xs text-[#c9d1d9] placeholder-[#484f58] outline-none min-w-0"/>
                  <button onClick={confirmAddFile} className="text-green-400 hover:text-green-300"><Check className="w-3.5 h-3.5"/></button>
                  <button onClick={()=>setAddingFile(false)} className="text-red-400 hover:text-red-300"><X className="w-3.5 h-3.5"/></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {files.map(file=>(
              <div key={file.id} onClick={()=>setActiveFileId(file.id)}
                className={cn('group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all',
                  activeFileId===file.id?'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30':'text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9]')}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileCode className={cn('w-4 h-4 shrink-0',activeFileId===file.id?'text-indigo-400':'text-[#484f58]')}/>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{file.name}</div>
                    <div className="text-[10px] text-[#484f58]">{file.content.split('\n').length} lines</div>
                  </div>
                </div>
                {files.length>1&&(
                  <button onClick={e=>{e.stopPropagation();deleteFile(file.id);}}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-900/40 text-red-400 transition-all shrink-0">
                    <Trash2 className="w-3.5 h-3.5"/>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-[#21262d] text-[10px] text-[#484f58]">
            {files.length} file{files.length!==1?'s':''} · drag right edge to resize
          </div>
        </div>
      );

      // ── CONFIG TAB ──
      case 'config': return (
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Language */}
          <div className="px-4 py-3 border-b border-[#21262d]">
            <label className="block text-xs font-semibold text-[#c9d1d9] mb-2">Language</label>
            <select value={selectedLangId} onChange={e=>handleLangChange(e.target.value as SupportedLanguage)}
              className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#c9d1d9] focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
              {liveConfigs.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {/* Compiler */}
          <div className="px-4 py-3 border-b border-[#21262d]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-[#c9d1d9]">Compiler / Runtime</label>
              {compilersLoading&&<Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400"/>}
            </div>
            <select value={selectedCompiler} onChange={e=>setSelectedCompiler(e.target.value)}
              className="w-full bg-[#161b22] border border-[#30363d] rounded-lg px-3 py-2 text-sm text-[#c9d1d9] focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer">
              {currentLang.compilers.map(c=><option key={c.name} value={c.name}>{c.displayName}</option>)}
            </select>
            {compilersError&&(
              <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-400/80 bg-amber-900/10 border border-amber-900/30 rounded-lg px-2.5 py-2">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0"/><span>{compilersError}</span>
              </div>
            )}
          </div>

          {/* Flags — only for C/C++ */}
          {showFlags?(
            <div className="px-4 py-3 flex-1">
              <label className="block text-xs font-semibold text-[#c9d1d9] mb-3">Compiler Flags</label>

              {/* Active flags preview */}
              {flags.active.size>0&&(
                <div className="font-mono text-[11px] text-emerald-400 bg-[#0d1117] rounded-lg px-3 py-2 mb-3 break-all border border-[#21262d]">
                  {Array.from(flags.active).join(' ')}{flags.custom?' '+flags.custom:''}
                </div>
              )}

              {GROUP_ORDER.map(groupId=>{
                const gp=langPresets.filter(p=>p.group===groupId);
                if(!gp.length) return null;
                return(
                  <div key={groupId} className="mb-4">
                    <div className="text-[10px] font-bold text-[#484f58] uppercase tracking-widest mb-2">{GROUP_LABELS[groupId]}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {gp.map(p=>(
                        <div key={p.flag} className="relative group/tip">
                          <FlagPill flag={p.flag} active={flags.active.has(p.flag)} onToggle={()=>toggleFlag(p.flag)}/>
                          <div className="absolute left-0 bottom-full mb-2 z-50 hidden group-hover/tip:block w-52 bg-[#1c2128] border border-[#30363d] rounded-lg px-3 py-2.5 text-[11px] text-[#c9d1d9] shadow-2xl leading-relaxed pointer-events-none">
                            <span className="font-mono text-indigo-300 block mb-1">{p.flag}</span>
                            {p.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="mt-2">
                <div className="text-[10px] font-bold text-[#484f58] uppercase tracking-widest mb-2">Custom flags</div>
                <input value={flags.custom} onChange={e=>setFlags(p=>({...p,custom:e.target.value}))}
                  placeholder="-Wformat -DDEBUG=1 …"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-3 py-2 text-sm font-mono text-[#c9d1d9] placeholder-[#484f58] outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>
            </div>
          ):(
            <div className="px-4 py-6 flex flex-col items-center justify-center text-center text-[#484f58] space-y-2">
              <Settings className="w-8 h-8 opacity-20"/>
              <p className="text-xs">Compiler flags are available for C and C++ only.</p>
            </div>
          )}
        </div>
      );

      // ── INPUT TAB ──
      case 'input': return (
        <div className="flex flex-col h-full">
          <div className="px-4 py-3 border-b border-[#21262d]">
            <div className="text-xs font-semibold text-[#c9d1d9] mb-1">Standard Input (stdin)</div>
            <div className="text-[11px] text-[#484f58]">
              This text is passed to your program as stdin. Use <span className="font-mono text-indigo-400">scanf</span>, <span className="font-mono text-indigo-400">input()</span>, or <span className="font-mono text-indigo-400">Scanner</span> to read it.
            </div>
          </div>
          <textarea
            value={stdin}
            onChange={e=>setStdin(e.target.value)}
            placeholder={"Type your program's input here…\n\nExamples:\n  5          → a single number\n  Alice      → a name\n  1 2 3 4 5  → space-separated values\n  hello      → a string"}
            spellCheck={false}
            className="flex-1 w-full bg-transparent px-4 py-3 text-sm text-[#c9d1d9] placeholder-[#484f58] outline-none resize-none"
            style={{fontFamily:'"JetBrains Mono", monospace',lineHeight:1.7}}
          />
          <div className="px-4 py-2.5 border-t border-[#21262d] flex items-center justify-between">
            <span className="text-[11px] text-[#484f58]">{stdin.split('\n').filter(Boolean).length} line{stdin.split('\n').filter(Boolean).length!==1?'s':''}</span>
            {stdin&&(
              <button onClick={()=>setStdin('')} className="text-[11px] text-red-400/70 hover:text-red-400 transition-colors">Clear</button>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="flex h-full min-w-0 overflow-hidden bg-[#0d1117]" style={{fontFamily:'"Geist", sans-serif'}}>

      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileImport}/>

      {/* ── Desktop sidebar ── */}
      <AnimatePresence initial={false}>
        {sidebarOpen&&(
          <motion.aside key="sb"
            initial={{width:0,opacity:0}} animate={{width:sidebarWidth,opacity:1}} exit={{width:0,opacity:0}}
            transition={{type:'spring',stiffness:320,damping:32}}
            style={{width:sidebarWidth}}
            className="hidden md:flex shrink-0 border-r border-[#21262d] bg-[#0a0e13] flex-col overflow-hidden relative">

            {/* Tab bar */}
            <div className="flex border-b border-[#21262d] shrink-0">
              {SIDEBAR_TABS.map(tab=>(
                <button key={tab.id} onClick={()=>setSidebarTab(tab.id)}
                  className={cn('flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-wider transition-all border-b-2',
                    sidebarTab===tab.id
                      ?'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                      :'border-transparent text-[#484f58] hover:text-[#8b949e] hover:bg-[#161b22]')}>
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div key={sidebarTab} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:8}}
                  transition={{duration:0.12}} className="h-full">
                  {renderSidebarContent()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Resize handle */}
            <div onMouseDown={onSidebarDrag}
              className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/60 transition-colors z-20 group">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-16 rounded-full bg-[#30363d] group-hover:bg-indigo-400 transition-colors"/>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Topbar */}
        <header className="h-10 border-b border-[#21262d] bg-[#0a0e13] flex items-center justify-between px-2.5 shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Desktop sidebar toggle */}
            <button onClick={()=>setSidebarOpen(o=>!o)}
              className="hidden md:flex p-1 hover:bg-[#161b22] rounded text-[#8b949e] hover:text-[#c9d1d9] transition-colors shrink-0">
              <ChevronRight className={cn('w-3.5 h-3.5 transition-transform',sidebarOpen&&'rotate-180')}/>
            </button>
            {/* Mobile menu button */}
            <button onClick={()=>setMobilePanel(p=>p?null:'files')}
              className="flex md:hidden p-1 hover:bg-[#161b22] rounded text-[#8b949e] hover:text-[#c9d1d9] transition-colors shrink-0">
              <Menu className="w-4 h-4"/>
            </button>
            <span className="text-xs text-[#c9d1d9] font-medium truncate" style={{fontFamily:'"JetBrains Mono", monospace'}}>
              {activeFile.name}
            </span>
            <span className="text-[10px] text-[#8b949e] bg-[#161b22] px-1.5 py-0.5 rounded border border-[#30363d] shrink-0">
              {currentLang.name}
            </span>
          </div>
          <button onClick={handleRun} disabled={isRunning}
            className={cn('flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all select-none shrink-0',
              isRunning?'bg-indigo-600/40 text-indigo-300 cursor-not-allowed':'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30')}>
            {isRunning?<><Loader2 className="w-3 h-3 animate-spin"/>Running…</>:<><Play className="w-3 h-3 fill-current"/>Run</>}
          </button>
        </header>

        {/* ── Mobile bottom sheet ── */}
        <AnimatePresence>
          {mobilePanel&&(
            <>
              {/* Backdrop */}
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
                onClick={()=>setMobilePanel(null)}
                className="md:hidden fixed inset-0 bg-black/60 z-30"/>
              {/* Sheet */}
              <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
                transition={{type:'spring',stiffness:340,damping:36}}
                className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0e13] border-t border-[#30363d] rounded-t-2xl flex flex-col"
                style={{height:'70vh'}}>
                {/* Sheet handle */}
                <div className="flex justify-center pt-3 pb-1 shrink-0">
                  <div className="w-10 h-1 rounded-full bg-[#30363d]"/>
                </div>
                {/* Mobile tabs */}
                <div className="flex border-b border-[#21262d] shrink-0 px-2 gap-1">
                  {SIDEBAR_TABS.map(tab=>(
                    <button key={tab.id} onClick={()=>setMobilePanel(tab.id)}
                      className={cn('flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2',
                        mobilePanel===tab.id
                          ?'border-indigo-500 text-indigo-400'
                          :'border-transparent text-[#484f58] hover:text-[#8b949e]')}>
                      {tab.icon}{tab.label}
                    </button>
                  ))}
                  <button onClick={()=>setMobilePanel(null)} className="ml-auto p-2 text-[#8b949e]">
                    <X className="w-4 h-4"/>
                  </button>
                </div>
                {/* Mobile content */}
                <div className="flex-1 overflow-hidden">
                  {/* Render using the same mobilePanel as sidebarTab */}
                  <AnimatePresence mode="wait">
                    <motion.div key={mobilePanel} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.1}} className="h-full">
                      {renderSidebarContent(mobilePanel!)}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Editor */}
        <div className="overflow-auto bg-[#0d1117] custom-scrollbar" style={{height:`${100-bottomPct}%`}}>
          <Editor
            value={activeFile.content}
            onValueChange={c=>setFiles(p=>p.map(f=>f.id===activeFileId?{...f,content:c}:f))}
            highlight={code=>highlightCode(code,currentLang.prismLanguage)}
            padding={16}
            className="min-h-full outline-none"
            style={{fontFamily:'"JetBrains Mono", monospace',fontSize:13,lineHeight:1.7}}
          />
        </div>

        {/* Bottom drag handle */}
        <div onMouseDown={onBottomDrag}
          className="h-1 border-y border-[#21262d] hover:bg-indigo-600/30 cursor-row-resize transition-colors flex items-center justify-center group shrink-0 bg-[#0d1117]">
          <div className="w-8 h-0.5 rounded-full bg-[#30363d] group-hover:bg-indigo-400 transition-colors"/>
        </div>

        {/* ── Output panel ── */}
        <div className="flex flex-col shrink-0 bg-[#0a0e13] overflow-hidden" style={{height:`${bottomPct}%`}}>

          {/* Tab bar */}
          <div className="h-8 border-b border-[#21262d] flex items-center px-2 gap-1 shrink-0">
            {!interactiveMode && (['output','errors','warnings'] as OutputTab[]).map(tab=>(
              <button key={tab} onClick={()=>setOutputTab(tab)}
                className={cn('flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all',
                  outputTab===tab?'bg-[#161b22] text-[#c9d1d9] border border-[#30363d]':'text-[#8b949e] hover:text-[#c9d1d9]')}>
                {tab==='output'&&<Terminal className="w-3 h-3"/>}
                {tab==='errors'&&<X className="w-3 h-3"/>}
                {tab==='warnings'&&<AlertTriangle className="w-3 h-3"/>}
                {tab}
                {tab==='errors'&&errCount>0&&<span className="bg-red-600 text-white text-[9px] font-bold px-1 rounded-full">{errCount}</span>}
                {tab==='warnings'&&warnCount>0&&<span className="bg-amber-600 text-white text-[9px] font-bold px-1 rounded-full">{warnCount}</span>}
              </button>
            ))}
            {interactiveMode && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                  <Zap className="w-3 h-3"/>
                  Interactive
                </div>
                {isRunning && <Loader2 className="w-3 h-3 animate-spin text-indigo-400"/>}
                {iDone && <span className="text-[10px] text-[#484f58]">program exited</span>}
              </div>
            )}
            <div className="ml-auto flex items-center gap-2">
              {/* Interactive mode toggle */}
              {!interactiveMode ? (
                <button onClick={startInteractive}
                  title="Interactive mode — send inputs one at a time"
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-[#8b949e] hover:text-emerald-400 hover:bg-[#161b22] transition-all border border-transparent hover:border-[#30363d]">
                  <Zap className="w-3 h-3"/>
                  Interactive
                </button>
              ) : (
                <button onClick={stopInteractive}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium text-red-400 hover:bg-red-900/20 transition-all border border-red-900/40">
                  <Square className="w-3 h-3 fill-current"/>
                  Stop
                </button>
              )}
              {!interactiveMode && result && (
                <>
                  {result.elapsedMs!=null&&<span className="flex items-center gap-1 text-[10px] text-[#8b949e]"><Clock className="w-2.5 h-2.5"/>{result.elapsedMs}ms</span>}
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-semibold',result.exitCode===0?'bg-emerald-900/30 text-emerald-400':'bg-red-900/30 text-red-400')}>
                    exit {result.exitCode}
                  </span>
                  <button onClick={copyOutput} className="flex items-center gap-1 text-[10px] text-[#8b949e] hover:text-[#c9d1d9] px-1.5 py-0.5 rounded hover:bg-[#161b22] transition-colors">
                    {copied?<Check className="w-3 h-3 text-emerald-400"/>:<Copy className="w-3 h-3"/>}
                    {copied?'Copied':'Copy'}
                  </button>
                  <button onClick={()=>setResult(null)} className="p-1 hover:bg-[#161b22] rounded text-[#8b949e] hover:text-[#c9d1d9]"><X className="w-3 h-3"/></button>
                </>
              )}
            </div>
          </div>

          {/* ── Interactive Terminal ── */}
          {interactiveMode ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Terminal output */}
              <div className="flex-1 overflow-auto px-4 py-3 custom-scrollbar" style={{fontFamily:'"JetBrains Mono", monospace',fontSize:12.5,lineHeight:1.7}}>
                {iLines.length === 0 && isRunning && (
                  <div className="flex items-center gap-2 text-indigo-400 text-xs">
                    <Loader2 className="w-3 h-3 animate-spin"/>Starting program…
                  </div>
                )}
                {iLines.map((line, i) => (
                  <div key={i}>
                    {line.type === 'in' ? (
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-500 select-none shrink-0">›</span>
                        <span className="text-emerald-300">{line.text}</span>
                      </div>
                    ) : line.type === 'err' ? (
                      <pre className="text-red-400 whitespace-pre-wrap">{line.text}</pre>
                    ) : (
                      <pre className="text-[#c9d1d9] whitespace-pre-wrap">{line.text}</pre>
                    )}
                  </div>
                ))}
                {isRunning && iLines.length > 0 && (
                  <span className="inline-block w-2 h-3.5 bg-indigo-400 animate-pulse ml-0.5 align-middle"/>
                )}
                {iDone && (
                  <div className="mt-2 text-[10px] text-[#484f58] border-t border-[#21262d] pt-2">
                    — program exited — click Stop to reset
                  </div>
                )}
                <div ref={terminalEndRef}/>
              </div>
              {/* Input row */}
              <div className="shrink-0 border-t border-[#21262d] flex items-center gap-2 px-3 py-2">
                <span className="text-emerald-500 font-mono text-sm shrink-0">›</span>
                <input
                  autoFocus
                  value={iCurrentInput}
                  onChange={e=>setICurrentInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&!isRunning&&!iDone) sendInteractiveInput();}}
                  disabled={isRunning||iDone}
                  placeholder={iDone?'program exited — click Stop to reset':isRunning?'waiting…':'type input and press Enter'}
                  className="flex-1 bg-transparent text-sm text-[#c9d1d9] placeholder-[#484f58] outline-none font-mono disabled:opacity-40"
                  style={{fontFamily:'"JetBrains Mono", monospace'}}
                />
                <button
                  onClick={sendInteractiveInput}
                  disabled={isRunning||iDone||!iCurrentInput.trim()}
                  className="p-1.5 rounded text-indigo-400 hover:bg-indigo-600/20 disabled:opacity-30 transition-colors shrink-0"
                  title="Send (Enter)"
                >
                  <CornerDownLeft className="w-4 h-4"/>
                </button>
              </div>
            </div>

          ) : (
            /* ── Normal output tabs ── */
            <div className="flex-1 overflow-auto custom-scrollbar min-h-0">
              {outputTab==='output'&&(
                <div className="h-full flex flex-col">
                  <div className="px-4 pt-2 pb-1 flex items-center gap-2 text-[10px] text-[#484f58] font-mono border-b border-[#21262d] shrink-0">
                    <span className="text-emerald-500">$</span>
                    <span className="truncate">{selectedCompiler}{showFlags&&flags.active.size>0?' '+Array.from(flags.active).join(' '):''}</span>
                  </div>
                  <div className="flex-1 overflow-auto px-4 py-2.5 text-xs custom-scrollbar" style={{fontFamily:'"JetBrains Mono", monospace',lineHeight:1.7}}>
                    {!result&&!isRunning&&(
                      <div className="flex flex-col items-center justify-center h-full py-6 text-[#484f58] space-y-2">
                        <Cpu className="w-7 h-7 opacity-20"/>
                        <p className="text-[11px]">Click Run for batch mode · click Interactive for step-by-step</p>
                      </div>
                    )}
                    {isRunning&&<div className="flex items-center gap-2 text-indigo-400"><Loader2 className="w-3 h-3 animate-spin"/>Compiling and running…</div>}
                    {result&&(
                      <AnimatePresence mode="wait">
                        <motion.div key="out" initial={{opacity:0,y:3}} animate={{opacity:1,y:0}}>
                          {result.stdout?<pre className="text-[#c9d1d9] whitespace-pre-wrap">{result.stdout}</pre>
                            :result.exitCode===0?<span className="text-[#484f58]">(no output)</span>
                            :<span className="text-red-400">Exited with code {result.exitCode} — check Errors tab</span>}
                          {result.stderr&&<pre className="mt-2 text-red-400 whitespace-pre-wrap">{result.stderr}</pre>}
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              )}
              {outputTab==='errors'&&(
                <div className="px-4 py-2.5 text-xs space-y-2" style={{fontFamily:'"JetBrains Mono", monospace',lineHeight:1.6}}>
                  {!result&&<p className="text-[#484f58] text-[11px]">Run your code to see errors.</p>}
                  {result&&result.errors.length===0&&<div className="flex items-center gap-2 text-emerald-400 py-4"><Check className="w-4 h-4"/>No errors 🎉</div>}
                  {result?.errors.map((err,i)=>(
                    <motion.div key={i} initial={{opacity:0,x:-4}} animate={{opacity:1,x:0}} transition={{delay:i*0.04}}
                      className="p-3 bg-red-900/15 border border-red-900/40 rounded-lg text-red-300 whitespace-pre-wrap text-[11px]">{err}</motion.div>
                  ))}
                </div>
              )}
              {outputTab==='warnings'&&(
                <div className="px-4 py-2.5 text-xs space-y-2" style={{fontFamily:'"JetBrains Mono", monospace',lineHeight:1.6}}>
                  {!result&&<p className="text-[#484f58] text-[11px]">Run your code to see warnings.</p>}
                  {result&&result.warnings.length===0&&<div className="flex items-center gap-2 text-emerald-400 py-4"><Check className="w-4 h-4"/>No warnings</div>}
                  {result?.warnings.map((w,i)=>(
                    <motion.div key={i} initial={{opacity:0,x:-4}} animate={{opacity:1,x:0}} transition={{delay:i*0.04}}
                      className="p-3 bg-amber-900/15 border border-amber-900/40 rounded-lg text-amber-300 whitespace-pre-wrap text-[11px]">{w}</motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
