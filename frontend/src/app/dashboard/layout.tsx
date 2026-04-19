"use client";

import React from "react";
import { Sidebar } from "@/components/remake/Sidebar";
import IdleSessionObserver from "@/components/remake/IdleSessionObserver";
import { Search, Monitor, Shield } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F5F7FA] font-sans">
      <IdleSessionObserver />
      
      {/* Sidebar - Fixed */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 ml-[260px] relative">
        
        {/* Top bar (60px) */}
        <header className="h-[60px] border-b border-[#E2E8F0] bg-white flex items-center justify-between px-6 z-20 shrink-0">
          <div className="flex items-center gap-4">
            {/* Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00C6AD]/10 border border-[#00C6AD]/20">
              <div className="w-2 h-2 rounded-full bg-[#00C6AD] animate-pulse" />
              <span className="text-[11px] font-bold text-[#00C6AD] tracking-wider uppercase">Jakarta-Region-01 (MASTER AKTIF)</span>
            </div>
            
            {/* Environment Badge */}
            <div className="px-2.5 py-1 rounded border border-[#1E90FF] bg-transparent">
              <span className="text-[10px] font-bold text-[#1E90FF] tracking-widest uppercase">PRODUKSI</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Search Box */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]/50 group-focus-within:text-[#1E90FF] transition-colors" />
              <input 
                type="text" 
                placeholder="Cari fitur atau data..." 
                className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pl-10 pr-4 py-2 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:border-[#1E90FF] focus:ring-4 focus:ring-[#1E90FF]/5 w-[280px] font-medium transition-all"
              />
            </div>
            
            {/* Secured Badge */}
            <div className="flex items-center gap-2 border-l border-[#E2E8F0] pl-6">
              <Shield className="w-4 h-4 text-[#1E90FF]" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-[#0F172A] uppercase tracking-tighter leading-none mb-0.5">Akses Terenkripsi</span>
                <span className="text-[8px] font-medium text-[#64748B] uppercase tracking-tighter leading-none">Protokol Otentikasi Aktif</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto premium-scrollbar bg-[#F5F7FA] p-6">
           <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
             {children}
           </div>
        </main>
      </div>
    </div>
  );
}
