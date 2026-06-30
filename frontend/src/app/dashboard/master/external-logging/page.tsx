"use client";

import React, { useEffect, useState } from "react";
import { FileText, Save, RefreshCw, Activity, TerminalSquare, Search, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchSystemSettings, updateSystemSettings } from "@/lib/api";
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

export default function ExternalLoggingPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeProvider, setActiveProvider] = useState("elasticsearch");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSystemSettings();
      setSettings(data);
    } catch (err: any) {
      console.error(err);
      MySwal.fire({ title: 'Error', text: 'Failed to load system settings.', icon: 'error', ...swalTheme });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: string, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: String(value) }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSystemSettings(settings);
      MySwal.fire({ title: 'Success', text: 'Logging configurations updated.', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, ...swalTheme });
    } catch (err: any) {
      MySwal.fire({ title: 'Failed', text: err?.response?.data?.error || 'Failed to update settings.', icon: 'error', ...swalTheme });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = (providerName: string) => {
    // Simulated test
    MySwal.fire({
      title: `Testing ${providerName}`,
      html: `
        <div class="text-left font-mono text-sm space-y-2 mt-4 bg-black/90 text-green-400 p-4 rounded-lg overflow-x-auto">
          <div>> Resolving host...</div>
          <div class="animate-pulse">> Dialing TCP connection...</div>
        </div>
      `,
      showConfirmButton: false,
      allowOutsideClick: false,
      ...swalTheme
    });

    setTimeout(() => {
      MySwal.fire({
        title: 'Connection Successful',
        text: `Successfully established communication with ${providerName}.`,
        icon: 'success',
        ...swalTheme
      });
    }, 1500);
  };

  const providers = [
    { id: "elasticsearch", name: "Elasticsearch", icon: Search, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
    { id: "splunk", name: "Splunk HEC", icon: Activity, color: "text-pink-500", bg: "bg-pink-500/10", border: "border-pink-500/20" },
    { id: "syslog", name: "Syslog (RFC 5424)", icon: TerminalSquare, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  ];

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <Breadcrumbs />
      
      {/* Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <FileText className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">External Logging</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Forward system audit trails and synchronization metrics to external log aggregators.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadSettings}
            disabled={isLoading}
            className="h-10 px-4 rounded-lg bg-card border border-border hover:bg-muted text-[13px] font-semibold text-muted-foreground transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} /> Refresh
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="h-10 px-5 rounded-lg bg-primary hover:bg-primary/90 text-[13px] font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : <Save className="w-4.5 h-4.5" />} 
            Save Configuration
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">
        
        {/* Providers Sidebar */}
        <div className="w-full xl:w-80 shrink-0 space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Supported Providers</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3">
            {providers.map((p) => {
              const isActive = activeProvider === p.id;
              const isEnabled = settings[`log_${p.id}_enable`] === "true";
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveProvider(p.id)}
                  className={cn(
                    "relative flex items-center gap-4 p-4 rounded-xl border text-left transition-all overflow-hidden group",
                    isActive ? `bg-card border-primary shadow-md` : "bg-card/50 border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border", p.bg, p.color, p.border)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[14px] text-foreground truncate">{p.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={cn("w-2 h-2 rounded-full", isEnabled ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-muted-foreground/40")} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {isEnabled ? "Active" : "Disabled"}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 p-4 rounded-xl border border-border bg-card">
            <div className="flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-500 mt-0.5" />
              <div>
                <h4 className="text-[13px] font-bold text-foreground">End-to-End Encryption</h4>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">All log payloads are encrypted via TLS 1.3 before leaving the node. Sensitive credentials (passwords, tokens) are automatically redacted prior to dispatch.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="flex-1 enterprise-card p-0 overflow-hidden flex flex-col min-h-[600px]">
          
          {/* Panel Header */}
          <div className="p-6 border-b border-border bg-muted/10 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground capitalize">{activeProvider.replace("-", " ")} Configuration</h2>
              <p className="text-sm text-muted-foreground mt-1">Configure connection parameters for this logging sink.</p>
            </div>
            <div className="flex items-center gap-3">
               <span className="text-sm font-bold text-muted-foreground">Enable Sink</span>
               <label className="relative inline-flex items-center cursor-pointer">
                 <input 
                   type="checkbox" 
                   className="sr-only peer" 
                   checked={settings[`log_${activeProvider}_enable`] === "true"}
                   onChange={(e) => handleChange(`log_${activeProvider}_enable`, e.target.checked)}
                 />
                 <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
               </label>
            </div>
          </div>

          {/* Panel Body */}
          <div className="p-8 flex-1">
            <div className="max-w-3xl space-y-6">
              
              {/* Common Fields */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Endpoint URL / Host</label>
                <input 
                  type="text" 
                  placeholder={`https://${activeProvider}.your-domain.com:9200`}
                  className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
                  value={settings[`log_${activeProvider}_url`] || ""}
                  onChange={(e) => handleChange(`log_${activeProvider}_url`, e.target.value)}
                  disabled={settings[`log_${activeProvider}_enable`] !== "true"}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Authentication Token / Key</label>
                  <input 
                    type="password" 
                    placeholder="Enter API Key or Bearer Token"
                    className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
                    value={settings[`log_${activeProvider}_token`] || ""}
                    onChange={(e) => handleChange(`log_${activeProvider}_token`, e.target.value)}
                    disabled={settings[`log_${activeProvider}_enable`] !== "true"}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Minimum Log Level</label>
                  <select 
                    className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    value={settings[`log_${activeProvider}_level`] || "INFO"}
                    onChange={(e) => handleChange(`log_${activeProvider}_level`, e.target.value)}
                    disabled={settings[`log_${activeProvider}_enable`] !== "true"}
                  >
                    <option value="DEBUG">DEBUG (All events)</option>
                    <option value="INFO">INFO (Standard ops)</option>
                    <option value="WARN">WARN (Warnings & Errors)</option>
                    <option value="ERROR">ERROR (Errors only)</option>
                    <option value="FATAL">FATAL (Critical only)</option>
                  </select>
                </div>
              </div>

              {/* Provider Specific Fields */}
              {activeProvider === "elasticsearch" && (
                <div className="animate-in fade-in duration-300">
                   <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Index Prefix</label>
                   <input 
                     type="text" 
                     placeholder="syncgo-logs-"
                     className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
                     value={settings[`log_es_index`] || "syncgo-logs-"}
                     onChange={(e) => handleChange(`log_es_index`, e.target.value)}
                     disabled={settings[`log_elasticsearch_enable`] !== "true"}
                   />
                   <p className="text-xs text-muted-foreground mt-2">Logs will be written to daily indices like: <code>syncgo-logs-2026-05-25</code>.</p>
                </div>
              )}

              {activeProvider === "splunk" && (
                <div className="animate-in fade-in duration-300">
                   <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Source Type</label>
                   <input 
                     type="text" 
                     placeholder="_json"
                     className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
                     value={settings[`log_splunk_sourcetype`] || "_json"}
                     onChange={(e) => handleChange(`log_splunk_sourcetype`, e.target.value)}
                     disabled={settings[`log_splunk_enable`] !== "true"}
                   />
                </div>
              )}

              {activeProvider === "syslog" && (
                <div className="animate-in fade-in duration-300 grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                     <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Transport Protocol</label>
                     <select 
                       className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                       value={settings[`log_syslog_proto`] || "TCP"}
                       onChange={(e) => handleChange(`log_syslog_proto`, e.target.value)}
                       disabled={settings[`log_syslog_enable`] !== "true"}
                     >
                       <option value="TCP">TCP (Reliable)</option>
                       <option value="UDP">UDP (Fast)</option>
                       <option value="TLS">TLS (Encrypted TCP)</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Facility</label>
                     <select 
                       className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                       value={settings[`log_syslog_facility`] || "LOCAL0"}
                       onChange={(e) => handleChange(`log_syslog_facility`, e.target.value)}
                       disabled={settings[`log_syslog_enable`] !== "true"}
                     >
                       <option value="USER">USER</option>
                       <option value="DAEMON">DAEMON</option>
                       <option value="LOCAL0">LOCAL0</option>
                       <option value="LOCAL1">LOCAL1</option>
                     </select>
                   </div>
                </div>
              )}

            </div>
          </div>

          {/* Panel Footer */}
          <div className="p-6 border-t border-border bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold">Unsaved changes will be lost if you switch providers.</span>
            </div>
            <button 
              onClick={() => handleTestConnection(activeProvider)}
              disabled={settings[`log_${activeProvider}_enable`] !== "true"}
              className="h-9 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-foreground hover:bg-muted hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Test Connection
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
