"use client";

import React, { useEffect } from "react";
import { Sidebar } from "@/components/remake/Sidebar";
import IdleSessionObserver from "@/components/remake/IdleSessionObserver";
import { ThemeToggle } from "@/components/remake/ThemeToggle";
import { Search, Monitor, Shield, Menu, X, Command } from "lucide-react";
import { CommandPalette } from "@/components/remake/CommandPalette";
import { UserDropdown } from "@/components/remake/UserDropdown";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground font-sans transition-colors duration-300">
      <IdleSessionObserver />
      <CommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      
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

            {/* Jakarta-Region-01 (MASTER AKTIF) */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-500 tracking-wider uppercase">Jakarta-Region-01 (MASTER AKTIF)</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Search Box Trigger */}
            <div 
              onClick={() => setIsSearchOpen(true)}
              className="relative group cursor-pointer"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              <div className="bg-muted/50 border border-border rounded-lg pl-10 pr-12 py-2 text-[13px] text-muted-foreground/50 hover:border-primary hover:ring-4 hover:ring-primary/5 w-[280px] font-medium transition-all flex items-center justify-between">
                <span>Cari fitur atau data...</span>
                <div className="flex items-center gap-1">
                   <kbd className="px-1.5 py-0.5 rounded border border-border bg-card text-[9px] font-bold">CTRL</kbd>
                   <kbd className="px-1.5 py-0.5 rounded border border-border bg-card text-[9px] font-bold">K</kbd>
                </div>
              </div>
            </div>
            
            {/* Theme & User Dropdown */}
            <div className="flex items-center gap-6 border-l border-border pl-6">
              <ThemeToggle />
              <UserDropdown />
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
