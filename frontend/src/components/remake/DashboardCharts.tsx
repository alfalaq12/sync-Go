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
      grid: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
      text: isDark ? "#8b95a5" : "#94a3b8",
      primary: isDark ? "#6b8af9" : "#4f6ef7",
      primaryLight: isDark ? "rgba(107, 138, 249, 0.35)" : "rgba(79, 110, 247, 0.25)",
      teal: isDark ? "#2dd4a8" : "#20c997",
      tealLight: isDark ? "rgba(45, 212, 168, 0.35)" : "rgba(32, 201, 151, 0.25)",
      tooltipBg: isDark ? "#1a2332" : "#ffffff",
      tooltipBorder: isDark ? "#1e2e45" : "#dfe3ea"
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
        <div
          className="p-3.5 rounded-xl shadow-2xl border"
          style={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder }}
        >
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 pb-2 border-b border-border/30">
            {label}
          </p>
          <div className="space-y-1.5">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                  {entry.name}
                </span>
                <span className="text-[12px] font-bold text-foreground ml-auto">
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
    <div className="grid gap-5 grid-cols-1 lg:grid-cols-[3fr_2fr]">
      {/* Sync Volume Bar Chart */}
      <div className="premium-card p-7 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-primary/8 text-primary border border-primary/10">
              <Database className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground tracking-tight">Sync volume</h3>
              <p className="text-[10px] text-muted-foreground/50 font-medium tracking-wide">Historical throughput (GB)</p>
            </div>
          </div>
          
          {/* Range Selector */}
          <div className="flex items-center gap-0.5 bg-muted/40 dark:bg-muted/30 p-1 rounded-lg border border-border/30">
            {["24h", "7d", "30d"].map((r) => (
              <button
                key={r}
                onClick={() => setVRange(r as any)}
                className={cn(
                  "px-3.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200",
                  vRange === r ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground/50 hover:text-foreground hover:bg-muted/60"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        
        <div className="h-[280px] w-full mt-1 flex items-center justify-center rounded-xl bg-muted/20 dark:bg-muted/10 border border-border/20 p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />
          {volumeLoading ? (
             <div className="flex flex-col items-center gap-3 text-muted-foreground/30 animate-pulse relative z-10">
                <Database className="w-8 h-8 opacity-20" />
                <span className="text-[11px] font-medium text-muted-foreground/40">Streaming metrics...</span>
             </div>
          ) : getVolumeData().length === 0 ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground/30 relative z-10">
              <Database className="w-8 h-8 opacity-20" />
              <span className="text-[11px] font-medium text-muted-foreground/40">No history recorded</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getVolumeData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: colors.text, fontSize: 10, fontWeight: 600 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: colors.text, fontSize: 10, fontWeight: 600 }} 
                />
                <Tooltip 
                  cursor={{ fill: "rgba(79,110,247,0.04)" }}
                  contentStyle={{ 
                    backgroundColor: colors.tooltipBg, 
                    backdropFilter: "blur(12px)",
                    borderColor: colors.tooltipBorder,
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    boxShadow: "0 12px 32px -8px rgba(0, 0, 0, 0.2)",
                    padding: "10px 14px"
                  }}
                  itemStyle={{ color: colors.primary, letterSpacing: "0.5px" }}
                />
                <Bar dataKey="volume" radius={[5, 5, 0, 0]} activeBar={{ fill: colors.primary, radius: [5, 5, 0, 0] }}>
                  {getVolumeData().map((entry: any, index: number, arr: any[]) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === arr.length - 1 ? colors.primary : colors.primaryLight} 
                      className="cursor-pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Master Resource Area Chart */}
      <div className="premium-card p-7 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-secondary/10 text-secondary border border-secondary/10">
              <Activity className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground tracking-tight">Resource utilization</h3>
              <p className="text-[10px] text-muted-foreground/50 font-medium tracking-wide">Master node performance</p>
            </div>
          </div>
          
          {/* Range Selector */}
          <div className="flex items-center gap-0.5 bg-muted/40 dark:bg-muted/30 p-1 rounded-lg border border-border/30">
            {["24h", "7d", "30d"].map((r) => (
              <button
                key={r}
                onClick={() => setRRange(r as any)}
                className={cn(
                  "px-3.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200",
                  rRange === r ? "bg-secondary text-white shadow-sm" : "text-muted-foreground/50 hover:text-foreground hover:bg-muted/60"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[280px] w-full mt-1 flex items-center justify-center rounded-xl bg-muted/20 dark:bg-muted/10 border border-border/20 p-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-secondary/[0.03] to-transparent pointer-events-none" />
          {metricsLoading ? (
             <div className="flex flex-col items-center gap-3 text-muted-foreground/30 animate-pulse relative z-10">
                <Activity className="w-8 h-8 opacity-20" />
                <span className="text-[11px] font-medium text-muted-foreground/40">Polling sensors...</span>
             </div>
          ) : getResourceData().length === 0 ? (
             <div className="flex flex-col items-center gap-3 text-muted-foreground/30 relative z-10">
                <Activity className="w-8 h-8 opacity-20" />
                <span className="text-[11px] font-medium text-muted-foreground/40">Waiting for telemetry</span>
             </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getResourceData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.teal} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={colors.teal} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.grid} />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: colors.text, fontSize: 10, fontWeight: 600 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: colors.text, fontSize: 10, fontWeight: 600 }} 
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
                  strokeWidth={2}
                  animationDuration={2000}
                  activeDot={{ r: 5, strokeWidth: 0, fill: colors.primary }}
                />
                <Area 
                  type="monotone" 
                  dataKey="ram" 
                  name="RAM Usage"
                  stroke={colors.teal} 
                  fillOpacity={1} 
                  fill="url(#colorRam)" 
                  strokeWidth={2}
                  animationDuration={2000}
                  activeDot={{ r: 5, strokeWidth: 0, fill: colors.teal }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
