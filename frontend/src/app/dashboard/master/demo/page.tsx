"use client";

import React, { useState } from "react";
import { Play, Terminal, Database, Activity, RefreshCw, Layers, ShieldCheck, Zap, Loader2, Trash2, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { simulateTraffic, resetDatabase } from "@/lib/api";
import Swal from "sweetalert2";

export default function DemoSandboxPage() {
  const [simulating, setSimulating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [sessionLogs, setSessionLogs] = useState<any[]>([]);
  const [simulationCount, setSimulationCount] = useState(0);

  const handleSimulate = async () => {
    try {
      setSimulating(true);
      const res = await simulateTraffic();
      setSimulationCount((prev) => prev + 1);
      setSessionLogs((prev) => [
        {
          timestamp: new Date().toLocaleTimeString(),
          job: res.injected?.job || "N/A",
          records: res.injected?.metric_val || 0,
          log: res.injected?.log || res.message,
        },
        ...prev,
      ]);

      Swal.fire({
        title: "Traffic Injected",
        text: res.message,
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2500,
        background: "#1e293b",
        color: "#f8fafc",
        iconColor: "#10b981",
      });
    } catch (err) {
      Swal.fire({ title: "Simulation Failed", text: "Could not inject demo traffic.", icon: "error", background: "#1e293b", color: "#f8fafc" });
    } finally {
      setSimulating(false);
    }
  };

  const handleReset = async () => {
    const result = await Swal.fire({
      title: "Reset Sandbox?",
      text: "This will clear all demo simulation data, metrics, and injected jobs. Real configuration data will NOT be affected.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, Reset Everything",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#ef4444",
      background: "#1e293b",
      color: "#f8fafc",
    });

    if (!result.isConfirmed) return;

    try {
      setResetting(true);
      const res = await resetDatabase();
      setSessionLogs([]);
      setSimulationCount(0);
      Swal.fire({
        title: "Sandbox Reset",
        text: res.message,
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2500,
        background: "#1e293b",
        color: "#f8fafc",
        iconColor: "#10b981",
      });
    } catch (err) {
      Swal.fire({ title: "Reset Failed", text: "Could not reset sandbox data.", icon: "error", background: "#1e293b", color: "#f8fafc" });
    } finally {
      setResetting(false);
    }
  };

  const tools = [
    { label: "ETL Stress Test", icon: Activity, color: "text-blue-500", desc: "Inject simulated sync throughput data" },
    { label: "Query Simulator", icon: Terminal, color: "text-emerald-500", desc: "Generate mock query and log entries" },
    { label: "Schema Validator", icon: Database, color: "text-purple-500", desc: "Validate table structure integrity" },
    { label: "mTLS Handshake", icon: ShieldCheck, color: "text-pink-500", desc: "Test mutual TLS authentication" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-pink-500 rounded-full shadow-[0_0_12px_rgba(236,72,153,0.4)]" />
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Feature Sandbox</h1>
        </div>
        <p className="text-[12px] font-semibold text-muted-foreground/70 tracking-[0.05em] uppercase ml-4 border-l border-border/50 pl-4">
          Experimental environment to test synchronization logic and inject demo traffic.
        </p>
      </div>

      {/* Tool Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tools.map((tool, i) => (
          <button
            key={i}
            onClick={handleSimulate}
            disabled={simulating}
            className="premium-card p-6 group hover:scale-[1.03] transition-all cursor-pointer text-left active:scale-[0.98] disabled:opacity-60"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={cn("p-3 rounded-2xl bg-muted/40 border border-border group-hover:border-primary/30 transition-all", tool.color)}>
                <tool.icon className="w-6 h-6" />
              </div>
              <Zap className="w-4 h-4 text-muted-foreground/20 group-hover:text-amber-500 transition-colors" />
            </div>
            <p className="text-sm font-black text-foreground uppercase tracking-tight">{tool.label}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{tool.desc}</p>
          </button>
        ))}
      </div>

      {/* Active Simulations Panel */}
      <div className="premium-card p-10 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Simulation Console</h3>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">
                {simulationCount > 0 ? `${simulationCount} injection(s) this session` : "No simulations yet"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="px-5 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/25 rounded-xl transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {simulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {simulating ? "Injecting..." : "Simulate Traffic"}
            </button>
            <button
              onClick={handleReset}
              disabled={resetting}
              className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-500/25 rounded-xl transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Reset Sandbox
            </button>
          </div>
        </div>

        {/* Session Log Table */}
        {sessionLogs.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/20">
                  <th className="px-6 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Time</th>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Job ID</th>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Records</th>
                  <th className="px-6 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sessionLogs.slice(0, 10).map((entry, i) => (
                  <tr key={i} className="hover:bg-muted/10 transition-colors animate-in fade-in duration-300">
                    <td className="px-6 py-3 text-[11px] font-mono text-muted-foreground">{entry.timestamp}</td>
                    <td className="px-6 py-3 text-[11px] font-bold text-primary font-mono">{entry.job}</td>
                    <td className="px-6 py-3 text-[11px] font-bold text-foreground">{entry.records.toLocaleString()}</td>
                    <td className="px-6 py-3 text-[11px] text-muted-foreground truncate max-w-[300px]">{entry.log}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-[200px] bg-muted/10 rounded-2xl border border-border flex items-center justify-center flex-col gap-4">
            <BarChart3 className="w-12 h-12 text-muted-foreground/15" />
            <p className="text-[11px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">No active sessions</p>
            <p className="text-[10px] text-muted-foreground/30">Click &quot;Simulate Traffic&quot; to inject demo data into the dashboard</p>
          </div>
        )}
      </div>
    </div>
  );
}
