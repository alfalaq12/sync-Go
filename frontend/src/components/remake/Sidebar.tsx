"use client";

import React, { useState } from "react";
import { 
  User, Users, Shield, ShieldAlert, Key, 
  Settings, Server, FileText, Bell, Download, Monitor, Webhook, Play, Globe,
  LayoutGrid, Database, Share2, Activity, Terminal, Code2, Cpu, ChevronDown, ChevronRight, LogOut,
  ChevronLeft, Search
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
    title: "MAIN",
    section: true,
    items: [
      { title: "Dashboard", icon: LayoutGrid, href: "/dashboard" },
    ],
  },
  {
    title: "USER",
    section: true,
    items: [
      { title: "Profile", icon: User, href: "/dashboard/user/profile" },
      { title: "Groups", icon: Users, href: "/dashboard/user/groups" },
      { title: "Role", icon: Shield, href: "/dashboard/user/role" },
      { title: "Policy", icon: ShieldAlert, href: "/dashboard/user/policy" },
      { title: "Sessions", icon: Key, href: "/dashboard/user/sessions" },
    ],
  },
  {
    title: "MASTER",
    section: true,
    items: [
      { 
        title: "Settings", 
        icon: Settings,
        items: [
          { title: "General Settings", icon: Settings, href: "/dashboard/master/settings" }
        ] 
      },
      { title: "NODES", icon: Server, href: "/dashboard/nodes" },
      { title: "LOG Viewer", icon: FileText, href: "/dashboard/logs" },
      { title: "Notification", icon: Bell, href: "/dashboard/master/notifications" },
      { title: "Remote Install", icon: Download, href: "/dashboard/master/remote-install" },
      { title: "Interface", icon: Monitor, href: "/dashboard/master/interface" },
      { title: "AuthWS", icon: Webhook, href: "/dashboard/master/authws" },
      { title: "Demo", icon: Play, href: "/dashboard/master/demo" },
      { title: "Host Migration", icon: Globe, href: "/dashboard/master/host-migration" },
      { title: "Download", icon: Download, href: "/dashboard/master/download" },
      { title: "External Logging", icon: FileText, href: "/dashboard/master/external-logging" },
      { title: "SMS Auth", icon: Shield, href: "/dashboard/master/sms-auth" },
      { title: "SMS Gateway", icon: Webhook, href: "/dashboard/master/sms-gateway" },
      { title: "DB CONSOLE", icon: Terminal, href: "/dashboard/master/db-console" },
      { title: "Regex Console", icon: Terminal, href: "/dashboard/master/regex-console" },
      { title: "XML Console", icon: Code2, href: "/dashboard/master/xml-console" },
      { title: "Regex Job SIM", icon: Cpu, href: "/dashboard/master/regex-job-sim" },
      { title: "CRYPTO TEST", icon: Shield, href: "/dashboard/master/crypto-test" },
      { title: "Data Sources", icon: Database, href: "/dashboard/master/data-sources" },
      { title: "TEXTDB Query", icon: Search, href: "/dashboard/master/textdb-query" },
      { title: "Script Console", icon: Terminal, href: "/dashboard/master/script-console" },
      { title: "SA NODES", icon: Server, href: "/dashboard/master/sa-nodes" },
      { title: "SA CHANNELS", icon: Share2, href: "/dashboard/master/sa-channels" },
      { title: "SA VFS", icon: Database, href: "/dashboard/master/sa-vfs" }
    ],
  },
  {
    title: "CONSOLIDATION",
    section: true,
    items: [
      { 
        title: "Settings", 
        icon: Settings,
        items: [
          { title: "Settings", icon: Settings, href: "/dashboard/consolidation-settings" }
        ] 
      },
      { title: "SCHEMA", icon: Database, href: "/dashboard/schema" },
      { title: "NETWORK", icon: Globe, href: "/dashboard/network" },
      { title: "JOBS", icon: Activity, href: "/dashboard/jobs" },
      { title: "NODES", icon: Server, href: "/dashboard/nodes" },
      { title: "VAULT", icon: Key, href: "/dashboard/credentials" },
      { title: "LOG Viewer", icon: FileText, href: "/dashboard/logs" }
    ]
  }
];

