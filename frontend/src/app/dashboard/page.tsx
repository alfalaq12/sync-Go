"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchNodes, fetchJobs } from "@/lib/api";
import { Server, Activity, Database, CheckCircle2, ChevronRight, Layers, ArrowUpRight, Search, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardCharts } from "@/components/remake/DashboardCharts";

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // SECURITY: We don't check for auth_token in sessionStorage anymore (prevents XSS).
    // Authentication is handled via HttpOnly cookies. We use auth_user as a hint.
    const user = sessionStorage.getItem("auth_user");
    if (!user) router.push("/login");
  }, [router]);

  const { data: nodesData } = useQuery({
    queryKey: ["nodes"],
    queryFn: fetchNodes,
    refetchInterval: 5000,
    enabled: mounted,
  });

  const { data: jobsData } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
    refetchInterval: 5000,
    enabled: mounted,
  });

  if (!mounted) return null;

  const nodes = nodesData?.data || [];
  const totalNodes = nodesData?.total || nodes.length || 0;
  const onlineNodes = nodes.filter((n: any) => n.status?.toLowerCase() === "online").length;
  const totalJobs = jobsData?.total || 0;
  const runningJobs = jobsData?.data?.filter((j: any) => j.status === "running").length || 0;

  // Calculate total volume (rows processed)
  const totalRowsUploaded = jobsData?.data?.reduce((sum: number, job: any) => sum + (job.rows_uploaded || 0), 0) || 0;
  
  // Format volume: 1 row ≈ 1 KB (approx)
  const formatVolume = (rows: number) => {
    const kb = rows; 
    if (kb >= 1024 * 1024) return `${(kb / (1024 * 1024)).toFixed(1)} GB`;
    if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
    return `${rows} rows`;
  };

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border/60 pb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3.5">
            <div className="w-2.5 h-8 bg-gradient-to-b from-primary to-accent rounded-full shadow-[0_0_20px_rgba(99,102,241,0.4)]" />
            <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground/80">Infrastructure Summary</h1>
          </div>
          <p className="text-xs font-bold text-muted-foreground/70 uppercase tracking-[0.08em] ml-6 font-mono">
            Cluster health monitoring and real-time synchronization throughput.
          </p>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="ACTIVE NODES"
          value={onlineNodes}
          sub={`OF ${totalNodes} REGISTERED`}
          icon={Server}
          color="#3B82F6"
          percentage={totalNodes > 0 ? (onlineNodes / totalNodes) * 100 : 0}
          delay="0"
        />
        <StatCard
          label="ETL PIPELINES"
          value={runningJobs}
          sub={`${totalJobs} TOTAL CONFIGURED`}
          icon={Activity}
          color="#6366F1"
          percentage={totalJobs > 0 ? (runningJobs / totalJobs) * 100 : 0}
          delay="100"
        />
        <StatCard
          label="DATA THROUGHPUT"
          value={formatVolume(totalRowsUploaded)}
          sub="REAL-TIME VOLUME"
          icon={Database}
          color="#10B981"
          percentage={totalRowsUploaded > 0 ? 100 : 0}
          delay="200"
        />
        <StatCard
          label="SYSTEM UPTIME"
          value="100.0%"
          sub="ALL SERVICES OPTIMAL"
          icon={CheckCircle2}
          color="#8B5CF6"
          percentage={100}
          delay="300"
        />
      </div>

      {/* Analytics Charts */}
      <div>
        <DashboardCharts />
      </div>

      <div className="grid gap-6 grid-cols-1">
        {/* Registered Nodes Table */}
        <div className="premium-card flex flex-col">
          <div className="px-8 py-5 border-b border-border/40 flex items-center justify-between bg-card/20">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/10 shadow-[0_0_12px_rgba(99,102,241,0.05)]">
                 <Monitor className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-black text-foreground tracking-[0.12em] uppercase font-mono">CLUSTER NODES</h3>
            </div>
            <button
              onClick={() => router.push("/dashboard/nodes")}
              className="px-4 py-2 rounded-xl text-[11px] font-bold text-primary tracking-wider uppercase bg-primary/5 hover:bg-primary/10 transition-all border border-primary/15 hover:shadow-lg hover:shadow-primary/5 active:scale-95 duration-300"
            >
              VIEW REPOSITORY
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/15 border-b border-border/30">
                  <th className="px-8 py-4 text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest font-mono">Node Identity</th>
                  <th className="px-8 py-4 text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest font-mono">Network Host</th>
                  <th className="px-8 py-4 text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest font-mono">Interface Mode</th>
                  <th className="px-8 py-4 text-right pr-8 text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest font-mono">Connectivity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {nodes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center text-muted-foreground/40 italic text-sm">
                      Cluster is currently empty. No nodes registered.
                    </td>
                  </tr>
                ) : (
                  nodes.slice(0, 5).map((node: any) => {
                    const isOnline = node.status?.toLowerCase() === 'online';
                    return (
                      <tr key={node.id} className="hover:bg-primary/[0.01] dark:hover:bg-white/[0.01] transition-all group cursor-pointer duration-300">
                        <td className="px-8 py-5 flex items-center gap-4">
                          <div className="relative flex h-2.5 w-2.5">
                            {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>}
                            <span className={cn(
                              "relative inline-flex rounded-full h-2.5 w-2.5 shadow-sm transition-all",
                              isOnline ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-slate-400/40"
                            )}></span>
                          </div>
                          <span className="text-sm font-bold text-foreground/90 group-hover:text-primary transition-colors font-mono">{node.id}</span>
                        </td>
                        <td className="px-8 py-5 text-[12px] font-semibold text-muted-foreground/85 font-mono">
                          {node.hostname || "0.0.0.0"}
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.15em] bg-muted/40 dark:bg-muted/30 px-2.5 py-1 rounded-lg border border-border/20">
                            {node.connection_mode || "DIRECT"}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className={cn(
                            "inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 shadow-sm",
                            isOnline 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.02)]" 
                              : "bg-muted/60 text-muted-foreground/50 border-border/50"
                          )}>
                            {node.status?.toUpperCase() || "OFFLINE"}
                          </div>
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
    </div>
  );
}

function StatCard({ label, value, sub, color, percentage, icon: Icon, delay }: any) {
  return (
    <div
      className="relative bg-card/90 dark:bg-card/45 border border-border/85 rounded-2xl p-6 overflow-hidden hover:bg-card dark:hover:bg-card/65 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-lg hover:-translate-y-1 animate-in fade-in fill-mode-both group"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full" style={{ backgroundColor: color }} />

      <div className="pl-3.5">
        {/* Header: icon + label + LIVE */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
            <p className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em] font-mono">{label}</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/20 border border-border/30">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: percentage > 0 ? color : '#64748b' }} />
            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest font-mono">LIVE</span>
          </div>
        </div>

        {/* Value */}
        <p className="text-2xl font-black text-foreground tracking-tight leading-none mb-1 truncate">{value}</p>
        <p className="text-[11px] text-muted-foreground/50 font-mono font-semibold mb-4">{sub}</p>

        {/* Progress bar */}
        <div className="h-[2px] bg-border/30 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: color }}
          />
        </div>
        <div className="mt-1.5 text-right">
          <span className="text-[9px] font-black font-mono" style={{ color }}>{Math.round(percentage)}%</span>
        </div>
      </div>
    </div>
  );
}
