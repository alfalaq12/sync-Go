"use client";

import React, { useState, useEffect, useRef } from "react";
import { Terminal, Play, Trash2, Copy, Check, RotateCcw, BookOpen, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/remake/Breadcrumbs";

export default function ScriptConsolePage() {
  const [script, setScript] = useState(`// Sync-Go Javascript Execution Sandbox
// --------------------------------------
// Example: Processing a payload
const payload = {
  id: 1024,
  timestamp: new Date().toISOString(),
  data: { status: "ACTIVE", value: 42.5 }
};

console.log("Original Payload:", payload);

// Transform function
function transformPayload(p) {
  return {
    ...p,
    processed: true,
    data: {
      ...p.data,
      value: p.data.value * 10
    }
  };
}

const result = transformPayload(payload);
console.log("Transformed Result:", result);
console.warn("Notice: Execution runs locally in browser for testing.");
`);

  const [output, setOutput] = useState<{type: 'log' | 'warn' | 'error' | 'system', message: string, time: string}[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState(false);
  const outputEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output
  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [output]);

  const addToOutput = (type: 'log' | 'warn' | 'error' | 'system', ...args: any[]) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try { return JSON.stringify(arg, null, 2); } 
        catch (e) { return String(arg); }
      }
      return String(arg);
    }).join(' ');
    
    setOutput(prev => [...prev, { type, message, time }]);
  };

  const executeScript = () => {
    setIsExecuting(true);
    addToOutput('system', '--- Execution Started ---');
    
    // Create a safe console wrapper
    const safeConsole = {
      log: (...args: any[]) => addToOutput('log', ...args),
      warn: (...args: any[]) => addToOutput('warn', ...args),
      error: (...args: any[]) => addToOutput('error', ...args),
      info: (...args: any[]) => addToOutput('log', ...args),
    };

    try {
      // Using new Function to create a sandbox
      // Pass the safeConsole as a parameter so it doesn't conflict with global console
      const runner = new Function('console', script);
      
      // Execute the script
      runner(safeConsole);
      
      addToOutput('system', '--- Execution Completed Successfully ---');
    } catch (err: any) {
      addToOutput('error', `Execution Error: ${err.message}`);
      addToOutput('system', '--- Execution Failed ---');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      executeScript();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearOutput = () => {
    setOutput([]);
  };

  const snippets = [
    {
      name: "Map Array",
      code: `const users = [\n  { id: 1, name: "Alice" },\n  { id: 2, name: "Bob" }\n];\n\nconst ids = users.map(u => u.id);\nconsole.log(ids);`
    },
    {
      name: "Regex Match",
      code: `const text = "Server running on 192.168.1.100:8080";\nconst ipRegex = /\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b/;\nconst match = text.match(ipRegex);\nconsole.log("Found IP:", match[0]);`
    },
    {
      name: "Date Formatting",
      code: `const now = new Date();\nconsole.log("ISO:", now.toISOString());\nconsole.log("Locale:", now.toLocaleString());`
    }
  ];

  return (
    <div className="p-8 max-w-[1800px] mx-auto animate-in fade-in duration-500 h-[calc(100vh-80px)] flex flex-col">
      <Breadcrumbs />
      
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-6 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-500">
              <Terminal className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Script Console</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Sandbox environment to test JavaScript logic, payload transformations, and data mapping.</p>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        
        {/* Main Editor & Results */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 gap-6">
          
          {/* Top: Editor */}
          <div className="enterprise-card flex flex-col h-[50%] shrink-0 shadow-lg border-primary/20">
            {/* Toolbar */}
            <div className="h-12 border-b border-border bg-muted/20 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <button 
                  onClick={executeScript}
                  disabled={isExecuting}
                  className="h-8 px-4 rounded bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Play className={cn("w-3.5 h-3.5 fill-current", isExecuting && "animate-pulse")} />
                  {isExecuting ? "Executing..." : "Run Script"}
                </button>
                <div className="text-[10px] text-muted-foreground ml-2 font-mono hidden sm:block">Ctrl + Enter</div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={copyToClipboard}
                  className="h-8 px-3 rounded hover:bg-muted text-muted-foreground transition-all flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button 
                  onClick={() => setScript("")}
                  className="h-8 px-3 rounded hover:bg-red-500/10 hover:text-red-500 text-muted-foreground transition-all"
                  title="Clear Editor"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            {/* Textarea */}
            <div className="flex-1 relative bg-[#0f111a] dark:bg-black/40">
              {/* Line numbers approx */}
              <div className="absolute left-0 top-0 bottom-0 w-10 bg-black/40 border-r border-border/50 text-[11px] font-mono text-muted-foreground/30 text-right pr-2 py-4 select-none overflow-hidden" aria-hidden="true">
                {script.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                className="absolute inset-0 w-full h-full p-4 pl-14 bg-transparent text-[#e2e8f0] font-mono text-[13px] leading-relaxed resize-none outline-none focus:ring-0 whitespace-pre"
                placeholder="Type your Javascript here..."
              />
            </div>
          </div>

          {/* Bottom: Console Output */}
          <div className="enterprise-card flex flex-col flex-1 min-h-0 shadow-lg">
            {/* Toolbar */}
            <div className="h-10 border-b border-border bg-muted/10 flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                <Terminal className="w-3.5 h-3.5" /> Output Console
              </div>
              <button 
                onClick={clearOutput}
                className="text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear Console
              </button>
            </div>
            
            {/* Terminal Area */}
            <div className="flex-1 overflow-auto bg-[#0f111a] dark:bg-black/60 p-4 font-mono text-[12px] leading-relaxed">
              {output.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted-foreground/30 italic">
                  Run script to see console output...
                </div>
              ) : (
                <div className="space-y-1">
                  {output.map((entry, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "flex gap-3 py-1 border-b border-border/10 last:border-0",
                        entry.type === 'error' && "text-red-400 bg-red-500/5 px-2 -mx-2",
                        entry.type === 'warn' && "text-amber-400 bg-amber-500/5 px-2 -mx-2",
                        entry.type === 'system' && "text-muted-foreground italic",
                        entry.type === 'log' && "text-[#e2e8f0]"
                      )}
                    >
                      <span className="text-muted-foreground/50 shrink-0 select-none">[{entry.time}]</span>
                      <span className="whitespace-pre-wrap break-all">{entry.message}</span>
                    </div>
                  ))}
                  <div ref={outputEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Helpers */}
        <div className="w-80 shrink-0 flex flex-col gap-6 overflow-y-auto premium-scrollbar pl-2">
          
          <div className="enterprise-card p-4">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" /> Javascript Snippets
            </h3>
            <div className="space-y-3">
              {snippets.map(s => (
                <button
                  key={s.name}
                  onClick={() => setScript(s.code)}
                  className="w-full text-left p-3 rounded-md bg-muted/30 border border-border hover:border-primary/50 group transition-all"
                >
                  <div className="font-bold text-[12px] text-foreground mb-1 group-hover:text-primary">{s.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {s.code}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="enterprise-card p-5 bg-amber-500/5 border-amber-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-[13px] text-foreground mb-1">Sandbox Environment</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Scripts execute securely within your browser instance. They cannot access Node.js APIs (like fs or path) or the underlying server filesystem. Network requests via <code>fetch()</code> will be subject to browser CORS policies.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
