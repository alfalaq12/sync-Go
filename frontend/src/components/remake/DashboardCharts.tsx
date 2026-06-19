"use client";

import React, { useMemo } from "react";
import { useTheme } from "next-themes";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, Cell 
} from "recharts";
import { Activity, Database, Cpu, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";

import { useQuery } from "@tanstack/react-query";
import { fetchMetrics, fetchVolumeHistory } from "@/lib/api";

export function DashboardCharts() {
  const { theme, resolvedTheme } = useTheme();
  const [vRange, setVRange] = React.useState<"24h" | "7d" | "30d">("30d");
  const [rRange, setRRange] = React.useState<"24h" | "7d" | "30d">("24h");

  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ["stats", "metrics", rRange],
    queryFn: () => fetchMetrics(rRange),
    refetchInterval: 60000, // Sync with collector interval
  });

  const { data: volumeData, isLoading: volumeLoading } = useQuery({
    queryKey: ["stats", "volume", vRange],
    queryFn: () => fetchVolumeHistory(vRange),
    refetchInterval: 300000, // Less frequent for history
  });
  
  const colors = useMemo(() => {
    const isDark = (theme === "dark" || (theme === "system" && resolvedTheme === "dark"));
    return {
      grid: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
      text: isDark ? "#64748b" : "#94a3b8",
      primary: isDark ? "#3b82f6" : "#2563eb",
      primaryLight: isDark ? "rgba(59, 130, 246, 0.4)" : "rgba(37, 99, 235, 0.3)",
      emerald: isDark ? "#10b981" : "#059669",
      emeraldLight: isDark ? "rgba(16, 185, 129, 0.4)" : "rgba(5, 150, 105, 0.3)",
      tooltipBg: isDark ? "#1e293b" : "#ffffff",
      tooltipBorder: isDark ? "#334155" : "#e2e8f0"
    };
  }, [theme, resolvedTheme]);

  // Dynamic data generation based on range
  const getVolumeData = () => {
    return volumeData || [];
  };

  const getResourceData = () => {
    return metricsData || [];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0F172A] border border-white/10 p-4 rounded-2xl shadow-2xl">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 border-b border-white/5 pb-2">
            Time: {label}
          </p>
          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.4)]" style={{ backgroundColor: entry.color }} />
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">
                  {entry.name}
                </span>
                <span className="text-[12px] font-black text-white ml-auto">
                  {entry.value.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-[3fr_2fr]">
      {/* Monthly Volume Bar Chart */}
      <div className="premium-card p-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary shadow-sm border border-primary/5">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Sync Volume Trends</h3>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.15em] opacity-50">Historical throughput (GB)</p>
            </div>
          </div>
          
          {/* Range Selector */}
          <div className="flex items-center gap-1 bg-white/5 p-1.5 rounded-xl border border-white/5 backdrop-blur-sm">
            {["24h", "7d", "30d"].map((r) => (
              <button
                key={r}
                onClick={() => setVRange(r as any)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  vRange === r ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground/60 hover:text-foreground"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        
        <div className="h-[280px] w-full mt-2 flex items-center justify-center rounded-2xl bg-white/[0.02] border border-white/5 p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          {volumeLoading ? (
             <div className="flex flex-col items-center gap-3 text-muted-foreground/30 animate-pulse relative z-10">
                <Database className="w-10 h-10 opacity-20" />
                <span className="text-[11px] font-black uppercase tracking-widest">Streaming metrics...</span>
             </div>
          ) : getVolumeData().length === 0 ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground/30 relative z-10">
              <Database className="w-10 h-10 opacity-20" />
              <span className="text-[11px] font-black uppercase tracking-widest">No history recorded</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getVolumeData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: colors.text, fontSize: 10, fontWeight: 900 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: colors.text, fontSize: 10, fontWeight: 900 }} 
                />
                <Tooltip 
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{ 
                    backgroundColor: "rgba(15, 23, 42, 0.9)", 
                    backdropFilter: "blur(12px)",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "16px",
                    fontSize: "12px",
                    fontWeight: "900",
                    color: "#fff",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                    padding: "12px 16px"
                  }}
                  itemStyle={{ color: "#3b82f6", textTransform: "uppercase", letterSpacing: "1px" }}
                />
                <Bar dataKey="volume" radius={[6, 6, 0, 0]}>
                  {getVolumeData().map((entry: any, index: number, arr: any[]) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === arr.length - 1 ? colors.primary : colors.primaryLight} 
                      className="hover:fill-primary transition-all duration-500 cursor-pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Master Resource Line/Area Chart */}
      <div className="premium-card p-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 shadow-sm border border-emerald-500/5">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Resource Utilization</h3>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.15em] opacity-50">Master node performance</p>
            </div>
          </div>
          
          {/* Range Selector */}
          <div className="flex items-center gap-1 bg-white/5 p-1.5 rounded-xl border border-white/5 backdrop-blur-sm">
            {["24h", "7d", "30d"].map((r) => (
              <button
                key={r}
                onClick={() => setRRange(r as any)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  rRange === r ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-muted-foreground/60 hover:text-foreground"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[280px] w-full mt-2 flex items-center justify-center rounded-2xl bg-white/[0.02] border border-white/5 p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
          {metricsLoading ? (
             <div className="flex flex-col items-center gap-3 text-muted-foreground/30 animate-pulse relative z-10">
                <Activity className="w-10 h-10 opacity-20" />
                <span className="text-[11px] font-black uppercase tracking-widest">Polling sensors...</span>
             </div>
          ) : getResourceData().length === 0 ? (
             <div className="flex flex-col items-center gap-3 text-muted-foreground/30 relative z-10">
                <Activity className="w-10 h-10 opacity-20" />
                <span className="text-[11px] font-black uppercase tracking-widest">Waiting for telemetry</span>
             </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getResourceData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.primary} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.emerald} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={colors.emerald} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: colors.text, fontSize: 10, fontWeight: 900 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: colors.text, fontSize: 10, fontWeight: 900 }} 
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="cpu" 
                  name="CPU Load"
                  stroke={colors.primary} 
                  fillOpacity={1} 
                  fill="url(#colorCpu)" 
                  strokeWidth={3}
                  animationDuration={2000}
                  activeDot={{ r: 6, strokeWidth: 0, fill: colors.primary }}
                />
                <Area 
                  type="monotone" 
                  dataKey="ram" 
                  name="RAM Usage"
                  stroke={colors.emerald} 
                  fillOpacity={1} 
                  fill="url(#colorRam)" 
                  strokeWidth={3}
                  animationDuration={2000}
                  activeDot={{ r: 6, strokeWidth: 0, fill: colors.emerald }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
