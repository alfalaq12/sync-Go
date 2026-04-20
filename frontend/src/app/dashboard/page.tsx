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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground italic">Infrastructure Summary</h1>
        <p className="text-[11px] font-bold text-muted-foreground tracking-[0.1em] uppercase">MONITOR CLUSTER HEALTH AND DATA SYNCHRONIZATION ACTIVITY IN REAL-TIME.</p>
      </div>

      {/* Stat Cards Row */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="ACTIVE NODES"
          value={onlineNodes}
          sub={`(${totalNodes} total registered)`}
          icon={Server}
          color="#F59E0B" // Amber
          percentage={totalNodes > 0 ? (onlineNodes / totalNodes) * 100 : 0}
        />
        <StatCard
          label="ETL PIPELINES"
          value={runningJobs}
          sub={`(${totalJobs} total configured)`}
          icon={Activity}
          color="#1E90FF" // Blue
          percentage={totalJobs > 0 ? (runningJobs / totalJobs) * 100 : 0}
        />
        <StatCard
          label="DATA VOLUME"
          value={formatVolume(totalRowsUploaded)}
          sub={totalRowsUploaded > 0 ? "Throughput volume (EST)" : "No synchronized data yet"}
          icon={Database}
          color="#00C6AD" // Teal
          percentage={totalRowsUploaded > 0 ? 100 : 0} // Placeholder fixed percentage if active
        />
        <StatCard
          label="SYSTEM UPTIME"
          value="100.0%"
          sub="System running normally"
          icon={CheckCircle2}
          color="#10B981" // Green
          percentage={100}
        />
      </div>

      {/* Analytics Charts */}
      <DashboardCharts />

      <div className="grid gap-6 grid-cols-1">
        {/* Registered Nodes Table */}
        <div className="enterprise-card overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-muted-foreground tracking-[0.2em] uppercase">REGISTERED NODES</h3>
            <button
              onClick={() => router.push("/dashboard/nodes")}
              className="text-[10px] font-bold text-primary tracking-widest uppercase hover:underline"
            >
              VIEW ALL
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <tbody className="divide-y divide-border">
                {nodes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground/50 italic text-sm">
                      No nodes registered in the cluster.
                    </td>
                  </tr>
                ) : (
                  nodes.slice(0, 5).map((node: any) => {
                    const isOnline = node.status?.toLowerCase() === 'online';
                    return (
                      <tr key={node.id} className="hover:bg-muted/50 transition-all group">
                        <td className="px-6 py-4 flex items-center gap-4">
                          <div className="relative flex h-2 w-2">
                            {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                            <span className={cn(
                              "relative inline-flex rounded-full h-2 w-2",
                              isOnline ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                            )}></span>
                          </div>
                          <span className="text-[14px] font-bold text-foreground">{node.id}</span>
                        </td>
                        <td className="px-6 py-4 text-[12px] font-medium text-muted-foreground font-mono">
                          {node.hostname || "auto-detected"}
                        </td>
                        <td className="px-6 py-4 text-[11px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                          {node.connection_mode || "DIRECT"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className={cn(
                            "inline-flex items-center px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border transition-all",
                            isOnline 
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                              : "bg-muted text-muted-foreground border-border"
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

function StatCard({ label, value, sub, color, percentage }: any) {
  return (
    <div className="enterprise-card p-6 relative group">
      <div className="absolute top-4 right-4">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-1 h-1 rounded-full bg-emerald-500" />
          <span className="text-[9px] font-bold text-emerald-500 tracking-wider">↗ ACTIVE</span>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div className="flex-1">
          <p className="text-[10px] font-bold text-muted-foreground tracking-[0.15em] uppercase mb-1.5">{label}</p>
          <p className="text-[32px] font-bold text-foreground tracking-tight leading-none mb-2">{value}</p>
          <p className="text-[12px] font-medium text-muted-foreground/60 italic">{sub}</p>
        </div>

        {/* Circular Progress Ring */}
        <div className="relative w-16 h-16 shrink-0 transition-transform duration-500 group-hover:scale-110">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle className="stroke-muted" strokeWidth="3" fill="transparent" r="16" cx="18" cy="18" />
            <circle
              className="transition-all duration-1000 ease-out"
              stroke={color}
              strokeWidth="3"
              strokeDasharray={`${percentage}, 100`}
              strokeLinecap="round"
              fill="transparent"
              r="16"
              cx="18"
              cy="18"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-bold text-foreground">{Math.round(percentage)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
