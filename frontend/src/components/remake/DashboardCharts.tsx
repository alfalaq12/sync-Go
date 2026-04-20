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

  return (
    <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
      {/* Monthly Volume Bar Chart */}
      <div className="enterprise-card p-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-foreground leading-tight uppercase tracking-tight">Sync Volume Trends</h3>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Historical performance (GB)</p>
            </div>
          </div>
          
          {/* Range Selector */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border">
            {["24h", "7d", "30d"].map((r) => (
              <button
                key={r}
                onClick={() => setVRange(r as any)}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all",
                  vRange === r ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        
        <div className="h-[250px] w-full mt-4 flex items-center justify-center border border-dashed border-border rounded-lg bg-muted/5">
          {volumeLoading ? (
             <div className="flex flex-col items-center gap-2 text-muted-foreground/40 animate-pulse">
                <Database className="w-8 h-8 opacity-20" />
                <span className="text-[12px] font-medium italic">Fetching performance data...</span>
             </div>
          ) : getVolumeData().length === 0 ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
              <Database className="w-8 h-8 opacity-20" />
              <span className="text-[12px] font-medium italic">No synchronization data available</span>
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
                  cursor={{ fill: colors.grid }}
                  contentStyle={{ 
                    backgroundColor: colors.tooltipBg, 
                    borderColor: colors.tooltipBorder,
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "hsl(var(--foreground))",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                  }}
                />
                <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                  {getVolumeData().map((entry: any, index: number, arr: any[]) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={index === arr.length - 1 ? colors.primary : colors.primaryLight} 
                      className="hover:fill-primary transition-all duration-300"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Master Resource Line/Area Chart */}
      <div className="enterprise-card p-6 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-foreground leading-tight uppercase tracking-tight">Master Resource Usage</h3>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">CPU & RAM Consumption</p>
            </div>
          </div>
          
          {/* Range Selector */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg border border-border">
            {["24h", "7d", "30d"].map((r) => (
              <button
                key={r}
                onClick={() => setRRange(r as any)}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all",
                  rRange === r ? "bg-card text-emerald-500 shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="h-[250px] w-full mt-4 flex items-center justify-center border border-dashed border-border rounded-lg bg-muted/5">
          {metricsLoading ? (
             <div className="flex flex-col items-center gap-2 text-muted-foreground/40 animate-pulse">
                <Activity className="w-8 h-8 opacity-20" />
                <span className="text-[12px] font-medium italic">Reading node performance...</span>
             </div>
          ) : getResourceData().length === 0 ? (
             <div className="flex flex-col items-center gap-2 text-muted-foreground/40">
                <Activity className="w-8 h-8 opacity-20" />
                <span className="text-[12px] font-medium italic">Awaiting Master Node metrics...</span>
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
                    <stop offset="5%" stopColor={colors.emerald} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={colors.emerald} stopOpacity={0}/>
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
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: colors.tooltipBg, 
                    borderColor: colors.tooltipBorder,
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "hsl(var(--foreground))"
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke={colors.primary} 
                  fillOpacity={1} 
                  fill="url(#colorCpu)" 
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="ram" 
                  stroke={colors.emerald} 
                  fillOpacity={1} 
                  fill="url(#colorRam)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
