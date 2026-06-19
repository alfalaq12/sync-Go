"use client";

import React, { useState, useEffect } from "react";
import { Terminal, Play, RotateCcw, Copy, Trash2, Database, Table, Clock, AlertTriangle, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { executeDBQuery } from "@/lib/api";
import { Breadcrumbs } from "@/components/remake/Breadcrumbs";

export default function DBConsolePage() {
  const [query, setQuery] = useState("SELECT * FROM M_NODE LIMIT 10;");
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<{
    columns?: string[];
    rows?: any[];
    row_count?: number;
    duration_ms?: number;
    error?: string;
    timestamp?: string;
  } | null>(null);
  
  const [history, setHistory] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Load history from localStorage
    const saved = localStorage.getItem("syncgo_db_history");
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const saveHistory = (q: string) => {
    if (!q.trim()) return;
    const newHistory = [q, ...history.filter(h => h !== q)].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem("syncgo_db_history", JSON.stringify(newHistory));
  };

  const handleExecute = async () => {
    if (!query.trim()) return;
    setIsExecuting(true);
    setResult(null);
    try {
      const data = await executeDBQuery(query);
      setResult(data);
      saveHistory(query);
    } catch (err: any) {
      setResult({
        error: err?.response?.data?.error || "An unknown error occurred during execution.",
        duration_ms: err?.response?.data?.duration_ms
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      handleExecute();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(query);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSQL = () => {
    // A very basic format for demo purposes
    let formatted = query.replace(/\s+/g, ' ')
      .replace(/ SELECT /ig, '\nSELECT ')
      .replace(/ FROM /ig, '\nFROM ')
      .replace(/ WHERE /ig, '\nWHERE ')
      .replace(/ AND /ig, '\n  AND ')
      .replace(/ OR /ig, '\n  OR ')
      .replace(/ ORDER BY /ig, '\nORDER BY ')
      .replace(/ LIMIT /ig, '\nLIMIT ');
    setQuery(formatted.trim());
  };

  const schemaTables = [
    { name: "M_NODE", desc: "Master nodes" },
    { name: "M_SCHEMA", desc: "Sync schemas" },
    { name: "M_SCHEMA_JOBS", desc: "Job topologies" },
    { name: "SD_JOBS", desc: "Execution history" },
    { name: "JOB_LOG", desc: "System audit logs" },
    { name: "S_USERS", desc: "Admin users" }
  ];

  return (
    <div className="p-8 max-w-[1800px] mx-auto animate-in fade-in duration-500 h-[calc(100vh-80px)] flex flex-col">
      <Breadcrumbs />
      
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-6 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Terminal className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Interactive DB Console</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Execute read-only SQL queries directly against the Master internal database.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-widest">Select Only Allowed</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Sidebar */}
        <div className="w-64 shrink-0 flex flex-col gap-6 overflow-y-auto premium-scrollbar pr-2">
          
          <div className="enterprise-card p-4">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <Database className="w-3.5 h-3.5" /> Schema Reference
            </h3>
            <div className="space-y-1">
              {schemaTables.map(t => (
                <button
                  key={t.name}
                  onClick={() => setQuery(`SELECT * FROM ${t.name} LIMIT 50;`)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-primary/10 hover:text-primary group transition-all"
                >
                  <div className="font-mono text-[12px] font-bold text-foreground group-hover:text-primary">{t.name}</div>
                  <div className="text-[10px] text-muted-foreground">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="enterprise-card p-4 flex-1">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Query History
            </h3>
            <div className="space-y-2">
              {history.length === 0 ? (
                <div className="text-[11px] text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">No recent queries</div>
              ) : (
                history.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(h)}
                    className="w-full text-left p-2 rounded-md bg-muted/30 border border-border/50 hover:border-primary/50 transition-all group"
                  >
                    <div className="font-mono text-[10px] text-muted-foreground group-hover:text-foreground line-clamp-3 leading-relaxed break-all">
                      {h}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Editor & Results */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 gap-6">
          
          {/* Top: Editor */}
          <div className="enterprise-card flex flex-col h-[40%] shrink-0 shadow-lg border-primary/20">
            {/* Toolbar */}
            <div className="h-12 border-b border-border bg-muted/20 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className="h-8 px-4 rounded bg-primary hover:bg-primary/90 text-primary-foreground text-[12px] font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Play className={cn("w-3.5 h-3.5 fill-current", isExecuting && "animate-pulse")} />
                  {isExecuting ? "Executing..." : "Execute"}
                </button>
                <div className="text-[10px] text-muted-foreground ml-2 font-mono hidden sm:block">Ctrl + Enter</div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={formatSQL}
                  className="h-8 px-3 rounded hover:bg-muted text-muted-foreground text-[12px] font-semibold transition-all"
                >
                  Format SQL
                </button>
                <button 
                  onClick={copyToClipboard}
                  className="h-8 px-3 rounded hover:bg-muted text-muted-foreground transition-all flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button 
                  onClick={() => setQuery("")}
                  className="h-8 px-3 rounded hover:bg-red-500/10 hover:text-red-500 text-muted-foreground transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {/* Textarea */}
            <div className="flex-1 relative bg-[#0f111a] dark:bg-black/40">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                className="absolute inset-0 w-full h-full p-4 bg-transparent text-[#e2e8f0] font-mono text-[13px] leading-relaxed resize-none outline-none focus:ring-0"
                placeholder="Type your SELECT query here..."
              />
            </div>
          </div>

          {/* Bottom: Results */}
          <div className="enterprise-card flex flex-col flex-1 min-h-0 shadow-lg">
            {/* Toolbar */}
            <div className="h-10 border-b border-border bg-muted/10 flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                <Table className="w-3.5 h-3.5" /> Results Panel
              </div>
              {result && (
                <div className="flex items-center gap-4 text-[11px] font-mono">
                  {result.duration_ms !== undefined && (
                    <span className="text-muted-foreground">Execution: <span className="text-foreground">{result.duration_ms}ms</span></span>
                  )}
                  {result.row_count !== undefined && (
                    <span className="text-muted-foreground">Rows: <span className="text-foreground">{result.row_count}</span></span>
                  )}
                </div>
              )}
            </div>
            
            {/* Table Area */}
            <div className="flex-1 overflow-auto bg-card relative">
              {!result && !isExecuting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                  <Play className="w-8 h-8 mb-3 opacity-20" />
                  <p className="text-sm font-medium">Execute a query to see results</p>
                </div>
              )}
              
              {isExecuting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                  <RotateCcw className="w-8 h-8 text-primary animate-spin mb-4" />
                  <p className="text-sm font-bold text-foreground">Running Query...</p>
                </div>
              )}

              {result?.error && (
                <div className="p-6">
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold mb-1">Execution Error</h4>
                      <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">{result.error}</div>
                    </div>
                  </div>
                </div>
              )}

              {result?.rows && result.columns && (
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur-md z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 w-10 text-center font-bold text-muted-foreground border-b border-border border-r">#</th>
                      {result.columns.map((col, idx) => (
                        <th key={idx} className="px-4 py-3 font-bold text-muted-foreground border-b border-border border-r last:border-r-0 uppercase tracking-wider text-[10px]">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.rows.length === 0 ? (
                      <tr>
                        <td colSpan={result.columns.length + 1} className="px-4 py-8 text-center text-muted-foreground font-medium">
                          No rows returned.
                        </td>
                      </tr>
                    ) : (
                      result.rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2 text-center border-r border-border font-mono text-muted-foreground/50">{rowIdx + 1}</td>
                          {result.columns!.map((col, colIdx) => (
                            <td key={colIdx} className="px-4 py-2 border-r border-border last:border-r-0 font-mono text-[11px] text-foreground max-w-[300px] truncate">
                              {row[col] === null ? <span className="text-muted-foreground/40 italic">NULL</span> : String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
