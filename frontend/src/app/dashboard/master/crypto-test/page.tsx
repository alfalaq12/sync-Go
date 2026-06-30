"use client";

import React, { useState, useEffect } from "react";
import { KeyRound, Lock, FileCode, Check, Copy, RefreshCw, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/remake/Breadcrumbs";

export default function CryptoTestPage() {
  const [activeTab, setActiveTab] = useState("hash");
  
  // Shared state
  const [inputText, setInputText] = useState("SyncGo2026!");
  const [outputText, setOutputText] = useState("");
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Hash state
  const [hashAlgo, setHashAlgo] = useState("SHA-256");

  // Encode/Decode state
  const [encAlgo, setEncAlgo] = useState("base64");
  const [encMode, setEncMode] = useState<"encode" | "decode">("encode");

  // HMAC state
  const [hmacSecret, setHmacSecret] = useState("my-super-secret-key");

  // Basic MD5 implementation (since Web Crypto API doesn't support MD5)
  const md5 = (s: string) => {
    // This is a dummy implementation just for UI visual purposes if they select MD5
    // In a real app, you'd use a library like 'crypto-js/md5' or similar.
    return "Dummy_MD5_Hash_Not_Implemented_Use_Library_For_Real_MD5:_" + btoa(s).substring(0, 16);
  };

  const processText = async () => {
    if (!inputText) {
      setOutputText("");
      return;
    }
    
    setIsProcessing(true);
    
    try {
      if (activeTab === "hash") {
        if (hashAlgo === "MD5") {
          setOutputText(md5(inputText));
        } else {
          const msgUint8 = new TextEncoder().encode(inputText);
          const hashBuffer = await crypto.subtle.digest(hashAlgo, msgUint8);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          setOutputText(hashHex);
        }
      } 
      else if (activeTab === "encode") {
        if (encAlgo === "base64") {
          if (encMode === "encode") {
            setOutputText(btoa(unescape(encodeURIComponent(inputText))));
          } else {
            try {
              setOutputText(decodeURIComponent(escape(atob(inputText))));
            } catch (e) {
              setOutputText("Error: Invalid Base64 string");
            }
          }
        } else if (encAlgo === "url") {
          if (encMode === "encode") {
            setOutputText(encodeURIComponent(inputText));
          } else {
            try {
              setOutputText(decodeURIComponent(inputText));
            } catch (e) {
              setOutputText("Error: Invalid URL encoded string");
            }
          }
        } else if (encAlgo === "hex") {
          if (encMode === "encode") {
            const hex = Array.from(new TextEncoder().encode(inputText))
              .map(b => b.toString(16).padStart(2, '0')).join('');
            setOutputText(hex);
          } else {
            try {
              const hex = inputText.replace(/[^0-9A-Fa-f]/g, '');
              const bytes = new Uint8Array(hex.length / 2);
              for (let i = 0; i < hex.length; i += 2) {
                bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
              }
              setOutputText(new TextDecoder().decode(bytes));
            } catch (e) {
              setOutputText("Error: Invalid Hex string");
            }
          }
        }
      }
      else if (activeTab === "hmac") {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(hmacSecret);
        const cryptoKey = await crypto.subtle.importKey(
          "raw", 
          keyData, 
          { name: "HMAC", hash: hashAlgo === "MD5" ? "SHA-256" : hashAlgo }, 
          false, 
          ["sign"]
        );
        const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(inputText));
        const hashArray = Array.from(new Uint8Array(signature));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        setOutputText(hashHex);
      }
    } catch (err: any) {
      setOutputText(`Error processing: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    processText();
  }, [inputText, activeTab, hashAlgo, encAlgo, encMode, hmacSecret]);

  const copyToClipboard = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 min-h-[calc(100vh-80px)]">
      <Breadcrumbs />
      
      {/* Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-500">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Cryptography Utility</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Test hashing, encoding, and signatures for payload validation and authentication tokens.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Nav */}
        <div className="w-full lg:w-64 shrink-0">
          <div className="enterprise-card p-3 flex flex-col gap-1">
            <button
              onClick={() => setActiveTab("hash")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] font-bold transition-all text-left",
                activeTab === "hash" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Lock className="w-4 h-4" /> Hash Generators
            </button>
            <button
              onClick={() => setActiveTab("encode")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] font-bold transition-all text-left",
                activeTab === "encode" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <FileCode className="w-4 h-4" /> Encode & Decode
            </button>
            <button
              onClick={() => setActiveTab("hmac")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] font-bold transition-all text-left",
                activeTab === "hmac" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <KeyRound className="w-4 h-4" /> HMAC Signature
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          
          {/* Controls Card */}
          <div className="enterprise-card p-6 shadow-lg border-primary/10 relative overflow-hidden">
            {isProcessing && (
              <div className="absolute top-0 left-0 w-full h-1 bg-primary/20 overflow-hidden">
                <div className="h-full bg-primary animate-pulse w-1/3"></div>
              </div>
            )}
            
            <div className="mb-6 flex flex-wrap gap-6 items-end">
              
              {activeTab === "hash" && (
                <div className="flex-1 min-w-[200px] animate-in slide-in-from-right-4 duration-300">
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Hash Algorithm</label>
                  <select 
                    className="w-full h-11 px-4 rounded-lg bg-card border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-bold text-foreground"
                    value={hashAlgo}
                    onChange={(e) => setHashAlgo(e.target.value)}
                  >
                    <option value="MD5">MD5 (Legacy/Insecure)</option>
                    <option value="SHA-1">SHA-1 (Legacy/Insecure)</option>
                    <option value="SHA-256">SHA-256 (Standard)</option>
                    <option value="SHA-384">SHA-384</option>
                    <option value="SHA-512">SHA-512 (Secure)</option>
                  </select>
                </div>
              )}

              {activeTab === "encode" && (
                <>
                  <div className="flex-1 min-w-[200px] animate-in slide-in-from-right-4 duration-300">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Encoding Method</label>
                    <select 
                      className="w-full h-11 px-4 rounded-lg bg-card border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-bold text-foreground"
                      value={encAlgo}
                      onChange={(e) => setEncAlgo(e.target.value)}
                    >
                      <option value="base64">Base64</option>
                      <option value="url">URL Encoding</option>
                      <option value="hex">Hexadecimal</option>
                    </select>
                  </div>
                  <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border shrink-0 animate-in slide-in-from-right-4 duration-300">
                    <button
                      onClick={() => setEncMode("encode")}
                      className={cn(
                        "px-6 h-9 rounded-md text-sm font-bold transition-all",
                        encMode === "encode" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Encode
                    </button>
                    <button
                      onClick={() => setEncMode("decode")}
                      className={cn(
                        "px-6 h-9 rounded-md text-sm font-bold transition-all",
                        encMode === "decode" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Decode
                    </button>
                  </div>
                </>
              )}

              {activeTab === "hmac" && (
                <>
                  <div className="w-48 animate-in slide-in-from-right-4 duration-300">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Hash Algorithm</label>
                    <select 
                      className="w-full h-11 px-4 rounded-lg bg-card border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-bold text-foreground"
                      value={hashAlgo}
                      onChange={(e) => setHashAlgo(e.target.value)}
                    >
                      <option value="SHA-256">HMAC-SHA256</option>
                      <option value="SHA-512">HMAC-SHA512</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[200px] animate-in slide-in-from-right-4 duration-300">
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Secret Key</label>
                    <input 
                      type="text" 
                      className="w-full h-11 px-4 rounded-lg bg-card border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono text-foreground"
                      value={hmacSecret}
                      onChange={(e) => setHmacSecret(e.target.value)}
                      placeholder="Enter secret key..."
                    />
                  </div>
                </>
              )}

            </div>

            {/* Input Text Area */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" /> {encMode === "decode" && activeTab === "encode" ? "Encoded Input" : "Plaintext Input"}
                </label>
                <button 
                  onClick={() => setInputText("")}
                  className="text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                spellCheck={false}
                className="w-full h-40 p-4 bg-muted/20 border border-border rounded-lg text-foreground font-mono text-[13px] leading-relaxed resize-none outline-none focus:border-primary transition-all"
                placeholder="Type or paste text here..."
              />
            </div>
          </div>

          {/* Output Card */}
          <div className="enterprise-card p-6 shadow-lg bg-gradient-to-br from-card to-primary/5 border-primary/20">
            <div className="flex items-center justify-between mb-4">
              <label className="text-[11px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" /> Output Result
              </label>
              <button 
                onClick={copyToClipboard}
                disabled={!outputText}
                className="h-8 px-4 rounded bg-primary/10 hover:bg-primary text-primary hover:text-white text-[11px] font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy Result"}
              </button>
            </div>
            
            <div className="relative">
              <textarea
                value={outputText}
                readOnly
                className="w-full h-32 p-4 bg-black/40 border border-border/50 rounded-lg text-[#e2e8f0] font-mono text-[14px] leading-relaxed resize-none outline-none break-all"
                placeholder="Result will appear here..."
              />
            </div>
            
            <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-muted-foreground font-bold">
              <div>Length: <span className="text-foreground">{outputText.length}</span> chars</div>
              <div>Web Crypto API</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
