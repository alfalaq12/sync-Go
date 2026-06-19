"use client";

import React, { useState } from "react";
import { Share2, ArrowRight, Server, Database, Shield, AlertTriangle, CheckCircle2, RefreshCw, Activity, Loader2, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { runHostMigration } from "@/lib/api";
import Swal from "sweetalert2";

export default function HostMigrationPage() {
  const [step, setStep] = useState(1);
  const [targetHost, setTargetHost] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [migrateSSL, setMigrateSSL] = useState(true);
  const [dryRun, setDryRun] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const handleMigrate = async () => {
    if (!targetHost) {
      Swal.fire({ title: "Error", text: "Please enter a target host address.", icon: "error", background: "#1e293b", color: "#f8fafc" });
      return;
    }

    const confirm = await Swal.fire({
      title: dryRun ? "Start Dry Run?" : "⚠️ Start LIVE Migration?",
      html: dryRun
        ? `<p class="text-sm">This will simulate migration to <strong>${targetHost}</strong> without making any actual changes.</p>`
        : `<p class="text-sm text-red-400">This will perform a LIVE migration to <strong>${targetHost}</strong>. All data will be transferred and local master keys will be revoked.</p>`,
      icon: dryRun ? "question" : "warning",
      showCancelButton: true,
      confirmButtonText: dryRun ? "Run Simulation" : "Proceed with Migration",
      confirmButtonColor: dryRun ? "#4f46e5" : "#ef4444",
      background: "#1e293b",
      color: "#f8fafc",
    });

    if (!confirm.isConfirmed) return;

    try {
      setMigrating(true);
      setLogs([]);
      setStep(2);

      const res = await runHostMigration({
        target_host: targetHost,
        auth_token: authToken,
        migrate_ssl: migrateSSL,
        dry_run: dryRun,
      });

      if (res.logs && Array.isArray(res.logs)) {
        for (let i = 0; i < res.logs.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          setLogs((prev) => [...prev, res.logs[i]]);

          // Move to step 3 when we get halfway
          if (i === Math.floor(res.logs.length / 2)) {
            setStep(3);
          }
        }
      }

      Swal.fire({
        title: dryRun ? "Dry Run Complete" : "Migration Complete",
        text: dryRun ? "Simulation finished successfully. No changes were made." : "Host migration finalized. Local master is now in replication-slave mode.",
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        background: "#1e293b",
        color: "#f8fafc",
        iconColor: "#10b981",
      });
    } catch (err) {
      Swal.fire({ title: "Migration Failed", text: "Could not complete migration. Check connectivity and credentials.", icon: "error", background: "#1e293b", color: "#f8fafc" });
    } finally {
      setMigrating(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setLogs([]);
    setTargetHost("");
    setAuthToken("");
    setMigrateSSL(true);
    setDryRun(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-amber-500 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.4)]" />
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Host Migration</h1>
        </div>
        <p className="text-[12px] font-semibold text-muted-foreground/70 tracking-[0.05em] uppercase ml-4 border-l border-border/50 pl-4">
          Safely migrate master workloads and database connections to a new host.
        </p>
      </div>

      {/* Migration Wizard Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { s: 1, title: "Source & Target", icon: Server },
          { s: 2, title: "Data Transfer", icon: Shield },
          { s: 3, title: "Finalize Cutover", icon: Activity },
        ].map((item) => (
          <div
            key={item.s}
            className={cn(
              "premium-card p-4 flex items-center gap-4 transition-all duration-500",
              step >= item.s ? "border-primary/40" : "opacity-40"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-black shadow-lg transition-all",
              step >= item.s ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            )}>
              {step > item.s ? <CheckCircle2 className="w-4 h-4" /> : <item.icon className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Step 0{item.s}</p>
              <p className="text-sm font-bold text-foreground tracking-tight">{item.title}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Migration Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <div className="premium-card p-10 space-y-10">
            
            {/* Source & Target Visual */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-12">
              {/* Source Node */}
              <div className="flex-1 w-full space-y-4 text-center group">
                <div className="relative mx-auto w-24 h-24 rounded-3xl bg-muted/30 border border-border flex items-center justify-center group-hover:border-primary/40 transition-all duration-500">
                  <Server className="w-10 h-10 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Source Node</p>
                  <p className="text-lg font-black text-foreground">Current Master</p>
                  <p className="text-[11px] font-mono text-muted-foreground">localhost</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex flex-col items-center gap-4">
                <div className={cn(
                  "w-16 h-16 rounded-full bg-muted/20 border border-border flex items-center justify-center transition-all",
                  migrating && "animate-pulse border-primary/40"
                )}>
                  <ArrowRight className="w-6 h-6 text-primary" />
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-[0.2em]",
                  migrating ? "text-primary animate-pulse" : "text-muted-foreground/40"
                )}>
                  {migrating ? "Migrating..." : "Ready"}
                </span>
              </div>

              {/* Target Node */}
              <div className="flex-1 w-full space-y-4 text-center group">
                <div className="relative mx-auto w-24 h-24 rounded-3xl bg-muted/20 border border-dashed border-border flex items-center justify-center group-hover:border-emerald-500/40 transition-all duration-500">
                  <Server className="w-10 h-10 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Target Node</p>
                  {targetHost ? (
                    <p className="text-lg font-black text-foreground">{targetHost}</p>
                  ) : (
                    <p className="text-sm font-bold text-muted-foreground/40 italic">Enter target below...</p>
                  )}
                </div>
              </div>
            </div>

            {/* Configuration Form */}
            <div className="space-y-6 pt-8 border-t border-border/40">
              <h4 className="text-[11px] font-black text-foreground uppercase tracking-widest">Migration Parameters</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Target Host Address</label>
                  <input
                    type="text"
                    value={targetHost}
                    onChange={(e) => setTargetHost(e.target.value)}
                    placeholder="e.g. new-master.company.com"
                    className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all placeholder:text-muted-foreground/40 font-mono"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Authorization Token</label>
                  <input
                    type="password"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all placeholder:text-muted-foreground/40"
                  />
                </div>
              </div>

              {/* Toggle Options */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border">
                  <div>
                    <p className="text-sm font-bold text-foreground">Migrate SSL Certificates</p>
                    <p className="text-[11px] text-muted-foreground">Copy local certificate stores to the target host.</p>
                  </div>
                  <div
                    onClick={() => setMigrateSSL(!migrateSSL)}
                    className={cn("w-12 h-6 rounded-full relative p-1 cursor-pointer transition-all duration-300", migrateSSL ? "bg-primary" : "bg-muted-foreground/30")}
                  >
                    <div className={cn("w-4 h-4 rounded-full bg-white transition-all duration-300", migrateSSL && "ml-6")} />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                  <div>
                    <p className="text-sm font-bold text-foreground">Dry Run Mode</p>
                    <p className="text-[11px] text-muted-foreground">Simulate migration without applying any changes.</p>
                  </div>
                  <div
                    onClick={() => setDryRun(!dryRun)}
                    className={cn("w-12 h-6 rounded-full relative p-1 cursor-pointer transition-all duration-300", dryRun ? "bg-amber-500" : "bg-muted-foreground/30")}
                  >
                    <div className={cn("w-4 h-4 rounded-full bg-white transition-all duration-300", dryRun && "ml-6")} />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleMigrate}
                disabled={migrating}
                className={cn(
                  "flex-1 h-14 font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100",
                  dryRun
                    ? "bg-primary text-primary-foreground shadow-primary/20 hover:scale-[1.02]"
                    : "bg-red-600 text-white shadow-red-600/20 hover:bg-red-700"
                )}
              >
                {migrating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {dryRun ? "Simulating..." : "Migrating..."}
                  </>
                ) : (
                  <>
                    <Activity className="w-5 h-5" />
                    {dryRun ? "Start Dry Run" : "Start Live Migration"}
                  </>
                )}
              </button>
              {logs.length > 0 && (
                <button
                  onClick={resetWizard}
                  className="h-14 px-6 bg-muted/40 hover:bg-muted/60 border border-border text-foreground font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Live Terminal */}
          {logs.length > 0 && (
            <div className="premium-card overflow-hidden animate-in fade-in duration-500">
              <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center gap-3">
                <Terminal className="w-4 h-4 text-amber-500" />
                <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest">Migration Terminal</h3>
                <span className="text-[9px] font-bold text-muted-foreground ml-auto font-mono">{logs.length} step(s)</span>
              </div>
              <div className="bg-[#0a0f1a] p-6 max-h-[350px] overflow-y-auto premium-scrollbar font-mono text-[11px] space-y-1.5">
                {logs.map((line, i) => (
                  <p key={i} className={cn(
                    "animate-in fade-in slide-in-from-left-2 duration-300",
                    line.includes("[SUCCESS]") ? "text-emerald-400 font-bold" :
                    line.includes("[DRY-RUN]") ? "text-amber-400 font-bold" :
                    line.includes("[ERROR]") ? "text-red-400 font-bold" :
                    "text-muted-foreground/80"
                  )}>
                    {line}
                  </p>
                ))}
                {migrating && <p className="text-primary animate-pulse">▌</p>}
              </div>
            </div>
          )}
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          <div className="premium-card p-6 space-y-6 border-amber-500/20">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="text-[12px] font-black uppercase tracking-widest">Migration Alert</h4>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed font-medium">
              Host migration will temporarily pause all active synchronization jobs on the source node. Ensure you have a recent backup of the master database before proceeding with a live migration.
            </p>
          </div>

          <div className="premium-card p-6 space-y-4">
            <h4 className="text-[12px] font-black text-foreground uppercase tracking-widest">Health Indicators</h4>
            {[
              { label: "Connection Speed", val: "940 Mbps", color: "text-emerald-500" },
              { label: "Latency", val: "2.4 ms", color: "text-emerald-500" },
              { label: "Disk Space", val: "84% Free", color: "text-emerald-500" },
              { label: "Active Jobs", val: "0 Running", color: "text-amber-500" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-[11px] font-bold text-muted-foreground">{item.label}</span>
                <span className={cn("text-[11px] font-black", item.color)}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
