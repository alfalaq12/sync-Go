"use client";

import React, { useState } from "react";
import { Download, Server, Shield, CheckCircle2, Plus, Search, Loader2, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { runRemoteInstall, fetchNodes } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import Swal from "sweetalert2";

export default function RemoteInstallPage() {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("root");
  const [password, setPassword] = useState("");
  const [installing, setInstalling] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const { data: nodesData } = useQuery({
    queryKey: ["nodes"],
    queryFn: fetchNodes,
    refetchInterval: 10000,
  });

  const nodes = nodesData?.data || [];
  const filteredNodes = nodes.filter((n: any) =>
    (n.id?.toString() || "").toLowerCase().includes(search.toLowerCase()) ||
    (n.hostname || "").toLowerCase().includes(search.toLowerCase()) ||
    (n.node_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host) {
      Swal.fire({ title: "Error", text: "Please enter a target host.", icon: "error", background: "#1e293b", color: "#f8fafc" });
      return;
    }

    try {
      setInstalling(true);
      setLogs([]);
      const res = await runRemoteInstall({ host, port, username, password, mode: "full" });

      if (res.logs && Array.isArray(res.logs)) {
        // Stream logs with delay for dramatic effect
        for (let i = 0; i < res.logs.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 350));
          setLogs((prev) => [...prev, res.logs[i]]);
        }
      }

      Swal.fire({
        title: "Deployment Complete",
        text: "Sync-Go Agent has been successfully deployed to the target host.",
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        background: "#1e293b",
        color: "#f8fafc",
        iconColor: "#10b981",
      });
    } catch (err) {
      Swal.fire({ title: "Deployment Failed", text: "Could not complete remote installation. Check SSH credentials.", icon: "error", background: "#1e293b", color: "#f8fafc" });
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-primary rounded-full shadow-[0_0_12px_rgba(99,102,241,0.4)]" />
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Remote Installation</h1>
        </div>
        <p className="text-[12px] font-semibold text-muted-foreground/70 tracking-[0.05em] uppercase ml-4 border-l border-border/50 pl-4">
          Deploy and update sync-go agent binaries across the cluster via SSH.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column - Install Controls */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleInstall} className="premium-card p-8 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Installation Wizard</h3>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Master Ready</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">Target Host / IP</label>
                <input 
                  type="text" 
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="e.g. 192.168.1.50"
                  className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all placeholder:text-muted-foreground/40"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">SSH Port</label>
                <input 
                  type="text" 
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">SSH Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-muted-foreground uppercase tracking-widest ml-1">SSH Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all placeholder:text-muted-foreground/40"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={installing}
              className="w-full h-14 bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-70 disabled:active:scale-100"
            >
              {installing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Deploying Agent...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Initialize Deployment
                </>
              )}
            </button>
          </form>

          {/* Live Terminal Output */}
          {logs.length > 0 && (
            <div className="premium-card overflow-hidden animate-in fade-in duration-500">
              <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center gap-3">
                <Terminal className="w-4 h-4 text-emerald-500" />
                <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest">Deployment Terminal</h3>
              </div>
              <div className="bg-[#0a0f1a] p-6 max-h-[350px] overflow-y-auto premium-scrollbar font-mono text-[11px] space-y-1.5">
                {logs.map((line, i) => (
                  <p key={i} className={cn(
                    "animate-in fade-in slide-in-from-left-2 duration-300",
                    line.includes("[SUCCESS]") ? "text-emerald-400 font-bold" :
                    line.includes("[ERROR]") ? "text-red-400 font-bold" :
                    "text-muted-foreground/80"
                  )}>
                    {line}
                  </p>
                ))}
                {installing && (
                  <p className="text-primary animate-pulse">▌</p>
                )}
              </div>
            </div>
          )}

          {/* Node Status Table */}
          <div className="premium-card overflow-hidden">
            <div className="px-8 py-6 border-b border-border bg-muted/20 flex items-center justify-between">
              <h3 className="text-[12px] font-black text-foreground uppercase tracking-widest">Connected Nodes</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter nodes..."
                  className="bg-muted/40 border border-border rounded-lg pl-9 pr-4 py-1.5 text-[11px] font-medium text-foreground focus:outline-none focus:border-primary/50 w-48 transition-all"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/20">
                    <th className="px-8 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Node ID</th>
                    <th className="px-8 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Hostname</th>
                    <th className="px-8 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mode</th>
                    <th className="px-8 py-4 text-right text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredNodes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center text-muted-foreground/50 text-sm italic">No nodes registered.</td>
                    </tr>
                  ) : (
                    filteredNodes.map((node: any) => {
                      const isOnline = node.status?.toLowerCase() === "online";
                      return (
                        <tr key={node.id} className="hover:bg-muted/10 transition-colors group">
                          <td className="px-8 py-4 text-sm font-bold text-foreground/85 group-hover:text-primary transition-colors font-mono">{node.id}</td>
                          <td className="px-8 py-4 text-[12px] font-mono text-muted-foreground">{node.hostname || "—"}</td>
                          <td className="px-8 py-4 text-[11px] font-black text-muted-foreground/50 uppercase">{node.connection_mode || "DIRECT"}</td>
                          <td className="px-8 py-4 text-right">
                            <span className={cn(
                              "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                              isOnline ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                              "bg-muted/50 text-muted-foreground/50 border-border/50"
                            )}>
                              {node.status?.toUpperCase() || "OFFLINE"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column - Info */}
        <div className="space-y-6">
          <div className="premium-card p-6 space-y-6 border-primary/20">
            <div className="flex items-center gap-3 text-primary">
              <Shield className="w-5 h-5" />
              <h4 className="text-[12px] font-black uppercase tracking-widest">Security Policy</h4>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed font-medium">
              Remote installation requires SSH access and Master authorization. Ensure the target node has port 22 accessible for binary deployment.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500">
                <CheckCircle2 className="w-3 h-3" /> SHA-256 Checksum Verification
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500">
                <CheckCircle2 className="w-3 h-3" /> Signed Binaries Only
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500">
                <CheckCircle2 className="w-3 h-3" /> mTLS Encrypted Transport
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
