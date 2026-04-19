"use client";

import React, { useState } from "react";
import { 
  User, Users, Shield, ShieldAlert, Key, 
  Settings, Server, FileText, Bell, Download, Monitor, Webhook, Play, Globe,
  LayoutGrid, Database, Share2, Activity, Terminal, Code2, Cpu, ChevronDown, ChevronRight, LogOut,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";

interface NavItem {
  title: string;
  icon?: React.ElementType;
  items?: NavItem[];
  href?: string;
  section?: boolean;
}

const menuData: NavItem[] = [
  {
    title: "SISTEM UTAMA",
    section: true,
    items: [
      { title: "Dashboard", icon: LayoutGrid, href: "/dashboard" },
    ],
  },
  {
    title: "MANAJEMEN USER",
    section: true,
    items: [
      { title: "Profil Pengguna", href: "/dashboard/user/profile" },
      { title: "Grup & Tim", href: "/dashboard/user/groups" },
      { title: "Hak Akses (Role)", href: "/dashboard/user/role" },
      { title: "Kebijakan (Policy)", href: "/dashboard/user/policy" },
      { title: "Sesi Aktif", href: "/dashboard/user/sessions" },
    ],
  },
  {
    title: "KONTROL MASTER",
    section: true,
    items: [
      { title: "Pengaturan Utama", href: "/dashboard/coming-soon/master-settings" },
      { title: "Daftar Node", href: "/dashboard/nodes" },
      { title: "Log Aktivitas", href: "/dashboard/logs" },
      { title: "Notifikasi", href: "/dashboard/coming-soon/notifications" },
      { title: "Instalasi Remote", href: "/dashboard/coming-soon/remote-install" },
      { title: "Konfigurasi Interface", href: "/dashboard/coming-soon/interface" },
    ],
  },
  {
    title: "KONSOLIDASI DATA",
    section: true,
    items: [
      { 
        title: "Konfigurasi Agent", 
        items: [
          { title: "Agent Settings", href: "/dashboard/coming-soon/agent-settings" },
          { title: "Download Binary", href: "/dashboard/coming-soon/download" },
          { title: "Eksternal Log", href: "/dashboard/coming-soon/external-logging" },
        ] 
      },
      { title: "Struktur Schema", icon: Database, href: "/dashboard/schema" },
      { title: "Brankas Vault", icon: Key, href: "/dashboard/credentials" },
      { title: "Topologi Jaringan", icon: Globe, href: "/dashboard/network" },
      { title: "Antrean Job", icon: Activity, href: "/dashboard/jobs" },
      { title: "Manajemen Node", icon: Server, href: "/dashboard/nodes" },
      { title: "Konsol Database", icon: Terminal, href: "/dashboard/coming-soon/db-console" },
      { title: "Log Aktivitas", icon: FileText, href: "/dashboard/logs" },
    ],
  },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState("User");

  React.useEffect(() => {
    const storedUser = sessionStorage.getItem("auth_user");
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_user");
    router.push("/login");
  };

  return (
    <aside className="fixed left-0 top-0 w-[260px] h-full bg-[#0F2444] flex flex-col z-30 overflow-hidden shadow-2xl">
      {/* Sidebar Header */}
      <div className="p-6">
        <p className="text-[10px] font-bold tracking-[0.2em] text-[#94B8D8] uppercase mb-4 opacity-70">Navigasi Utama</p>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1E90FF] rounded-lg flex items-center justify-center text-white shadow-lg shadow-[#1E90FF]/25">
             <Activity className="w-5 h-5 stroke-[2.5px]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white uppercase letter-spacing-[0.05em]">Sync-Go</span>
        </div>
      </div>

      {/* Nav Content */}
      <nav className="flex-1 overflow-y-auto premium-scrollbar px-3 py-2">
        {menuData.map((group, idx) => (
          <MenuGroup key={idx} group={group} pathname={pathname} />
        ))}
      </nav>

      {/* Bottom User Profile */}
      <div className="p-4 mt-auto border-t border-[#1a3a5c] bg-[#0c1d36]/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-full bg-[#1E90FF] flex items-center justify-center text-white font-bold text-sm ring-2 ring-[#0F2444] shadow-inner">{user.charAt(0).toUpperCase()}</div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-white tracking-wide truncate">{user}</p>
              </div>
          </div>
          <button 
            onClick={handleLogout}
            title="Keluar Sesi"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#1a3a5c] hover:border-red-500/50 hover:bg-red-500/10 text-[#94B8D8] hover:text-red-500 transition-all group"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function MenuGroup({ group, pathname }: { group: NavItem, pathname: string }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-6">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-bold tracking-[0.1em] text-[#94B8D8] hover:text-white transition-colors uppercase mb-1"
      >
        <span>{group.title}</span>
        {isOpen ? <ChevronDown className="w-3 h-3 opacity-40" /> : <ChevronRight className="w-3 h-3 opacity-40" />}
      </button>
      
      {isOpen && group.items && (
        <div className="space-y-0.5">
          {group.items.map((item, idx) => (
            <MenuItem key={idx} item={item} depth={1} pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuItem({ item, depth, pathname }: { item: NavItem; depth: number, pathname: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const hasSubItems = item.items && item.items.length > 0;
  const isActive = item.href ? pathname === item.href : false;

  const handleClick = (e: React.MouseEvent) => {
    if (hasSubItems) {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (item.href && item.href !== "#") {
      router.push(item.href);
    }
  };

  return (
    <div>
      <button 
        onClick={handleClick}
        className={cn(
          "w-full h-[40px] flex items-center justify-between px-3 rounded-lg text-[14px] font-medium transition-all group relative",
          depth === 1 ? "pl-4" : "pl-8",
          isActive 
            ? "bg-[#1E90FF]/15 text-[#1E90FF]" 
            : "hover:bg-white/5 text-white/70 hover:text-white"
        )}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[24px] bg-[#1E90FF] rounded-r-full" />
        )}
        <div className="flex items-center gap-3">
           {item.icon && <item.icon className={cn("w-4 h-4", isActive ? "text-[#1E90FF]" : "opacity-50 group-hover:opacity-100")} />}
           <span>{item.title}</span>
        </div>
        {hasSubItems && (
          isOpen ? <ChevronDown className="w-3 h-3 opacity-40 group-hover:opacity-100" /> : <ChevronRight className="w-3 h-3 opacity-40 group-hover:opacity-100" />
        )}
      </button>

      {hasSubItems && isOpen && (
        <div className="space-y-0.5 mt-0.5">
          {item.items?.map((sub, idx) => (
            <MenuItem key={idx} item={sub} depth={depth + 1} pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  );
}
