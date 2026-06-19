"use client";

import React, { useState } from "react";
import { Play, RotateCcw, Plus, Trash2, FileText, Activity, Layers, ArrowRight, CheckCircle2, Regex } from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/remake/Breadcrumbs";

export default function RegexJobSimPage() {
  const [sourceData, setSourceData] = useState(
    "1001,John Doe,john.doe@email.com,555-0100,ACTIVE\n" +
    "1002,Jane Smith,jane.smith@email.com,555-0102,INACTIVE\n" +
    "1003,Bob Wilson,bob.w@test.org,555-0103,ACTIVE\n" +
    "1004,Alice Brown,alice@company.net,555-0104,PENDING\n" +
    "1005,Charlie Davis,charlie.d@email.com,555-0105,ACTIVE"
  );
  const [delimiter, setDelimiter] = useState(",");

  const [rules, setRules] = useState([
    { id: 1, colIdx: 2, pattern: "(@email\\.com)", replacement: "@redacted.com", flags: "gi" },
    { id: 2, colIdx: 3, pattern: "(\\d{3})-(\\d{4})", replacement: "***-$2", flags: "g" },
    { id: 3, colIdx: 4, pattern: "ACTIVE", replacement: "ACT", flags: "g" },
  ]);

  const [simulationResult, setSimulationResult] = useState<{
    headers: string[];
    rows: { original: string[], transformed: string[], changedIndices: number[] }[];
    stats: { total: number, changed: number, ms: number };
  } | null>(null);

  const [isSimulating, setIsSimulating] = useState(false);

  const handleAddRule = () => {
    setRules([...rules, { 
      id: Date.now(), 
      colIdx: 0, 
      pattern: "", 
      replacement: "", 
      flags: "g" 
    }]);
  };

  const handleRemoveRule = (id: number) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const handleRuleChange = (id: number, field: string, value: string | number) => {
    setRules(rules.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const runSimulation = () => {
    setIsSimulating(true);
    
    setTimeout(() => {
      const start = performance.now();
      
      const lines = sourceData.split('\n').filter(l => l.trim() !== '');
      let changedRowsCount = 0;
      
      // Determine max columns for headers
      let maxCols = 0;
      const parsedRows = lines.map(line => {
        const cols = line.split(delimiter);
        if (cols.length > maxCols) maxCols = cols.length;
        return cols;
      });
      
      const headers = Array.from({length: maxCols}, (_, i) => `Col_${i}`);
      
      const rows = parsedRows.map(originalCols => {
        const transformedCols = [...originalCols];
        const changedIndices: number[] = [];
        let rowChanged = false;
        
        rules.forEach(rule => {
          if (!rule.pattern) return;
          
          try {
            const regex = new RegExp(rule.pattern, rule.flags);
            const targetCol = typeof rule.colIdx === 'string' ? parseInt(rule.colIdx, 10) : rule.colIdx;
            
            if (targetCol >= 0 && targetCol < transformedCols.length) {
              const oldVal = transformedCols[targetCol];
              const newVal = oldVal.replace(regex, rule.replacement);
              
              if (oldVal !== newVal) {
                transformedCols[targetCol] = newVal;
                if (!changedIndices.includes(targetCol)) {
                  changedIndices.push(targetCol);
                }
                rowChanged = true;
              }
            }
          } catch (e) {
            // Ignore invalid regex during simulation loop
          }
        });
        
        if (rowChanged) changedRowsCount++;
        
        return {
          original: originalCols,
          transformed: transformedCols,
          changedIndices
        };
      });
      
      const end = performance.now();
      
      setSimulationResult({
        headers,
        rows,
        stats: {
          total: rows.length,
          changed: changedRowsCount,
          ms: Math.round(end - start)
        }
      });
      
      setIsSimulating(false);
    }, 300); // Artificial delay for UI effect
  };

  const resetSimulation = () => {
    setSimulationResult(null);
  };

  return (
    <div className="p-8 max-w-[1800px] mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)] flex flex-col">
      <Breadcrumbs />
      
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-6 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Activity className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Regex Job Simulator</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Simulate complex multi-column regex transformation pipelines before deploying to production jobs.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={resetSimulation}
            className="h-10 px-4 rounded-lg bg-card border border-border hover:bg-muted text-[13px] font-semibold text-muted-foreground transition-all flex items-center gap-2 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button 
            onClick={runSimulation}
            disabled={isSimulating}
            className="h-10 px-5 rounded-lg bg-primary hover:bg-primary/90 text-[13px] font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {isSimulating ? <RotateCcw className="w-4.5 h-4.5 animate-spin" /> : <Play className="w-4.5 h-4.5" />} 
            Run Simulation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Input & Rules */}
        <div className="xl:col-span-1 flex flex-col gap-6 min-h-0">
          
          {/* Source Data Card */}
          <div className="enterprise-card flex flex-col flex-1 min-h-[300px] shadow-lg border-primary/10">
            <div className="h-12 border-b border-border bg-muted/20 flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-foreground">
                <FileText className="w-4 h-4 text-primary" /> Source Data
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Delimiter:</label>
                <input 
                  type="text" 
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value)}
                  className="w-10 h-7 text-center rounded bg-card border border-border text-xs font-mono outline-none focus:border-primary"
                />
              </div>
            </div>
            <textarea
              value={sourceData}
              onChange={(e) => setSourceData(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full p-4 bg-[#0f111a] dark:bg-black/40 text-[#e2e8f0] font-mono text-[12px] leading-relaxed resize-none outline-none focus:ring-0 whitespace-pre"
              placeholder="Paste delimited data here..."
            />
          </div>

          {/* Rules Pipeline */}
          <div className="enterprise-card flex flex-col flex-1 min-h-[400px] shadow-lg">
            <div className="h-12 border-b border-border bg-muted/10 flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-foreground">
                <Layers className="w-4 h-4 text-primary" /> Transformation Pipeline
              </div>
              <button 
                onClick={handleAddRule}
                className="h-7 px-2 rounded-md bg-primary/10 hover:bg-primary hover:text-white text-primary text-[10px] font-bold transition-all flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Rule
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto premium-scrollbar p-4 space-y-4 bg-muted/5">
              {rules.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-border rounded-lg text-muted-foreground text-xs">
                  No transformation rules defined.
                </div>
              ) : (
                rules.map((rule, index) => (
                  <div key={rule.id} className="bg-card border border-border rounded-xl p-3 shadow-sm relative group">
                    <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold border-2 border-background shadow-sm z-10">
                      {index + 1}
                    </div>
                    
                    <div className="pl-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">Target Col:</label>
                          <input 
                            type="number" 
                            min="0"
                            value={rule.colIdx}
                            onChange={(e) => handleRuleChange(rule.id, 'colIdx', e.target.value)}
                            className="w-16 h-7 px-2 rounded bg-muted/50 border border-border text-xs font-mono outline-none focus:border-primary text-center"
                          />
                        </div>
                        <button 
                          onClick={() => handleRemoveRule(rule.id)}
                          className="text-muted-foreground hover:text-red-500 opacity-50 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-16 text-[10px] font-bold text-muted-foreground text-right uppercase">Match</div>
                          <div className="flex-1 relative flex items-center">
                            <span className="absolute left-2 text-muted-foreground font-mono text-[10px]">/</span>
                            <input 
                              type="text" 
                              value={rule.pattern}
                              onChange={(e) => handleRuleChange(rule.id, 'pattern', e.target.value)}
                              className="w-full h-8 pl-5 pr-8 rounded bg-muted/50 border border-border text-[11px] font-mono outline-none focus:border-primary"
                              placeholder="Regex pattern"
                            />
                            <input 
                              type="text" 
                              value={rule.flags}
                              onChange={(e) => handleRuleChange(rule.id, 'flags', e.target.value)}
                              className="absolute right-0 w-8 h-8 text-center bg-transparent text-[10px] font-mono text-muted-foreground outline-none border-l border-border"
                              placeholder="gi"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className="w-16 text-[10px] font-bold text-muted-foreground text-right uppercase flex justify-end">
                            <ArrowRight className="w-3 h-3 text-emerald-500" />
                          </div>
                          <input 
                            type="text" 
                            value={rule.replacement}
                            onChange={(e) => handleRuleChange(rule.id, 'replacement', e.target.value)}
                            className="flex-1 h-8 px-2 rounded bg-muted/50 border border-border text-[11px] font-mono outline-none focus:border-emerald-500"
                            placeholder="Replacement ($1, etc)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="xl:col-span-2 enterprise-card flex flex-col shadow-lg border-primary/20 overflow-hidden">
          <div className="h-12 border-b border-border bg-muted/10 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-foreground">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Simulation Results
            </div>
            {simulationResult && (
              <div className="flex items-center gap-4 text-[11px] font-mono font-bold">
                <span className="text-muted-foreground">Processed: <span className="text-foreground">{simulationResult.stats.total}</span></span>
                <span className="text-muted-foreground">Modified: <span className="text-emerald-500">{simulationResult.stats.changed}</span></span>
                <span className="text-muted-foreground">Time: <span className="text-primary">{simulationResult.stats.ms}ms</span></span>
              </div>
            )}
          </div>

          <div className="flex-1 relative overflow-auto bg-card">
            {!simulationResult && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <Regex className="w-12 h-12 mb-4 opacity-10" />
                <p className="text-sm font-medium">Configure rules and click Run Simulation</p>
              </div>
            )}

            {simulationResult && (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur shadow-sm">
                  <tr>
                    <th className="px-3 py-2 w-10 text-center font-bold text-muted-foreground border-b border-r border-border text-[10px] uppercase">Row</th>
                    <th className="px-3 py-2 w-16 text-center font-bold text-muted-foreground border-b border-r border-border text-[10px] uppercase">State</th>
                    {simulationResult.headers.map((h, i) => (
                      <th key={i} className="px-4 py-2 font-bold text-muted-foreground border-b border-border text-[10px] uppercase tracking-wider min-w-[120px]">
                        {h} <span className="text-muted-foreground/50 text-[9px] font-mono ml-1">[{i}]</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-border font-mono text-[11px]">
                  {simulationResult.rows.map((row, rIdx) => {
                    const isChanged = row.changedIndices.length > 0;
                    
                    if (!isChanged) {
                      return (
                        <tr key={rIdx} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-3 text-center border-r border-border text-muted-foreground/50">{rIdx + 1}</td>
                          <td className="px-3 py-3 text-center border-r border-border">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase">Unchanged</span>
                          </td>
                          {simulationResult.headers.map((_, cIdx) => (
                            <td key={cIdx} className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">
                              {row.original[cIdx] || ""}
                            </td>
                          ))}
                        </tr>
                      );
                    }

                    return (
                      <React.Fragment key={rIdx}>
                        {/* Before Row */}
                        <tr className="bg-red-500/5 hover:bg-red-500/10 transition-colors">
                          <td rowSpan={2} className="px-3 text-center border-r border-border text-muted-foreground/50 align-middle font-bold bg-card">{rIdx + 1}</td>
                          <td className="px-3 py-2 text-center border-r border-b border-red-500/10">
                            <span className="text-[9px] font-bold text-red-500 uppercase">Before</span>
                          </td>
                          {simulationResult.headers.map((_, cIdx) => {
                            const isCellChanged = row.changedIndices.includes(cIdx);
                            return (
                              <td key={`b-${cIdx}`} className={cn("px-4 py-2 max-w-[200px] truncate border-b border-red-500/10", isCellChanged ? "text-red-500 line-through opacity-70" : "text-muted-foreground")}>
                                {row.original[cIdx] || ""}
                              </td>
                            );
                          })}
                        </tr>
                        {/* After Row */}
                        <tr className="bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                          <td className="px-3 py-2 text-center border-r border-border">
                            <span className="text-[9px] font-bold text-emerald-500 uppercase">After</span>
                          </td>
                          {simulationResult.headers.map((_, cIdx) => {
                            const isCellChanged = row.changedIndices.includes(cIdx);
                            return (
                              <td key={`a-${cIdx}`} className={cn("px-4 py-2 max-w-[200px] truncate", isCellChanged ? "text-emerald-500 font-bold bg-emerald-500/10 rounded-sm" : "text-muted-foreground")}>
                                {row.transformed[cIdx] || ""}
                              </td>
                            );
                          })}
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
