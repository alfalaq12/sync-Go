"use client";

import React, { useState, useEffect, useMemo } from "react";
import { TerminalSquare, RefreshCw, Copy, Check, FileText, Settings2, PlayCircle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/remake/Breadcrumbs";

export default function RegexConsolePage() {
  const [pattern, setPattern] = useState("([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\\.[a-zA-Z0-9_-]+)");
  const [flags, setFlags] = useState("g");
  const [testString, setTestString] = useState("Contact us at support@syncgo.io or sales@syncgo.io for more details. Another email is info@test.com.");
  
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [replaceString, setReplaceString] = useState("[REDACTED_EMAIL]");
  
  const [copied, setCopied] = useState(false);

  const { matches, error, highlightedText, replacedText } = useMemo(() => {
    let result = { matches: [] as any[], error: "", highlightedText: [] as React.ReactNode[], replacedText: "" };
    
    if (!pattern) {
      result.highlightedText = [<span key="empty">{testString}</span>];
      result.replacedText = testString;
      return result;
    }

    try {
      const regex = new RegExp(pattern, flags);
      
      // Calculate replace
      if (isReplaceMode) {
        result.replacedText = testString.replace(regex, replaceString);
      }

      // Calculate matches and highlighting
      let match;
      let lastIndex = 0;
      
      // If not global, RegExp.exec behaves differently and can infinite loop if we don't handle it
      const safeFlags = flags.includes('g') ? flags : flags + 'g';
      const safeRegex = new RegExp(pattern, safeFlags);
      
      let count = 0;
      while ((match = safeRegex.exec(testString)) !== null && count < 1000) { // Limit to prevent infinite loops on weird regexes
        // Prevent infinite loops with zero-length matches
        if (match.index === safeRegex.lastIndex) {
          safeRegex.lastIndex++;
        }
        
        // Push preceding unmatched text
        if (match.index > lastIndex) {
          result.highlightedText.push(<span key={`text-${lastIndex}`}>{testString.substring(lastIndex, match.index)}</span>);
        }
        
        // Push matched text with highlight
        const matchText = match[0];
        result.highlightedText.push(
          <span key={`match-${match.index}`} className="bg-primary/30 text-primary font-bold rounded-sm border-b border-primary/50 relative group">
            {matchText}
            {match.length > 1 && (
              <span className="absolute -top-6 left-0 bg-card border border-border px-2 py-0.5 rounded text-[9px] shadow-lg hidden group-hover:block z-10 whitespace-nowrap">
                {match.slice(1).map((g, i) => `<Group ${i+1}: ${g}>`).join(' ')}
              </span>
            )}
          </span>
        );
        
        // Collect match details
        const groups = match.slice(1);
        result.matches.push({
          index: match.index,
          value: matchText,
          groups: groups,
          end: match.index + matchText.length
        });
        
        lastIndex = match.index + matchText.length;
        count++;
        
        if (!flags.includes('g')) break; // Stop after first if not global
      }
      
      // Push remaining text
      if (lastIndex < testString.length) {
        result.highlightedText.push(<span key={`text-end`}>{testString.substring(lastIndex)}</span>);
      }
      
    } catch (err: any) {
      result.error = err.message;
      result.highlightedText = [<span key="err">{testString}</span>];
      result.replacedText = testString;
    }
    
    return result;
  }, [pattern, flags, testString, isReplaceMode, replaceString]);

  const toggleFlag = (flag: string) => {
    if (flags.includes(flag)) {
      setFlags(flags.replace(flag, ""));
    } else {
      setFlags(flags + flag);
    }
  };

  const copyPattern = () => {
    navigator.clipboard.writeText(`/${pattern}/${flags}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const commonPatterns = [
    { name: "Email Address", pattern: "([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\\.[a-zA-Z0-9_-]+)" },
    { name: "IP Address v4", pattern: "\\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\b" },
    { name: "URL", pattern: "https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)" },
    { name: "Date (YYYY-MM-DD)", pattern: "^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$" },
    { name: "UUID / GUID", pattern: "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}" },
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 h-[calc(100vh-80px)] flex flex-col">
      <Breadcrumbs />
      
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-6 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <TerminalSquare className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Regex Tester Console</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Test and debug regular expressions for your data extraction rules.</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0">
        
        {/* Main Editor */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 gap-6">
          
          {/* Pattern Input Card */}
          <div className="enterprise-card p-6 shrink-0 shadow-lg border-primary/10">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Settings2 className="w-3.5 h-3.5" /> Regular Expression
                </label>
                <div className="flex items-center gap-4 text-[11px] font-bold">
                  {['g', 'i', 'm', 's'].map(f => (
                    <label key={f} className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors">
                      <input 
                        type="checkbox" 
                        className="rounded border-border text-primary focus:ring-0 w-3 h-3 bg-muted"
                        checked={flags.includes(f)}
                        onChange={() => toggleFlag(f)}
                      />
                      <span className="uppercase">{f}</span>
                    </label>
                  ))}
                  <button onClick={copyPattern} className="ml-2 hover:text-primary text-muted-foreground transition-colors flex items-center gap-1">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </button>
                </div>
              </div>
              
              <div className="relative flex items-stretch">
                <div className="bg-muted/50 border border-border border-r-0 rounded-l-lg px-4 flex items-center justify-center font-mono font-bold text-muted-foreground text-lg">
                  /
                </div>
                <input 
                  type="text" 
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  className="flex-1 h-12 bg-card border border-border text-foreground font-mono text-[14px] px-4 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="Enter regex pattern..."
                />
                <div className="bg-muted/50 border border-border border-l-0 rounded-r-lg px-4 flex items-center justify-center font-mono font-bold text-muted-foreground text-lg">
                  /{flags}
                </div>
              </div>

              {error && (
                <div className="text-red-500 text-[11px] font-mono mt-1 bg-red-500/10 px-3 py-1.5 rounded inline-block">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Test String Area */}
          <div className="enterprise-card flex-1 min-h-0 flex flex-col shadow-lg">
            <div className="p-4 border-b border-border bg-muted/10 flex items-center justify-between shrink-0">
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Test String
              </label>
              <div className="flex items-center gap-3">
                <div className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {matches.length} matches
                </div>
              </div>
            </div>
            
            <div className="flex-1 relative flex">
              {/* Actual Textarea (Transparent text, visible cursor) */}
              <textarea 
                value={testString}
                onChange={(e) => setTestString(e.target.value)}
                spellCheck={false}
                className="absolute inset-0 w-full h-full p-4 bg-transparent text-transparent caret-foreground font-mono text-[13px] leading-relaxed resize-none outline-none z-10"
              />
              {/* Highlight Overlay */}
              <div className="absolute inset-0 w-full h-full p-4 font-mono text-[13px] leading-relaxed text-foreground/70 pointer-events-none whitespace-pre-wrap overflow-hidden break-words">
                {highlightedText}
              </div>
            </div>
          </div>

          {/* Replacement Mode */}
          <div className="enterprise-card shrink-0 shadow-lg">
            <div className="p-4 border-b border-border bg-muted/10 flex items-center justify-between cursor-pointer" onClick={() => setIsReplaceMode(!isReplaceMode)}>
              <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 cursor-pointer">
                <PlayCircle className="w-3.5 h-3.5" /> Replace Function
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={isReplaceMode}
                  onChange={(e) => setIsReplaceMode(e.target.checked)}
                />
                <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-inner"></div>
              </label>
            </div>
            
            {isReplaceMode && (
              <div className="p-4 flex flex-col md:flex-row gap-4 h-40">
                <div className="w-full md:w-1/3 flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Substitution</label>
                  <input 
                    type="text" 
                    value={replaceString}
                    onChange={(e) => setReplaceString(e.target.value)}
                    className="w-full h-9 bg-card border border-border rounded px-3 text-sm font-mono focus:border-primary outline-none"
                    placeholder="$1 or custom text"
                  />
                  <div className="text-[9px] text-muted-foreground mt-1">Use $1, $2 for capture groups.</div>
                </div>
                <div className="flex-1 flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Result</label>
                  <div className="flex-1 bg-muted/30 border border-border rounded p-3 text-[12px] font-mono whitespace-pre-wrap overflow-y-auto text-foreground/80">
                    {replacedText}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full xl:w-80 shrink-0 flex flex-col gap-6">
          
          <div className="enterprise-card p-4 flex-1 flex flex-col min-h-[300px]">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" /> Match Information
            </h3>
            
            <div className="flex-1 overflow-y-auto premium-scrollbar pr-2 space-y-3">
              {matches.length === 0 ? (
                <div className="text-[11px] text-muted-foreground text-center py-8 border border-dashed border-border rounded-lg">No matches found.</div>
              ) : (
                matches.map((m, i) => (
                  <div key={i} className="bg-muted/30 border border-border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-primary uppercase">Match {i + 1}</span>
                      <span className="text-[9px] text-muted-foreground font-mono">{m.index}-{m.end}</span>
                    </div>
                    <div className="font-mono text-[12px] text-foreground bg-card p-2 rounded border border-border/50 break-all">
                      {m.value}
                    </div>
                    {m.groups.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {m.groups.map((g: string, gi: number) => (
                          <div key={gi} className="flex gap-2 text-[10px] font-mono">
                            <span className="text-muted-foreground">Group {gi + 1}:</span>
                            <span className="text-foreground">{g}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="enterprise-card p-4 shrink-0">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4">Quick Snippets</h3>
            <div className="space-y-1">
              {commonPatterns.map((cp, idx) => (
                <button
                  key={idx}
                  onClick={() => setPattern(cp.pattern)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-primary/10 hover:text-primary transition-colors group"
                >
                  <div className="text-[11px] font-bold">{cp.name}</div>
                  <div className="text-[9px] font-mono text-muted-foreground truncate opacity-50 group-hover:opacity-100">{cp.pattern}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
