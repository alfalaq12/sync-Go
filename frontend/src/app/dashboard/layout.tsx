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
        
        {/* Top bar - Sticky & Glassmorphic */}
        <header className="h-[64px] bg-card/85 dark:bg-card/50 backdrop-blur-xl sticky top-0 flex items-center justify-between px-6 lg:px-8 z-40 shrink-0 border-b border-border/60 shadow-[0_1px_8px_rgba(0,0,0,0.02)] transition-colors duration-300">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-muted/60 dark:hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition-all active:scale-95 border border-transparent hover:border-border/40"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Region Indicator */}
            <div className="hidden sm:flex items-center gap-2.5 px-4 py-2 rounded-xl bg-secondary/8 border border-secondary/12 transition-all hover:border-secondary/25">
              <div className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-60"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-secondary shadow-[0_0_6px_rgba(45,212,168,0.5)]"></span>
              </div>
              <span className="text-[10px] font-bold text-secondary tracking-wide uppercase font-mono">Jakarta-Region-01</span>
              <span className="text-[9px] font-bold text-secondary/70 tracking-wider bg-secondary/10 px-2 py-0.5 rounded-md border border-secondary/8">Active</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Search Box Trigger */}
            <div 
              onClick={() => setIsSearchOpen(true)}
              className="relative group cursor-pointer hidden md:block animate-in fade-in duration-300"
            >
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/35 group-hover:text-primary transition-colors z-10" />
              <div className="bg-muted/40 dark:bg-muted/20 hover:bg-muted/60 dark:hover:bg-muted/30 border border-border/40 rounded-xl pl-10 pr-12 py-2 text-[12px] text-muted-foreground/60 hover:border-primary/30 w-[280px] font-medium transition-all flex items-center justify-between hover:-translate-y-0.5 duration-300">
                <span>Search features...</span>
                <div className="flex items-center gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                   <kbd className="px-1.5 py-0.5 rounded-md border border-border bg-muted/50 text-[9px] font-bold tracking-wider font-mono">⌘</kbd>
                   <kbd className="px-1.5 py-0.5 rounded-md border border-border bg-muted/50 text-[9px] font-bold tracking-wider font-mono">K</kbd>
                </div>
              </div>
            </div>
            
            {/* Theme & User Dropdown */}
            <div className="flex items-center gap-4 border-l border-border/40 pl-6">
              <ThemeToggle />
              <UserDropdown />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto premium-scrollbar p-6 lg:p-8 relative">
           <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
             {children}
           </div>
        </main>
      </div>
    </div>
  );
}

