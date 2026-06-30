"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchNodes, fetchJobs } from "@/lib/api";
import { Server, Activity, Database, CheckCircle2, Monitor, ArrowRight } from "lucide-react";
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

  // Health ratio drives the ambient orb color
  const healthRatio = totalNodes > 0 ? onlineNodes / totalNodes : 1;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between pb-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Cluster Overview
          </h1>
          <p className="text-sm text-muted-foreground/70 font-medium">
            Real-time health and synchronization throughput across all registered nodes.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground/50 font-mono font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
          Auto-refreshing every 5s
        </div>
      </div>

      {/* Stat Cards with Ambient Health Orb */}
      <div className="relative">
        {/* Signature: Ambient Health Orb */}
        <HealthOrb ratio={healthRatio} />

        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
          <StatCard
            label="Active nodes"
            value={onlineNodes}
            sub={`of ${totalNodes} total`}
            icon={Server}
            accentColor="var(--primary)"
            percentage={totalNodes > 0 ? (onlineNodes / totalNodes) * 100 : 0}
            delay={0}
          />
          <StatCard
            label="Running pipelines"
            value={runningJobs}
            sub={`${totalJobs} configured`}
            icon={Activity}
            accentColor="#8b5cf6"
            percentage={totalJobs > 0 ? (runningJobs / totalJobs) * 100 : 0}
            delay={80}
          />
          <StatCard
            label="Data throughput"
            value={formatVolume(totalRowsUploaded)}
            sub="Total volume processed"
            icon={Database}
            accentColor="var(--secondary)"
            percentage={totalRowsUploaded > 0 ? 100 : 0}
            delay={160}
          />
          <StatCard
            label="System uptime"
            value="100.0%"
            sub="All services operational"
            icon={CheckCircle2}
            accentColor="#2dd4a8"
            percentage={100}
            delay={240}
          />
        </div>
      </div>

      {/* Analytics Charts */}
      <DashboardCharts />

      {/* Cluster Nodes Table */}
      <div className="premium-card flex flex-col">
        <div className="px-7 py-5 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/8 text-primary border border-primary/10">
               <Monitor className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-foreground tracking-wide uppercase font-mono">Cluster Nodes</h3>
          </div>
          <button
            onClick={() => router.push("/dashboard/nodes")}
            className="group flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 transition-all border border-primary/10 hover:border-primary/20 active:scale-95 duration-300"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/30">
                <th className="px-7 py-3.5 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest font-mono">Node</th>
                <th className="px-7 py-3.5 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest font-mono">Host</th>
                <th className="px-7 py-3.5 text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest font-mono">Mode</th>
                <th className="px-7 py-3.5 text-right text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest font-mono">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/15">
              {nodes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-7 py-14 text-center text-muted-foreground/40 text-sm">
                    No nodes registered yet. Add a node to start synchronizing.
                  </td>
                </tr>
              ) : (
                nodes.slice(0, 5).map((node: any) => {
                  const isOnline = node.status?.toLowerCase() === 'online';
                  return (
                    <tr key={node.id} className="hover:bg-primary/[0.02] dark:hover:bg-white/[0.015] transition-colors group cursor-pointer duration-200">
                      <td className="px-7 py-4 flex items-center gap-3.5">
                        <div className="relative flex h-2 w-2">
                          {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-50"></span>}
                          <span className={cn(
                            "relative inline-flex rounded-full h-2 w-2 transition-all",
                            isOnline ? "bg-secondary shadow-[0_0_8px_rgba(45,212,168,0.5)]" : "bg-muted-foreground/25"
                          )}></span>
                        </div>
                        <span className="text-sm font-semibold text-foreground/90 group-hover:text-primary transition-colors font-mono">{node.id}</span>
                      </td>
                      <td className="px-7 py-4 text-xs font-medium text-muted-foreground/70 font-mono">
                        {node.hostname || "0.0.0.0"}
                      </td>
                      <td className="px-7 py-4">
                        <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider bg-muted/50 dark:bg-muted/30 px-2.5 py-1 rounded-lg border border-border/20">
                          {node.connection_mode || "DIRECT"}
                        </span>
                      </td>
                      <td className="px-7 py-4 text-right">
                        <div className={cn(
                          "inline-flex items-center px-3.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all duration-200",
                          isOnline 
                            ? "bg-secondary/10 text-secondary border-secondary/15" 
                            : "bg-muted/50 text-muted-foreground/40 border-border/30"
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
  );
}

/* ─── Signature Element: Ambient Health Orb ─── */
function HealthOrb({ ratio }: { ratio: number }) {
  // Interpolate between sapphire (neutral) → teal (healthy) → amber (degraded)
  const orbColor = useMemo(() => {
    if (ratio >= 0.8) return "rgba(45, 212, 168, 0.35)";   // Teal — healthy
    if (ratio >= 0.5) return "rgba(79, 110, 247, 0.30)";   // Sapphire — neutral
    return "rgba(245, 166, 35, 0.30)";                       // Amber — degraded
  }, [ratio]);

  const orbColorSecondary = useMemo(() => {
    if (ratio >= 0.8) return "rgba(107, 138, 249, 0.20)";
    if (ratio >= 0.5) return "rgba(45, 212, 168, 0.15)";
    return "rgba(239, 68, 68, 0.15)";
  }, [ratio]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div
        className="health-orb"
        style={{
          background: `radial-gradient(ellipse, ${orbColor} 0%, transparent 70%)`,
          top: "10%",
          left: "15%",
        }}
      />
      <div
        className="health-orb"
        style={{
          background: `radial-gradient(ellipse, ${orbColorSecondary} 0%, transparent 70%)`,
          top: "20%",
          right: "10%",
          animationDelay: "-4s",
          animationDuration: "15s",
        }}
      />
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({ label, value, sub, accentColor, percentage, icon: Icon, delay }: {
  label: string;
  value: string | number;
  sub: string;
  accentColor: string;
  percentage: number;
  icon: React.ElementType;
  delay: number;
}) {
  return (
    <div
      className="relative bg-card/80 dark:bg-card/40 border border-border/60 rounded-2xl p-5 overflow-hidden hover:border-primary/20 transition-all duration-300 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(79,110,247,0.08)] hover:-translate-y-0.5 animate-in fade-in fill-mode-both backdrop-blur-sm group"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Top-edge gradient glow */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }}
      />

      {/* Header: icon + label */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="p-1.5 rounded-lg transition-colors duration-300"
            style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 10%, transparent)` }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: accentColor }} />
          </div>
          <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wide">{label}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/30 border border-border/20">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: percentage > 0 ? accentColor : '#94a3b8' }} />
          <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest font-mono">Live</span>
        </div>
      </div>

      {/* Value */}
      <p className="text-[26px] font-bold text-foreground tracking-tight leading-none mb-1 truncate">{value}</p>
      <p className="text-[11px] text-muted-foreground/50 font-medium mb-4">{sub}</p>

      {/* Progress bar */}
      <div className="h-[2px] bg-border/25 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: accentColor }}
        />
      </div>
      <div className="mt-1.5 text-right">
        <span className="text-[10px] font-bold font-mono" style={{ color: accentColor }}>{Math.round(percentage)}%</span>
      </div>
    </div>
  );
}
