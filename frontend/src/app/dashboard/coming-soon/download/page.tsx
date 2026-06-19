"use client";

import React, { useState } from "react";
import { Download, Monitor, TerminalSquare, Box, ChevronDown, Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { Breadcrumbs } from "@/components/remake/Breadcrumbs";

const MySwal = withReactContent(Swal);
const swalTheme = { 
  background: 'var(--card)', 
  color: 'var(--foreground)', 
  customClass: { 
    popup: 'enterprise-card shadow-2xl border border-border', 
    confirmButton: 'premium-button premium-button-primary px-6 py-2 ml-4',
    cancelButton: 'premium-button bg-muted text-muted-foreground border border-border px-6 py-2'
  } 
};

type OSInfo = {
  id: string;
  name: string;
  icon: any;
  version: string;
  size: string;
  filename: string;
  command: string;
  color: string;
  bg: string;
};

export default function AgentDownloadPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const platforms: OSInfo[] = [
    {
      id: "windows",
      name: "Windows Server",
      icon: Monitor,
      version: "v2.4.1 (64-bit)",
      size: "24.8 MB",
      filename: "syncgo-agent-win64.exe",
      command: "Invoke-WebRequest -Uri https://your-master/dl/agent-win64.exe -OutFile agent.exe\n.\\agent.exe install",
      color: "text-blue-500",
      bg: "bg-blue-500/10"
    },
    {
      id: "debian",
      name: "Linux (Debian/Ubuntu)",
      icon: TerminalSquare,
      version: "v2.4.1 (amd64)",
      size: "18.2 MB",
      filename: "syncgo-agent_2.4.1_amd64.deb",
      command: "wget https://your-master/dl/agent.deb\nsudo dpkg -i agent.deb\nsudo systemctl start syncgo-agent",
      color: "text-orange-500",
      bg: "bg-orange-500/10"
    },
    {
      id: "rhel",
      name: "Linux (RHEL/CentOS)",
      icon: TerminalSquare,
      version: "v2.4.1 (x86_64)",
      size: "18.5 MB",
      filename: "syncgo-agent-2.4.1-1.x86_64.rpm",
      command: "curl -O https://your-master/dl/agent.rpm\nsudo rpm -ivh agent.rpm\nsudo systemctl start syncgo-agent",
      color: "text-red-500",
      bg: "bg-red-500/10"
    },
    {
      id: "docker",
      name: "Docker Container",
      icon: Box,
      version: "latest (Alpine based)",
      size: "45.0 MB",
      filename: "docker-compose.yml",
      command: "docker pull registry.syncgo.local/agent:latest\ndocker run -d --name syncgo-agent -e MASTER_URL=... registry.syncgo.local/agent:latest",
      color: "text-cyan-500",
      bg: "bg-cyan-500/10"
    }
  ];

  const handleDownload = (filename: string) => {
    MySwal.fire({
      title: 'Download Started',
      text: `Downloading ${filename}...`,
      icon: 'success',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      ...swalTheme
    });
  };

  const copyCommand = (id: string, command: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(command);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <Breadcrumbs />
      
      {/* Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <Download className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Agent Download</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Download and install the Sync-Go Agent on your target databases to join the consolidation cluster.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
        {platforms.map((platform) => {
          const Icon = platform.icon;
          const isExpanded = expandedId === platform.id;
          
          return (
            <div key={platform.id} className="enterprise-card flex flex-col overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/30 group">
              
              {/* Card Header & Main Info */}
              <div className="p-6 flex flex-col items-center text-center relative">
                <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", platform.bg, platform.color)}>
                  <Icon className="w-8 h-8" />
                </div>
                
                <h3 className="font-bold text-[16px] text-foreground mb-1">{platform.name}</h3>
                <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-muted-foreground mb-6">
                  <span>{platform.version}</span>
                  <span>•</span>
                  <span>{platform.size}</span>
                </div>
                
                <button 
                  onClick={() => handleDownload(platform.filename)}
                  className="w-full h-10 rounded-lg bg-primary hover:bg-primary/90 text-white text-[13px] font-bold shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Download className="w-4 h-4" /> Download Agent
                </button>
              </div>

              {/* Expandable CLI Instructions */}
              <div className="border-t border-border mt-auto">
                <button 
                  onClick={() => setExpandedId(isExpanded ? null : platform.id)}
                  className="w-full p-3 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  CLI Installation
                  <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isExpanded && "rotate-180")} />
                </button>
                
                <div className={cn(
                  "overflow-hidden transition-all duration-300 bg-[#0f111a] dark:bg-black/60",
                  isExpanded ? "max-h-48" : "max-h-0"
                )}>
                  <div className="p-4 relative">
                    <button 
                      onClick={(e) => copyCommand(platform.id, platform.command, e)}
                      className="absolute top-3 right-3 p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedId === platform.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <pre className="text-[#e2e8f0] font-mono text-[10px] leading-relaxed whitespace-pre-wrap pr-8">
                      {platform.command}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* System Requirements */}
      <div className="enterprise-card p-8 bg-muted/10 border-dashed">
        <h3 className="font-bold text-foreground mb-4">Minimum System Requirements</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-[13px]">
          <div>
            <div className="font-bold text-muted-foreground uppercase tracking-widest text-[10px] mb-1">CPU</div>
            <div className="font-semibold text-foreground">2 Cores (2.0 GHz+)</div>
          </div>
          <div>
            <div className="font-bold text-muted-foreground uppercase tracking-widest text-[10px] mb-1">Memory</div>
            <div className="font-semibold text-foreground">2 GB RAM</div>
          </div>
          <div>
            <div className="font-bold text-muted-foreground uppercase tracking-widest text-[10px] mb-1">Storage</div>
            <div className="font-semibold text-foreground">500 MB Available Space</div>
          </div>
          <div>
            <div className="font-bold text-muted-foreground uppercase tracking-widest text-[10px] mb-1">Network</div>
            <div className="font-semibold text-foreground">Outbound TCP Port 8080/443</div>
          </div>
        </div>
      </div>
    </div>
  );
}
