"use client";

import React, { useEffect, useState } from "react";
import { Monitor, Layout, Layers, Save, Loader2, Globe, Lock, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchSystemSettings, updateSystemSettings } from "@/lib/api";
import Swal from "sweetalert2";

export default function InterfaceSettingsPage() {
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
      console.error("Failed to load interface settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateSystemSettings(settings);
      Swal.fire({
        title: "Success",
        text: "Interface configurations saved successfully.",
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
      Swal.fire({ title: "Error", text: "Failed to save interface settings.", icon: "error", background: "#1e293b", color: "#f8fafc" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-mono">Loading Interface Config...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-purple-500 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.4)]" />
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Interface Configuration</h1>
        </div>
        <p className="text-[12px] font-semibold text-muted-foreground/70 tracking-[0.05em] uppercase ml-4 border-l border-border/50 pl-4">
          Configure network ports, SSL certificates, and service interfaces.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Port Configuration */}
        <div className="premium-card p-10 space-y-10">
          <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">Service Ports</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { key: "http_port", label: "HTTP Port", icon: Globe, placeholder: "80" },
              { key: "https_port", label: "HTTPS Port", icon: Lock, placeholder: "443" },
              { key: "grpc_port", label: "gRPC Port", icon: Wifi, placeholder: "9090" },
              { key: "ws_port", label: "WebSocket Port", icon: Monitor, placeholder: "8080" },
            ].map((item) => (
              <div key={item.key} className="space-y-3">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                  <item.icon className="w-3 h-3" />
                  {item.label}
                </label>
                <input
                  type="text"
                  value={settings[item.key] || ""}
                  onChange={(e) => handleChange(item.key, e.target.value)}
                  placeholder={item.placeholder}
                  className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all font-mono"
                />
              </div>
            ))}
          </div>

          {/* SSL Configuration */}
          <div className="space-y-8 pt-8 border-t border-border/40">
            <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">SSL / TLS Certificate</h3>
            
            <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border">
              <div>
                <p className="text-sm font-bold text-foreground">Enable SSL/TLS</p>
                <p className="text-[11px] text-muted-foreground">Force HTTPS on all incoming requests.</p>
              </div>
              <div
                onClick={() => handleChange("ssl_enable", settings.ssl_enable === "true" ? "false" : "true")}
                className={cn(
                  "w-12 h-6 rounded-full relative p-1 cursor-pointer transition-all duration-300",
                  settings.ssl_enable === "true" ? "bg-primary" : "bg-muted-foreground/30"
                )}
              >
                <div className={cn("w-4 h-4 rounded-full bg-white transition-all duration-300", settings.ssl_enable === "true" && "ml-6")} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Certificate Path</label>
                <input
                  type="text"
                  value={settings.ssl_cert || ""}
                  onChange={(e) => handleChange("ssl_cert", e.target.value)}
                  placeholder="/etc/certs/syncgo.crt"
                  className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all font-mono"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Private Key Path</label>
                <input
                  type="text"
                  value={settings.ssl_key || ""}
                  onChange={(e) => handleChange("ssl_key", e.target.value)}
                  placeholder="/etc/certs/syncgo.key"
                  className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="pt-6 border-t border-border/40">
            <button
              type="submit"
              disabled={saving}
              className="h-14 px-10 bg-primary text-primary-foreground font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3 cursor-pointer disabled:opacity-75"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {saving ? "Saving..." : "Save Interface Config"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
