"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchLogs } from "@/lib/api";
import { Terminal, AlertCircle, Filter, Search } from "lucide-react";

const levelColors: Record<string, string> = {
  INFO: "text-blue-400",
  WARN: "text-yellow-400",
  ERROR: "text-red-400",
  DEBUG: "text-zinc-500",
};

export default function LogsPage() {
  const [nodeFilter, setNodeFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["logs"],
    queryFn: () => fetchLogs(200),
    refetchInterval: 2000,
  });

  const logs = data?.data || [];
  const uniqueNodes = Array.from(new Set(logs.map((log: any) => log.node_id || "system")));

  const filteredLogs = logs.filter((log: any) => {
    const matchNode = nodeFilter === "ALL" || (log.node_id || "system") === nodeFilter;
    const matchSearch = searchTerm === "" || log.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (log.source && log.source.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchNode && matchSearch;
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-lg bg-[#1E90FF]/10 text-[#1E90FF]">
              <Terminal className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#0F172A]">Sistem Log & Diagnostik</h1>
          </div>
          <p className="text-[14px] font-medium text-[#64748B] ml-1">Pantau telemetri real-time dan history diagnostik dari setiap aksi sinkronisasi server.</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-3 text-[#64748B] py-10 justify-center">
          <div className="animate-spin h-5 w-5 border-2 border-[#1E90FF] border-t-transparent rounded-full" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#94A3B8]">Mendengarkan aliran log jaringan...</span>
        </div>
      )}

      {error && (
        <div className="enterprise-card bg-red-50 border border-red-100 p-6 flex items-center gap-4 text-red-600 mb-8">
           <AlertCircle className="w-6 h-6" />
           <div className="flex flex-col">
              <span className="text-sm font-bold uppercase tracking-tight">Koneksi Log Gagal</span>
              <span className="text-xs opacity-80">Sistem gagal terhubung ke registri log jaringan (Silakan periksa koneksi backend).</span>
           </div>
        </div>
      )}

      {data && (
        <div className="enterprise-card bg-white border border-[#E2E8F0] shadow-2xl overflow-hidden flex flex-col h-[calc(100vh-320px)] min-h-[600px]">
          
          {/* Terminal Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0] gap-4">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="flex gap-1.5 shrink-0">
                 <div className="w-3 h-3 rounded-full bg-[#E2E8F0]" />
                 <div className="w-3 h-3 rounded-full bg-[#E2E8F0]" />
                 <div className="w-3 h-3 rounded-full bg-[#E2E8F0]" />
              </div>
              <div className="h-4 w-px bg-[#E2E8F0] mx-1 shrink-0 hidden sm:block" />
              
              {/* Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2 bg-white rounded border border-[#E2E8F0] px-3 py-1 flex-1">
                  <Filter className="w-3.5 h-3.5 text-[#94A3B8]" />
                  <select 
                    value={nodeFilter}
                    onChange={(e) => setNodeFilter(e.target.value)}
                    className="bg-transparent border-none text-[11px] font-bold text-[#64748B] uppercase tracking-wider outline-none w-full cursor-pointer p-0"
                  >
                    <option value="ALL">Semua Node</option>
                    {uniqueNodes.map((n: unknown) => (
                      <option key={n as string} value={n as string}>@{n as string}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex items-center gap-2 bg-white rounded border border-[#E2E8F0] px-3 py-1 flex-1">
                  <Search className="w-3.5 h-3.5 text-[#94A3B8]" />
                  <input
                    type="text"
                    placeholder="Pencarian Log..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none text-[11px] font-medium text-[#0F172A] outline-none w-full w-32 p-0"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-4 shrink-0">
               <div className="px-2 py-0.5 rounded bg-white border border-[#E2E8F0] text-[10px] font-mono font-bold text-[#64748B]">
                  Batas Tail: 200 data
               </div>
               <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                  <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Integrasi Live Aktif</span>
               </div>
            </div>
          </div>

          {/* Terminal Content */}
          <div className="flex-1 overflow-auto p-6 font-mono text-[12px] bg-[#0F172A] text-slate-300 selection:bg-[#1E90FF]/30 space-y-1">
            {filteredLogs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30 gap-4">
                <Terminal className="w-12 h-12" />
                <p className="text-[11px] font-bold uppercase tracking-[0.2em]">Sistem menuggu catatan log baru...</p>
              </div>
            ) : (
              filteredLogs.map((log: any) => (
                <div key={log.id} className="flex gap-4 hover:bg-white/5 px-3 py-1 rounded transition-colors group">
                  <span className="text-[#64748B] shrink-0 tabular-nums">{log.created_at}</span>
                  <span className={`shrink-0 w-16 text-right font-black ${
                    log.level === 'ERROR' ? "text-red-400" : 
                    log.level === 'WARN' ? "text-amber-400" : 
                    log.level === 'DEBUG' ? "text-blue-400" : 
                    "text-emerald-400 opacity-80"
                  }`}>
                    [{log.level}]
                  </span>
                  <span className="text-[#1E90FF] shrink-0 font-bold opacity-60 group-hover:opacity-100 transition-opacity">
                    @{log.node_id || "system"}
                  </span>
                  <span className="text-zinc-500 shrink-0 italic border-l border-white/10 pl-4 ml-1">{log.source || "kernel"}</span>
                  <span className="text-slate-100 break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>

          <div className="px-6 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0] flex items-center justify-between">
             <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest hidden sm:block">
                Status Buffer Log: Sinkronisasi Optimal 
             </span>
             <span className="text-[10px] font-bold text-[#64748B]">
                Update Terakhir: {new Date().toLocaleTimeString()}
             </span>
          </div>
        </div>
      )}
    </div>
  );
}
