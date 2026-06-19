"use client";

import React, { useState } from "react";
import { Code2, Wand2, Minimize, CheckCircle2, AlertTriangle, Copy, Check, Trash2, ListTree } from "lucide-react";
import { Breadcrumbs } from "@/components/remake/Breadcrumbs";

export default function XMLConsolePage() {
  const [inputXml, setInputXml] = useState('<?xml version="1.0"?>\n<catalog>\n   <book id="bk101">\n      <author>Gambardella, Matthew</author>\n      <title>XML Developer\'s Guide</title>\n      <genre>Computer</genre>\n      <price>44.95</price>\n      <publish_date>2000-10-01</publish_date>\n      <description>An in-depth look at creating applications \n      with XML.</description>\n   </book>\n</catalog>');
  const [outputXml, setOutputXml] = useState("");
  const [errorLines, setErrorLines] = useState<{line: number, msg: string}[]>([]);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"code" | "tree">("code");

  const validateXML = (xml: string) => {
    if (!xml.trim()) {
      setIsValid(null);
      setErrorLines([]);
      return null;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "application/xml");
      const errorNode = doc.querySelector("parsererror");
      
      if (errorNode) {
        setIsValid(false);
        // Extract basic error message
        const errText = errorNode.textContent || "Invalid XML format";
        // Attempt to parse line number from standard browser parser errors (e.g., Chrome: "error on line 3 at column 6:")
        const lineMatch = errText.match(/line (\d+)/i);
        const line = lineMatch ? parseInt(lineMatch[1], 10) : 0;
        
        setErrorLines([{ line, msg: errText }]);
        return null;
      }
      
      setIsValid(true);
      setErrorLines([]);
      return doc;
    } catch (e: any) {
      setIsValid(false);
      setErrorLines([{ line: 0, msg: e.message || "Unknown parsing error" }]);
      return null;
    }
  };

  const formatXML = () => {
    const doc = validateXML(inputXml);
    if (!doc) return;

    // A very basic cross-browser XML formatter
    let formatted = "";
    let pad = 0;
    
    // Using a regex approach to format standard XML strings
    const reg = /(>)(<)(\/*)/g;
    let xml = inputXml.replace(reg, '$1\r\n$2$3');
    
    // Split by newlines
    xml.split('\r\n').forEach((node) => {
      let indent = 0;
      if (node.match( /.+<\/\w[^>]*>$/ )) {
        indent = 0;
      } else if (node.match( /^<\/\w/ )) {
        if (pad !== 0) { pad -= 1; }
      } else if (node.match( /^<\w[^>]*[^\/]>.*$/ )) {
        indent = 1;
      } else {
        indent = 0;
      }
      
      let padding = "";
      for (let i = 0; i < pad; i++) { padding += "  "; }
      
      formatted += padding + node + "\r\n";
      pad += indent;
    });

    setOutputXml(formatted.trim());
    setViewMode("code");
  };

  const minifyXML = () => {
    const doc = validateXML(inputXml);
    if (!doc) return;
    
    // Remove formatting whitespace between tags
    const minified = inputXml.replace(/>\s+</g, '><').trim();
    setOutputXml(minified);
    setViewMode("code");
  };

  const handleValidate = () => {
    const doc = validateXML(inputXml);
    if (doc) {
      setOutputXml("XML is valid. Use 'Format XML' to pretty-print.");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputXml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 h-[calc(100vh-80px)] flex flex-col">
      <Breadcrumbs />
      
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-6 shrink-0">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
              <Code2 className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">XML Console</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Validate, format, and visualize XML payload structures for ETL rules.</p>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0">
        
        {/* Input Panel */}
        <div className="flex-1 enterprise-card flex flex-col shadow-lg border-primary/10">
          <div className="h-12 border-b border-border bg-muted/20 flex items-center justify-between px-4 shrink-0">
            <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Input Source</div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setInputXml("")}
                className="h-8 px-3 rounded hover:bg-red-500/10 hover:text-red-500 text-muted-foreground transition-all flex items-center gap-1.5"
                title="Clear input"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 relative bg-[#0f111a] dark:bg-black/40">
            {/* Very basic line numbers */}
            <div className="absolute left-0 top-0 bottom-0 w-10 bg-black/40 border-r border-border/50 text-[11px] font-mono text-muted-foreground/30 text-right pr-2 py-4 select-none overflow-hidden" aria-hidden="true">
              {inputXml.split('\n').map((_, i) => (
                <div key={i} className={errorLines.some(e => e.line === i + 1) ? "text-red-500 font-bold bg-red-500/10" : ""}>{i + 1}</div>
              ))}
            </div>
            <textarea
              value={inputXml}
              onChange={(e) => {
                setInputXml(e.target.value);
                setIsValid(null); // Reset validation state on edit
              }}
              spellCheck={false}
              className="absolute inset-0 w-full h-full p-4 pl-14 bg-transparent text-[#e2e8f0] font-mono text-[13px] leading-relaxed resize-none outline-none focus:ring-0 whitespace-pre"
              placeholder="Paste XML here..."
            />
          </div>

          {/* Validation Status Footer */}
          <div className="border-t border-border bg-muted/10 p-3 shrink-0">
            {isValid === null ? (
              <div className="text-xs text-muted-foreground">Validation status: Pending</div>
            ) : isValid ? (
              <div className="flex items-center gap-2 text-emerald-500 text-sm font-bold bg-emerald-500/10 p-2 rounded">
                <CheckCircle2 className="w-4 h-4" /> Valid XML Document
              </div>
            ) : (
              <div className="flex flex-col gap-1 text-red-500 text-sm font-bold bg-red-500/10 p-2 rounded">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Invalid XML
                </div>
                {errorLines.map((e, i) => (
                  <div key={i} className="text-[11px] font-mono font-normal ml-6 text-red-400">
                    {e.line > 0 ? `Line ${e.line}: ` : ""}{e.msg.split('\n')[0]}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Column (Middle) */}
        <div className="flex xl:flex-col justify-center gap-4 shrink-0 overflow-x-auto py-2 xl:py-0">
          <button
            onClick={handleValidate}
            className="flex items-center justify-center gap-2 xl:w-full h-12 px-6 xl:px-4 rounded-lg bg-card border border-border hover:border-primary hover:bg-muted text-sm font-bold text-foreground transition-all shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> <span className="xl:hidden">Validate</span>
          </button>
          
          <button
            onClick={formatXML}
            className="flex items-center justify-center gap-2 xl:w-full h-12 px-6 xl:px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-all shadow-md"
          >
            <Wand2 className="w-4 h-4" /> Format
          </button>
          
          <button
            onClick={minifyXML}
            className="flex items-center justify-center gap-2 xl:w-full h-12 px-6 xl:px-4 rounded-lg bg-card border border-border hover:bg-muted text-sm font-bold text-foreground transition-all shadow-sm"
          >
            <Minimize className="w-4 h-4 text-muted-foreground" /> Minify
          </button>
        </div>

        {/* Output Panel */}
        <div className="flex-1 enterprise-card flex flex-col shadow-lg">
          <div className="h-12 border-b border-border bg-muted/20 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-4">
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Output Result</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={copyToClipboard}
                disabled={!outputXml}
                className="h-8 px-3 rounded hover:bg-muted text-muted-foreground transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          
          <div className="flex-1 relative bg-[#0f111a] dark:bg-black/40 overflow-hidden">
            {outputXml ? (
              <textarea
                value={outputXml}
                readOnly
                className="absolute inset-0 w-full h-full p-4 bg-transparent text-[#e2e8f0] font-mono text-[13px] leading-relaxed resize-none outline-none focus:ring-0 whitespace-pre"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <Code2 className="w-8 h-8 mb-3 opacity-20" />
                <p className="text-sm font-medium">Processed output will appear here</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
