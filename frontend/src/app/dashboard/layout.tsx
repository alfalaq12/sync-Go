"use client";
import React, { useEffect } from "react";
import { Sidebar } from "@/components/remake/Sidebar";
import IdleSessionObserver from "@/components/remake/IdleSessionObserver";
import { ThemeToggle } from "@/components/remake/ThemeToggle";
import { Search, Menu, X } from "lucide-react";
import { CommandPalette } from "@/components/remake/CommandPalette";
import { UserDropdown } from "@/components/remake/UserDropdown";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(false);

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
    <div className="flex h-screen w-screen overflow-hidden mesh-gradient text-foreground font-sans transition-colors duration-300">
      <IdleSessionObserver />
      <CommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      
      {/* Sidebar - Responsive */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />

      {/* Main Container */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-500 relative",
        isCollapsed ? "lg:ml-[80px]" : "lg:ml-[260px]"
      )}>
        
        {/* Top bar (76px) - Sticky & Glassmorphic */}
        <header className="h-[76px] bg-card/90 dark:bg-slate-950/60 backdrop-blur-xl sticky top-0 flex items-center justify-between px-6 lg:px-10 z-40 shrink-0 border-b border-border/85 shadow-[0_4px_20px_rgba(0,0,0,0.02)] transition-colors duration-300">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2.5 rounded-2xl hover:bg-white/10 dark:hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition-all active:scale-95 border border-transparent hover:border-border"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Region Indicator */}
            <div className="hidden sm:flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/15 shadow-[0_0_15px_rgba(16,185,129,0.05)] transition-all hover:border-emerald-500/30">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
              </div>
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 tracking-[0.1em] uppercase font-mono">Jakarta-Region-01</span>
              <span className="text-[10px] font-black text-emerald-500/80 tracking-widest bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/10">MASTER ACTIVE</span>
            </div>
          </div>

          <div className="flex items-center gap-8">
            {/* Search Box Trigger */}
            <div 
              onClick={() => setIsSearchOpen(true)}
              className="relative group cursor-pointer hidden md:block animate-in fade-in duration-300"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors z-10" />
              <div className="bg-card/40 hover:bg-card/80 backdrop-blur-md border border-border/50 rounded-2xl pl-11 pr-14 py-2.5 text-[13px] text-muted-foreground/70 hover:border-primary/45 w-[330px] font-semibold transition-all flex items-center justify-between shadow-sm group-hover:shadow-[0_8px_25px_rgba(99,102,241,0.05)] hover:-translate-y-0.5 duration-300">
                <span>Search features or telemetry...</span>
                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                   <kbd className="px-1.5 py-0.5 rounded-md border border-border bg-muted/50 text-[9px] font-black tracking-widest font-mono">CTRL</kbd>
                   <kbd className="px-1.5 py-0.5 rounded-md border border-border bg-muted/50 text-[9px] font-black tracking-widest font-mono">K</kbd>
                </div>
              </div>
            </div>
            
            {/* Theme & User Dropdown */}
            <div className="flex items-center gap-6 border-l border-border pl-8">
              <ThemeToggle />
              <UserDropdown />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto premium-scrollbar p-6 lg:p-10 relative cyber-grid">
           <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">
             {children}
           </div>
        </main>
      </div>
    </div>
  );
}