export function Sidebar({ 
  isOpen, 
  onClose,
  isCollapsed = false,
  setIsCollapsed
}: { 
  isOpen?: boolean; 
  onClose?: () => void;
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        "fixed left-0 top-0 h-full flex flex-col z-50 overflow-hidden transition-all duration-500 transform lg:translate-x-0 border-r border-white/[0.06]",
        "bg-gradient-to-b from-[#0a1128] via-[#0d1530] to-[#080e20] shadow-[4px_0_25px_rgba(0,0,0,0.3)]",
        isCollapsed ? "w-[80px]" : "w-[260px]",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Ambient glow effects */}
        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-primary/[0.07] to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-primary/[0.04] to-transparent pointer-events-none" />

        {/* Sidebar Header - Branding */}
        <div className="p-6 pb-8 border-b border-white/[0.06] shrink-0 relative">
          <div className={cn("flex items-center gap-4 group cursor-pointer", isCollapsed && "lg:justify-center")} onClick={() => router.push("/dashboard")}>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full group-hover:bg-primary/50 transition-all duration-700" />
              <div className="relative w-11 h-11 rounded-2xl overflow-hidden shadow-2xl shadow-primary/40 group-hover:rotate-12 transition-transform duration-500 ring-1 ring-white/10">
                 <img src="/syncgo-logo.png" alt="Sync-Go" className="w-full h-full object-cover" />
              </div>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col animate-in fade-in duration-300">
                <span className="text-lg font-black tracking-tight text-white uppercase leading-none">Sync-Go</span>
                <span className="text-[9px] font-black tracking-[0.25em] text-primary/80 uppercase mt-1">Console</span>
              </div>
            )}
          </div>
        </div>
   
        {/* Nav Content */}
        <nav className="flex-1 overflow-y-auto premium-scrollbar px-3 py-6 pb-16 relative">
          {!isCollapsed ? (
            <div className="mb-6 px-4">
               <p className="text-[10px] font-black tracking-[0.25em] text-white/20 uppercase">SYSTEM DECK</p>
            </div>
          ) : (
            <div className="mb-6 border-b border-white/[0.06] mx-4" />
          )}
          {menuData.map((group, idx) => (
            <MenuGroup key={idx} group={group} pathname={pathname} isCollapsed={isCollapsed} />
          ))}
        </nav>

        {/* Collapse Toggle Button */}
        {setIsCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "hidden lg:flex items-center justify-center w-7 h-7 rounded-lg border border-white/10 hover:border-primary/40 bg-white/[0.05] hover:bg-white/[0.1] text-white/40 hover:text-white transition-all duration-300 shadow-sm cursor-pointer absolute bottom-4 z-50",
              isCollapsed ? "left-1/2 -translate-x-1/2" : "right-4"
            )}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        )}
      </aside>
    </>
  );
}

