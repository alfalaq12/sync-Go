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
import { logout } from "@/lib/api";

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
      { title: "Profile", href: "/dashboard/user/profile" },
      { title: "Groups", href: "/dashboard/user/groups" },
      { title: "Role", href: "/dashboard/user/role" },
      { title: "Policy", href: "/dashboard/user/policy" },
      { title: "Sessions", href: "/dashboard/user/sessions" },
    ],
  },
  {
    title: "MASTER",
    section: true,
    items: [
      { 
        title: "Settings", 
        items: [
          { title: "Settings", href: "/dashboard/coming-soon/master-settings" }
        ] 
      },
      { title: "NODES", href: "/dashboard/coming-soon/master-nodes" },
      { title: "LOG Viewer", href: "/dashboard/coming-soon/master-logs" },
      { title: "Notification", href: "/dashboard/coming-soon/notifications" },
      { title: "Remote Install", href: "/dashboard/coming-soon/remote-install" },
      { title: "Interface", href: "/dashboard/coming-soon/interface" },
      { title: "AuthWS", href: "/dashboard/coming-soon/authws" },
      { title: "Demo", href: "/dashboard/coming-soon/demo" },
      { title: "Host Migration", href: "/dashboard/coming-soon/host-migration" },
    ],
  },
  {
    title: "CONSOLIDATION",
    section: true,
    items: [
      { 
        title: "Settings", 
        items: [
          { title: "Settings", href: "/dashboard/coming-soon/consolidation-settings" },
          { 
            title: "Agent Settings", 
            items: [
              { title: "Download", href: "/dashboard/coming-soon/download" },
              { title: "External Logging", href: "/dashboard/coming-soon/external-logging" },
              { title: "SMS Auth", href: "/dashboard/coming-soon/sms-auth" },
              { title: "SMS Gateway", href: "/dashboard/coming-soon/sms-gateway" },
            ] 
          },
        ] 
      },
      { title: "SCHEMA", icon: Database, href: "/dashboard/schema" },
      { title: "NETWORK", icon: Globe, href: "/dashboard/network" },
      { title: "JOBS", icon: Activity, href: "/dashboard/jobs" },
      { title: "NODES", icon: Server, href: "/dashboard/nodes" },
      { title: "VAULT", icon: Key, href: "/dashboard/credentials" },
      { title: "DB CONSOLE", icon: Terminal, href: "/dashboard/coming-soon/db-console" },
      { title: "LOG Viewer", icon: FileText, href: "/dashboard/logs" },
      { title: "Regex Console", href: "/dashboard/coming-soon/regex-console" },
      { title: "XML Console", href: "/dashboard/coming-soon/xml-console" },
      { title: "Regex Job SIM", href: "/dashboard/coming-soon/regex-job-sim" },
      { title: "CRYPTO TEST", href: "/dashboard/coming-soon/crypto-test" },
      { title: "Data Sources", href: "/dashboard/coming-soon/data-sources" },
      { title: "TEXTDB Query", href: "/dashboard/coming-soon/textdb-query" },
      { title: "Script Console", href: "/dashboard/coming-soon/script-console" },
    ],
  },
  {
    title: "SECURE ACCESS",
    section: true,
    items: [
      { title: "SA NODES", href: "/dashboard/coming-soon/sa-nodes" },
      { title: "SA CHANNELS", href: "/dashboard/coming-soon/sa-channels" },
      { title: "SA VFS", href: "/dashboard/coming-soon/sa-vfs" }
    ]
  }
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState("User");

  React.useEffect(() => {
    const storedUser = sessionStorage.getItem("auth_user");
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed:", err);
    }
    // Always clear local state and redirect even if API call fails
    sessionStorage.removeItem("auth_user");
    router.push("/login");
  };

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
        "fixed left-0 top-0 h-full bg-[#0F2444] dark:bg-[#020617] flex flex-col z-50 overflow-hidden shadow-2xl transition-transform duration-300 transform lg:translate-x-0 w-[260px] border-r border-[#1a3a5c] dark:border-border/50",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header */}
      <div className="p-6">
        <p className="text-[10px] font-bold tracking-[0.2em] text-[#94B8D8] uppercase mb-4 opacity-70">Main Navigation</p>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/25">
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
      <div className="p-4 mt-auto border-t border-[#1a3a5c] dark:border-border/50 bg-[#0c1d36]/50 dark:bg-muted/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm ring-2 ring-[#0F2444] dark:ring-[#020617] shadow-inner">{user.charAt(0).toUpperCase()}</div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-white tracking-wide truncate">{user}</p>
              </div>
          </div>
          <button 
            onClick={handleLogout}
            title="Logout Session"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#1a3a5c] dark:border-border/50 hover:border-red-500/50 hover:bg-red-500/10 text-[#94B8D8] hover:text-red-500 transition-all group"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
    </>
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
            ? "bg-primary/15 text-primary" 
            : "hover:bg-white/5 text-white/70 hover:text-white"
        )}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[24px] bg-primary rounded-r-full" />
        )}
        <div className="flex items-center gap-3">
           {item.icon && <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "opacity-50 group-hover:opacity-100")} />}
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
