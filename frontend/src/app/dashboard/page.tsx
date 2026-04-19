"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchNodes, fetchJobs } from "@/lib/api";
import { Server, Activity, Database, CheckCircle2, ChevronRight, Layers, ArrowUpRight, Search, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = sessionStorage.getItem("auth_token");
    if (!token) router.push("/login");
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold tracking-tight text-[#0F172A] italic">Ringkasan Infrastruktur</h1>
        <p className="text-[11px] font-bold text-[#64748B] tracking-[0.1em] uppercase">PANTAU KESEHATAN CLUSTER DAN AKTIVITAS SINKRONISASI DATA SECARA REAL-TIME.</p>
      </div>

      {/* Stat Cards Row */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="NODE AKTIF"
          value={onlineNodes}
          sub={`(${totalNodes} total terdaftar)`}
          icon={Server}
          color="#F59E0B" // Amber
          percentage={totalNodes > 0 ? (onlineNodes / totalNodes) * 100 : 0}
        />
        <StatCard
          label="PIPELINE ETL"
          value={runningJobs}
          sub={`(${totalJobs} total dikonfigurasi)`}
          icon={Activity}
          color="#1E90FF" // Blue
          percentage={totalJobs > 0 ? (runningJobs / totalJobs) * 100 : 0}
        />
        <StatCard
          label="VOLUME DATA"
          value="0 B"
          sub="Belum ada data sinkron"
          icon={Database}
          color="#00C6AD" // Teal
          percentage={0}
        />
        <StatCard
          label="UPTIME SISTEM"
          value="100.0%"
          sub="Sistem berjalan normal"
          icon={CheckCircle2}
          color="#10B981" // Green
          percentage={100}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* Quick Links */}
        <div className="enterprise-card p-6 bg-white flex flex-col h-full">
          <h3 className="text-[10px] font-bold text-[#64748B] tracking-[0.2em] uppercase mb-6">MENU CEPAT</h3>
          <div className="flex flex-col gap-2">
            {[
              { name: "Node Management", path: "/dashboard/nodes" },
              { name: "ETL Job Scheduler", path: "/dashboard/jobs" },
              { name: "Schema Definitions", path: "/dashboard/schema" },
              { name: "Network Topology", path: "/dashboard/network" },
              { name: "System Logs", path: "/dashboard/logs" },
            ].map((link, i) => (
              <button
                key={i}
                onClick={() => router.push(link.path)}
                className="flex items-center justify-between group p-3 rounded-lg border border-transparent hover:border-[#E2E8F0] hover:bg-[#F8FAFC] transition-all"
              >
                <span className="text-[13px] font-semibold text-[#0F172A] group-hover:text-[#1E90FF] transition-colors">{link.name}</span>
                <ChevronRight className="w-4 h-4 text-[#94A3B8] transition-all group-hover:translate-x-1 group-hover:text-[#1E90FF]" />
              </button>
            ))}
          </div>
        </div>

        {/* Registered Nodes Table */}
        <div className="enterprise-card bg-white overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-[#64748B] tracking-[0.2em] uppercase">NODE TERDAFTAR</h3>
            <button
              onClick={() => router.push("/dashboard/nodes")}
              className="text-[10px] font-bold text-[#1E90FF] tracking-widest uppercase hover:underline"
            >
              LIHAT SEMUA
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <tbody className="divide-y divide-[#E2E8F0]">
                {nodes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-[#94A3B8] italic text-sm">
                      No nodes registered in the cluster.
                    </td>
                  </tr>
                ) : (
                  nodes.slice(0, 5).map((node: any) => {
                    const isOnline = node.status?.toLowerCase() === 'online';
                    return (
                      <tr key={node.id} className="hover:bg-[#F8FAFC]/50 transition-all group">
                        <td className="px-6 py-4 flex items-center gap-4">
                          <div className="relative flex h-2 w-2">
                            {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                            <span className={cn(
                              "relative inline-flex rounded-full h-2 w-2",
                              isOnline ? "bg-emerald-500" : "bg-slate-300"
                            )}></span>
                          </div>
                          <span className="text-[14px] font-bold text-[#0F172A]">{node.id}</span>
                        </td>
                        <td className="px-6 py-4 text-[12px] font-medium text-[#64748B] font-mono">
                          {node.hostname || "auto-detected"}
                        </td>
                        <td className="px-6 py-4 text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">
                          {node.connection_mode || "DIRECT"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className={cn(
                            "inline-flex items-center px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border",
                            isOnline ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
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
    <div className="enterprise-card p-6 bg-white relative group">
      <div className="absolute top-4 right-4">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-100">
          <div className="w-1 h-1 rounded-full bg-emerald-500" />
          <span className="text-[9px] font-bold text-emerald-700 tracking-wider">↗ ACTIVE</span>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div className="flex-1">
          <p className="text-[10px] font-bold text-[#64748B] tracking-[0.15em] uppercase mb-1.5">{label}</p>
          <p className="text-[32px] font-bold text-[#0F172A] tracking-tight leading-none mb-2">{value}</p>
          <p className="text-[12px] font-medium text-[#94A3B8] italic">{sub}</p>
        </div>

        {/* Circular Progress Ring */}
        <div className="relative w-16 h-16 shrink-0 transition-transform duration-500 group-hover:scale-110">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle className="stroke-[#F1F5F9]" strokeWidth="3" fill="transparent" r="16" cx="18" cy="18" />
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
            <span className="text-[11px] font-bold text-[#0F172A]">{Math.round(percentage)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