function MenuGroup({ group, pathname, isCollapsed }: { group: NavItem; pathname: string; isCollapsed: boolean }) {
  const hasActiveItem = (item: NavItem): boolean => {
    if (item.href && pathname === item.href) return true;
    if (item.items) {
      return item.items.some(subItem => hasActiveItem(subItem));
    }
    return false;
  };
  
  const isAnyChildActive = group.items ? group.items.some(item => hasActiveItem(item)) : false;
  const [isOpen, setIsOpen] = useState(isAnyChildActive || group.title === "MAIN");

  if (isCollapsed) {
    return (
      <div className="space-y-1.5 mb-4">
        {group.items && group.items.map((item, idx) => (
          <MenuItem key={idx} item={item} depth={1} pathname={pathname} isCollapsed={true} />
        ))}
      </div>
    );
  }

  // Style menu groups (USER, MASTER, CONSOLIDATION, SECURE ACCESS) as elegant card boxes
  const isMain = group.title === "MAIN";
  const boxStyles = isMain
    ? "mb-4"
    : cn(
        "mb-5 p-2 rounded-2xl border transition-all duration-300 ease-in-out",
        isAnyChildActive 
          ? "border-primary/20 bg-primary/[0.06] shadow-[0_4px_20px_rgba(99,102,241,0.08)]" 
          : "border-white/[0.05] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.04]"
      );

  return (
    <div className={boxStyles}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 text-[9px] font-black tracking-[0.18em] transition-colors uppercase mb-1.5 group select-none",
          isAnyChildActive 
            ? "text-primary" 
            : "text-white/30 hover:text-white/70"
        )}
      >
        <span>{group.title}</span>
        {isOpen ? <ChevronDown className="w-3 h-3 opacity-25 group-hover:opacity-100" /> : <ChevronRight className="w-3 h-3 opacity-25 group-hover:opacity-100" />}
      </button>
      
      {isOpen && group.items && (
        <div className="space-y-1 animate-in fade-in duration-300 pt-2 border-t border-white/[0.05]">
          {group.items.map((item, idx) => (
            <MenuItem key={idx} item={item} depth={1} pathname={pathname} isCollapsed={false} />
          ))}
        </div>
      )}
    </div>
  );
}

function MenuItem({ item, depth, pathname, isCollapsed }: { item: NavItem; depth: number; pathname: string; isCollapsed: boolean }) {
  const hasActiveSub = (subItem: NavItem): boolean => {
    if (subItem.href && pathname === subItem.href) return true;
    if (subItem.items) return subItem.items.some(hasActiveSub);
    return false;
  };
  
  const isAnySubActive = item.items ? item.items.some(hasActiveSub) : false;
  const [isOpen, setIsOpen] = useState(isAnySubActive);
  
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

  const IconComponent = item.icon;

  return (
    <div>
      <button 
        onClick={handleClick}
        className={cn(
          "w-full h-[40px] flex items-center justify-between rounded-xl text-[13px] font-semibold transition-all group relative duration-300 cursor-pointer",
          depth === 1 ? "pl-4 pr-4" : "pl-8 pr-4",
          isActive 
            ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary border border-primary/20 shadow-[0_4px_15px_rgba(99,102,241,0.1)] font-bold" 
            : "hover:bg-white/[0.05] text-white/50 hover:text-white hover:translate-x-1 border border-transparent",
          isCollapsed && "justify-center pl-0 pr-0 hover:translate-x-0"
        )}
        title={isCollapsed ? item.title : undefined}
      >
        <div className="flex items-center gap-3">
          {IconComponent ? (
            <IconComponent className={cn("w-4 h-4 transition-all duration-300 shrink-0", isActive ? "scale-110 text-primary" : "opacity-50 group-hover:opacity-90 group-hover:scale-110")} />
          ) : (
            <div className={cn("w-1.5 h-1.5 rounded-full transition-all duration-300 shrink-0", isActive ? "bg-primary scale-125 shadow-[0_0_8px_var(--primary)]" : "bg-white/30 group-hover:bg-white")} />
          )}
          {!isCollapsed && <span className="tracking-tight text-left truncate">{item.title}</span>}
        </div>
        {!isCollapsed && hasSubItems && (
          <div className={cn("transition-transform duration-300", isOpen && "rotate-90")}>
            <ChevronRight className="w-3.5 h-3.5 opacity-30 group-hover:opacity-100" />
          </div>
        )}
      </button>

      {hasSubItems && isOpen && (
        <div className={cn(
          "space-y-1 mt-1 pl-4 border-l border-white/[0.08] ml-6 animate-in slide-in-from-top-1 duration-200",
          isCollapsed && "pl-0 border-l-0 ml-0 flex flex-col items-center justify-center"
        )}>
          {item.items?.map((sub, idx) => (
            <MenuItem key={idx} item={sub} depth={depth + 1} pathname={pathname} isCollapsed={isCollapsed} />
          ))}
        </div>
      )}
    </div>
  );
}
