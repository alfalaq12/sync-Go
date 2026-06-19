"use client";

import React, { useEffect, useState } from "react";
import { Settings, Save, RefreshCw, Layers, Zap, Clock, Shield } from "lucide-react";
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

export default function ConsolidationSettingsPage() {
  const [activeTab, setActiveTab] = useState("General");
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
      MySwal.fire({
        title: 'Error',
        text: 'Failed to load system settings. Ensure backend is running.',
        icon: 'error',
        ...swalTheme
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSystemSettings(settings);
      MySwal.fire({
        title: 'Success',
        text: 'Consolidation settings updated successfully.',
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        ...swalTheme
      });
    } catch (err: any) {
      MySwal.fire({
        title: 'Failed',
        text: err?.response?.data?.error || 'Failed to update settings.',
        icon: 'error',
        ...swalTheme
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <Breadcrumbs />
      
      {/* Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Settings className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Consolidation Settings</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Configure global policies, sync intervals, and performance tuning for all consolidation jobs.</p>
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

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full lg:w-64 shrink-0">
          <div className="enterprise-card p-3 flex flex-col gap-1">
            <button
              onClick={() => setActiveTab("General")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] font-bold transition-all text-left",
                activeTab === "General" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Layers className="w-4 h-4" /> General Parameters
            </button>
            <button
              onClick={() => setActiveTab("Sync")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] font-bold transition-all text-left",
                activeTab === "Sync" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Clock className="w-4 h-4" /> Sync Policies
            </button>
            <button
              onClick={() => setActiveTab("Performance")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] font-bold transition-all text-left",
                activeTab === "Performance" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Zap className="w-4 h-4" /> Performance Tuning
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 enterprise-card p-8">
          {activeTab === "General" && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">General Parameters</h3>
                <p className="text-[13px] text-muted-foreground mb-6">Basic configuration for data consolidation behavior.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Default Global Batch Size</label>
                    <input 
                      type="number" 
                      className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      value={settings["cons_batch_size"] || "5000"}
                      onChange={(e) => handleChange("cons_batch_size", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">Number of records processed per batch operation.</p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Conflict Resolution Strategy</label>
                    <select 
                      className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      value={settings["cons_conflict_strategy"] || "overwrite"}
                      onChange={(e) => handleChange("cons_conflict_strategy", e.target.value)}
                    >
                      <option value="overwrite">Master Wins (Overwrite Target)</option>
                      <option value="ignore">Target Wins (Ignore Incoming)</option>
                      <option value="latest">Timestamp Wins (Latest Modified)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Data Retention (Days)</label>
                    <input 
                      type="number" 
                      className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      value={settings["cons_retention_days"] || "30"}
                      onChange={(e) => handleChange("cons_retention_days", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">Number of days to keep synchronization history logs.</p>
                  </div>
                  <div className="flex items-center gap-4 mt-6 p-4 rounded-lg border border-border bg-muted/20">
                    <input 
                      type="checkbox" 
                      id="enable_compression"
                      className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                      checked={settings["cons_enable_compression"] === "true"}
                      onChange={(e) => handleChange("cons_enable_compression", e.target.checked ? "true" : "false")}
                    />
                    <div>
                      <label htmlFor="enable_compression" className="block text-sm font-bold text-foreground">Enable Payload Compression</label>
                      <p className="text-xs text-muted-foreground mt-0.5">Compress data payloads over the network (GZIP).</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Sync" && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">Synchronization Policies</h3>
                <p className="text-[13px] text-muted-foreground mb-6">Configure how and when the synchronization engine operates.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Global Retry Limit</label>
                    <input 
                      type="number" 
                      className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      value={settings["cons_retry_limit"] || "3"}
                      onChange={(e) => handleChange("cons_retry_limit", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Retry Delay (Seconds)</label>
                    <input 
                      type="number" 
                      className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      value={settings["cons_retry_delay"] || "60"}
                      onChange={(e) => handleChange("cons_retry_delay", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Fallback Execution Engine</label>
                    <select 
                      className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      value={settings["cons_fallback_engine"] || "standard"}
                      onChange={(e) => handleChange("cons_fallback_engine", e.target.value)}
                    >
                      <option value="standard">Standard Internal Engine</option>
                      <option value="legacy">Legacy Compatibility Mode</option>
                      <option value="failover">Strict Failover Mode</option>
                    </select>
                  </div>
                </div>
                
                <div className="mt-8 p-5 rounded-xl border border-border bg-blue-500/5">
                  <div className="flex items-start gap-4">
                    <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-foreground">Advanced Synchronization Features</h4>
                      <p className="text-xs text-muted-foreground mt-1">To enable advanced features like bi-directional syncing, delta-only updates with hashing, and cross-database schema mapping, please upgrade your license to the Enterprise Edition.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Performance" && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-bold text-foreground mb-1">Performance Tuning</h3>
                <p className="text-[13px] text-muted-foreground mb-6">Optimize resource usage for heavy consolidation tasks.</p>
                
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Max Concurrent Jobs</label>
                    <input 
                      type="range" 
                      min="1" max="100" 
                      className="w-full accent-primary"
                      value={settings["cons_max_jobs"] || "10"}
                      onChange={(e) => handleChange("cons_max_jobs", e.target.value)}
                    />
                    <div className="flex justify-between text-xs font-bold text-primary mt-2">
                      <span>1</span>
                      <span>{settings["cons_max_jobs"] || "10"} Jobs</span>
                      <span>100</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Worker Threads per Job</label>
                      <select 
                        className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        value={settings["cons_worker_threads"] || "4"}
                        onChange={(e) => handleChange("cons_worker_threads", e.target.value)}
                      >
                        <option value="1">1 (Single-threaded)</option>
                        <option value="2">2 Threads</option>
                        <option value="4">4 Threads (Recommended)</option>
                        <option value="8">8 Threads (High Performance)</option>
                        <option value="16">16 Threads (Extreme)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Query Timeout (Seconds)</label>
                      <input 
                        type="number" 
                        className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        value={settings["cons_query_timeout"] || "300"}
                        onChange={(e) => handleChange("cons_query_timeout", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
