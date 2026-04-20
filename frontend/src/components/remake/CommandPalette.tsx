"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Monitor, Terminal, Database, Users, Shield, Clock, LayoutGrid, ArrowRight, Globe, Key, ShieldAlert } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SearchItem {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  category: "Navigasi" | "Aksi Cepat" | "Data";
}

const ITEMS: SearchItem[] = [
  { id: "nodes", title: "Monitoring Nodes", description: "Kelola dan pantau status agent", href: "/dashboard/nodes", icon: <Monitor className="w-4 h-4" />, category: "Navigasi" },
  { id: "jobs", title: "Sync Jobs", description: "Daftar pekerjaan sinkronisasi data", href: "/dashboard/jobs", icon: <Terminal className="w-4 h-4" />, category: "Navigasi" },
  { id: "schemas", title: "Definisi Schema", description: "Konfigurasi pemetaan tabel", href: "/dashboard/schema", icon: <Database className="w-4 h-4" />, category: "Navigasi" },
  { id: "networks", title: "Network Configuration", description: "Kelola koneksi sumber dan target", href: "/dashboard/network", icon: <Globe className="w-4 h-4" />, category: "Navigasi" },
  { id: "credentials", title: "Vault Credentials", description: "Kelola kredensial database", href: "/dashboard/credentials", icon: <Key className="w-4 h-4" />, category: "Navigasi" },
  { id: "users", title: "Manajemen User", description: "Kelola pengguna dan akses", href: "/dashboard/user/management", icon: <Users className="w-4 h-4" />, category: "Navigasi" },
  { id: "groups", title: "User Groups", description: "Pengelompokan user dan akses", href: "/dashboard/user/groups", icon: <Users className="w-4 h-4" />, category: "Navigasi" },
  { id: "roles", title: "Role & Permission", description: "Konfigurasi hak akses RBAC", href: "/dashboard/user/role", icon: <Shield className="w-4 h-4" />, category: "Navigasi" },
  { id: "policies", title: "Access Policies", description: "Aturan akses mendetail", href: "/dashboard/user/policy", icon: <ShieldAlert className="w-4 h-4" />, category: "Navigasi" },
  { id: "logs", title: "System Logs", description: "Log aktivitas sistem dan error", href: "/dashboard/logs", icon: <Clock className="w-4 h-4" />, category: "Navigasi" },
  { id: "overview", title: "Dashboard Overview", description: "Ringkasan statistik sistem", href: "/dashboard", icon: <LayoutGrid className="w-4 h-4" />, category: "Navigasi" },
  { id: "create-node", title: "Tambah Node Baru", description: "Registrasi agent baru ke master", href: "/dashboard/nodes/create", icon: <ArrowRight className="w-4 h-4" />, category: "Aksi Cepat" },
];

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredItems = ITEMS.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) || 
    item.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
      }
      if (e.key === "Enter" && filteredItems[selectedIndex]) {
        e.preventDefault();
        router.push(filteredItems[selectedIndex].href);
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, router, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose}
      />
      
      {/* Palette Container */}
      <div className="relative w-full max-w-[640px] bg-card border border-border rounded-xl shadow-2xl shadow-primary/20 overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-200">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Cari menu, aksi, atau data..."
            className="flex-1 bg-transparent border-none outline-none text-foreground placeholder-muted-foreground/50 font-medium text-[15px]"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted text-[10px] font-bold text-muted-foreground uppercase tracking-widest border border-border">
            ESC
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto premium-scrollbar p-2">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-[14px]">Tidak menemukan hasil untuk &quot;<span className="text-foreground font-semibold">{query}</span>&quot;</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* Grouping could be added here, but for now simple list with categories */}
              {filteredItems.map((item, index) => (
                <div 
                  key={item.id}
                  onClick={() => {
                    router.push(item.href);
                    onClose();
                  }}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all duration-150 group",
                    index === selectedIndex 
                      ? "bg-primary/10 border-l-2 border-primary" 
                      : "hover:bg-muted/50 border-l-2 border-transparent"
                  )}
                >
                  <div className={cn(
                    "p-2 rounded-md transition-colors",
                    index === selectedIndex ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:text-foreground"
                  )}>
                    {item.icon}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className={cn(
                      "text-[14px] font-bold",
                      index === selectedIndex ? "text-primary" : "text-foreground"
                    )}>
                      {item.title}
                    </span>
                    <span className="text-[12px] text-muted-foreground line-clamp-1">{item.description}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{item.category}</span>
                    {index === selectedIndex && <ArrowRight className="w-4 h-4 text-primary animate-in slide-in-from-left-2" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-card text-[10px]">↑↓</kbd>
              <span>Navigasi</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-card text-[10px]">↵ ENTER</kbd>
              <span>Buka</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
             <span>Butuh bantuan? Ketik </span>
             <kbd className="px-1.5 py-0.5 rounded border border-border bg-card text-[10px]">?</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
