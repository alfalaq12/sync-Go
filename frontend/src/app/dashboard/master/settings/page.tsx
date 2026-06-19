"use client";

import React, { useEffect, useState } from "react";
import { Settings, Shield, Bell, Globe, Database, Key, Save, RefreshCw, Smartphone, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchSystemSettings, updateSystemSettings } from "@/lib/api";
import Swal from "sweetalert2";

export default function MasterSettingsPage() {
  const [activeTab, setActiveTab] = useState("General");
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchSystemSettings();
      setSettings(data || {});
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setSettings((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateSystemSettings(settings);
      Swal.fire({
        title: "Success",
        text: "Global system configurations saved successfully.",
        icon: "success",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2000,
        background: "#1e293b",
        color: "#f8fafc",
        iconColor: "#10b981",
      });
    } catch (err) {
      Swal.fire({
        title: "Error",
        text: "Failed to save settings.",
        icon: "error",
        background: "#1e293b",
        color: "#f8fafc",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-mono">Loading System Configurations...</p>
      </div>
    );
  }

  const tabs = [
    { label: "General", icon: Settings },
    { label: "Security", icon: Shield },
    { label: "Notifications", icon: Bell },
    { label: "API & Webhooks", icon: Globe },
    { label: "Database", icon: Database },
    { label: "Keys & Tokens", icon: Key },
    { label: "SMS Gateway", icon: Smartphone },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-primary rounded-full shadow-[0_0_12px_rgba(99,102,241,0.4)]" />
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">System Settings</h1>
        </div>
        <p className="text-[12px] font-semibold text-muted-foreground/70 tracking-[0.05em] uppercase ml-4 border-l border-border/50 pl-4">
          Configure global system parameters, security policies, and integrations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-2">
          {tabs.map((item) => (
            <button 
              key={item.label}
              onClick={() => setActiveTab(item.label)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer",
                activeTab === item.label
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Settings Content Form */}
        <form onSubmit={handleSave} className="lg:col-span-3 space-y-8">
          <div className="premium-card p-10 space-y-10">
            
            {/* General Tab */}
            {activeTab === "General" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">General Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Platform Name</label>
                    <input 
                      type="text" 
                      value={settings.platform_name || ""} 
                      onChange={(e) => handleInputChange("platform_name", e.target.value)}
                      className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">System Region</label>
                    <select 
                      value={settings.system_region || ""} 
                      onChange={(e) => handleInputChange("system_region", e.target.value)}
                      className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all appearance-none"
                    >
                      <option value="Jakarta-Region-01 (ID-JKT)">Jakarta-Region-01 (ID-JKT)</option>
                      <option value="Singapore-Region-01 (SG-SIN)">Singapore-Region-01 (SG-SIN)</option>
                      <option value="Tokyo-Region-01 (JP-TKY)">Tokyo-Region-01 (JP-TKY)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border">
                    <div>
                      <p className="text-sm font-bold text-foreground">Maintenance Mode</p>
                      <p className="text-[11px] text-muted-foreground">Disable all public API access and sync engines.</p>
                    </div>
                    <div 
                      onClick={() => handleInputChange("maintenance_mode", settings.maintenance_mode === "true" ? "false" : "true")}
                      className={cn(
                        "w-12 h-6 rounded-full relative p-1 cursor-pointer transition-all duration-300",
                        settings.maintenance_mode === "true" ? "bg-red-500" : "bg-muted-foreground/30"
                      )}
                    >
                      <div className={cn("w-4 h-4 rounded-full bg-white transition-all duration-300", settings.maintenance_mode === "true" && "ml-6")} />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border">
                    <div>
                      <p className="text-sm font-bold text-foreground">Auto-Cleanup Logs</p>
                      <p className="text-[11px] text-muted-foreground">Automatically delete logs older than 30 days.</p>
                    </div>
                    <div 
                      onClick={() => handleInputChange("auto_cleanup_logs", settings.auto_cleanup_logs === "true" ? "false" : "true")}
                      className={cn(
                        "w-12 h-6 rounded-full relative p-1 cursor-pointer transition-all duration-300",
                        settings.auto_cleanup_logs === "true" ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    >
                      <div className={cn("w-4 h-4 rounded-full bg-white transition-all duration-300", settings.auto_cleanup_logs === "true" && "ml-6")} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "Security" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">Security & Authentication</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Max Login Attempts</label>
                    <input 
                      type="number" 
                      value={settings.max_login_attempts || 5} 
                      onChange={(e) => handleInputChange("max_login_attempts", e.target.value)}
                      className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Session Timeout (Minutes)</label>
                    <input 
                      type="number" 
                      value={settings.session_timeout || 120} 
                      onChange={(e) => handleInputChange("session_timeout", e.target.value)}
                      className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all" 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "Notifications" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">SMTP Email Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">SMTP Host</label>
                    <input 
                      type="text" 
                      value={settings.smtp_host || ""} 
                      onChange={(e) => handleInputChange("smtp_host", e.target.value)}
                      className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">SMTP Port</label>
                    <input 
                      type="text" 
                      value={settings.smtp_port || ""} 
                      onChange={(e) => handleInputChange("smtp_port", e.target.value)}
                      className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">SMTP Username</label>
                    <input 
                      type="email" 
                      value={settings.smtp_user || ""} 
                      onChange={(e) => handleInputChange("smtp_user", e.target.value)}
                      className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">SMTP Password</label>
                    <input 
                      type="password" 
                      value={settings.smtp_pass || ""} 
                      onChange={(e) => handleInputChange("smtp_pass", e.target.value)}
                      className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all" 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Webhooks Tab */}
            {activeTab === "API & Webhooks" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">Authentication Webhook</h3>
                <div className="grid grid-cols-1 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Webhook Endpoint URL</label>
                    <input 
                      type="text" 
                      value={settings.authws_url || ""} 
                      onChange={(e) => handleInputChange("authws_url", e.target.value)}
                      className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Shared Secret Token</label>
                    <input 
                      type="text" 
                      value={settings.authws_secret || ""} 
                      onChange={(e) => handleInputChange("authws_secret", e.target.value)}
                      className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all" 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Database Tab */}
            {activeTab === "Database" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">Primary System Database</h3>
                <div className="p-6 rounded-2xl bg-muted/20 border border-border flex items-center gap-4">
                  <Database className="w-10 h-10 text-primary shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-foreground">PostgreSQL 15 Cluster</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">Host: syncgo-db | Connection Status: Online</p>
                  </div>
                  <div className="ml-auto px-4 py-1.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">Optimal</div>
                </div>
              </div>
            )}

            {/* Keys Tab */}
            {activeTab === "Keys & Tokens" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">Authentication Keys</h3>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-border bg-muted/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-foreground">JWT Signature Key</p>
                      <p className="text-[10px] font-mono text-muted-foreground mt-0.5">HS256 · 256 bits payload entropy</p>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Autogenerated</span>
                  </div>
                </div>
              </div>
            )}

            {/* SMS Gateway Tab */}
            {activeTab === "SMS Gateway" && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">SMS Gateway Credentials</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">SMS API Endpoint</label>
                    <input 
                      type="text" 
                      value={settings.sms_api || ""} 
                      onChange={(e) => handleInputChange("sms_api", e.target.value)}
                      className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">SMS Secret Key</label>
                    <input 
                      type="password" 
                      value={settings.sms_key || ""} 
                      onChange={(e) => handleInputChange("sms_key", e.target.value)}
                      className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all" 
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-6 border-t border-border/40">
              <button 
                type="submit" 
                disabled={saving}
                className="h-14 px-10 bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 cursor-pointer disabled:opacity-75 disabled:active:scale-100"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Saving Changes
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>

          </div>
        </form>

      </div>
    </div>
  );
}
