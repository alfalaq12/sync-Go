"use client";

import React from "react";
import { Sidebar } from "@/components/remake/Sidebar";
import IdleSessionObserver from "@/components/remake/IdleSessionObserver";
import { ThemeToggle } from "@/components/remake/ThemeToggle";
import { Search, Monitor, Shield, Menu, X } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans transition-colors duration-300">
      <IdleSessionObserver />
      
      {/* Sidebar - Responsive */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[260px] relative">
        
        {/* Top bar (60px) */}
        <header className="h-[60px] border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 z-20 shrink-0">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-500 tracking-wider uppercase">Jakarta-Region-01 (MASTER AKTIF)</span>
            </div>
            
            {/* Environment Badge */}
            <div className="px-2.5 py-1 rounded border border-primary/30 bg-primary/5">
              <span className="text-[10px] font-bold text-primary tracking-widest uppercase">PRODUKSI</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Search Box */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder="Cari fitur atau data..." 
                className="bg-muted/50 border border-border rounded-lg pl-10 pr-4 py-2 text-[13px] text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 w-[280px] font-medium transition-all"
              />
            </div>
            
            {/* Theme & Secured Badge */}
            <div className="flex items-center gap-6 border-l border-border pl-6">
              <ThemeToggle />
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-tighter leading-none mb-0.5">Akses Terenkripsi</span>
                  <span className="text-[8px] font-medium text-muted-foreground uppercase tracking-tighter leading-none">Protokol Otentikasi Aktif</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto premium-scrollbar bg-background p-6">
           <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
             {children}
           </div>
        </main>
      </div>
    </div>
  );
}
