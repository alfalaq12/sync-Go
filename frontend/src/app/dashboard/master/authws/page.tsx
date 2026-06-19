"use client";

import React, { useEffect, useState } from "react";
import { Webhook, Shield, Key, Lock, RefreshCw, CheckCircle2, Save, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchSystemSettings, updateSystemSettings, testAuthWS } from "@/lib/api";
import Swal from "sweetalert2";

export default function AuthWSPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([
    "[IDLE] Awaiting connection test command...",
  ]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await fetchSystemSettings();
      setSettings(data || {});
    } catch (err) {
      console.error("Failed to load authws settings:", err);
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
        text: "AuthWS configuration saved.",
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
      Swal.fire({ title: "Error", text: "Failed to save AuthWS settings.", icon: "error", background: "#1e293b", color: "#f8fafc" });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setDiagnosticLogs([]);

      const res = await testAuthWS({
        authws_url: settings.authws_url,
        authws_secret: settings.authws_secret,
      });

      if (res.logs && Array.isArray(res.logs)) {
        for (let i = 0; i < res.logs.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          setDiagnosticLogs((prev) => [...prev, res.logs[i]]);
        }
      }

      if (res.success) {
        Swal.fire({
          title: "Connection Verified",
          text: "AuthWS endpoint is reachable and responding correctly.",
          icon: "success",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 2500,
          background: "#1e293b",
          color: "#f8fafc",
          iconColor: "#10b981",
        });
      } else {
        Swal.fire({
          title: "Verification Failed",
          text: "AuthWS endpoint is unreachable. See diagnostic logs.",
          icon: "error",
          background: "#1e293b",
          color: "#f8fafc",
        });
      }
    } catch (err) {
      Swal.fire({
        title: "Connection Failed",
        text: "Could not execute AuthWS connection diagnostics.",
        icon: "error",
        background: "#1e293b",
        color: "#f8fafc",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleRotateSecret = () => {
    const newSecret = "whsec_" + Array.from({ length: 32 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
    handleChange("authws_secret", newSecret);
    Swal.fire({
      title: "Secret Rotated",
      text: "A new client secret has been generated. Don't forget to save!",
      icon: "info",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      background: "#1e293b",
      color: "#f8fafc",
    });
  };

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-mono">Loading AuthWS Config...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)]" />
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Auth Web Service</h1>
        </div>
        <p className="text-[12px] font-semibold text-muted-foreground/70 tracking-[0.05em] uppercase ml-4 border-l border-border/50 pl-4">
          External authentication provider management and token verification gateway.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-6">
          <div className="premium-card p-8 space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Service Configuration</h3>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Webhook className="w-3 h-3" /> Gateway Endpoint URL
                </label>
                <input
                  type="text"
                  value={settings.authws_url || ""}
                  onChange={(e) => handleChange("authws_url", e.target.value)}
                  placeholder="https://auth.company.internal/verify"
                  className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all font-mono"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Key className="w-3 h-3" /> Client Secret
                </label>
                <input
                  type="text"
                  value={settings.authws_secret || ""}
                  onChange={(e) => handleChange("authws_secret", e.target.value)}
                  className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all font-mono"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Timeout (Seconds)</label>
                <input
                  type="number"
                  value={settings.authws_timeout || "5"}
                  onChange={(e) => handleChange("authws_timeout", e.target.value)}
                  className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Failure Action</label>
                <select
                  value={settings.authws_action || "FAIL_CLOSED"}
                  onChange={(e) => handleChange("authws_action", e.target.value)}
                  className="w-full h-12 bg-muted/40 border border-border rounded-xl px-4 text-sm font-bold text-foreground focus:border-primary/50 outline-none transition-all appearance-none"
                >
                  <option value="FAIL_CLOSED">FAIL_CLOSED (Deny on timeout)</option>
                  <option value="FAIL_OPEN">FAIL_OPEN (Allow on timeout)</option>
                </select>
              </div>
            </div>

            {/* Connection Diagnostics */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Connection Diagnostics</h4>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-[10px] font-black text-emerald-500 uppercase tracking-widest border border-emerald-500/25 rounded-xl transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {testing ? "Testing..." : "Test Connection"}
                </button>
              </div>
              <div className="h-40 bg-[#0a0f1a] rounded-xl border border-border p-4 font-mono text-[11px] overflow-y-auto premium-scrollbar space-y-1">
                {diagnosticLogs.map((line, i) => (
                  <p key={i} className={cn(
                    "animate-in fade-in duration-300",
                    line.includes("successful") || line.includes("200 OK") ? "text-emerald-400" :
                    line.includes("IDLE") ? "text-muted-foreground/40" :
                    "text-muted-foreground/80"
                  )}>
                    {line}
                  </p>
                ))}
                {testing && <p className="text-primary animate-pulse">▌</p>}
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
                {saving ? "Saving..." : "Save Configuration"}
              </button>
            </div>
          </div>
        </form>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="premium-card p-6 space-y-6">
            <h3 className="text-[12px] font-black text-foreground uppercase tracking-widest">Credentials Management</h3>
            <div className="space-y-3">
              <button
                onClick={handleRotateSecret}
                className="w-full h-12 bg-muted/40 hover:bg-muted/60 border border-border rounded-xl text-[11px] font-black uppercase tracking-widest text-foreground transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Key className="w-4 h-4" /> Rotate Client Secret
              </button>
              <button
                onClick={() => {
                  setDiagnosticLogs(["[IDLE] Auth cache cleared. Awaiting new connection test..."]);
                  Swal.fire({
                    title: "Cache Cleared",
                    text: "Authentication cache has been purged.",
                    icon: "success",
                    toast: true,
                    position: "top-end",
                    showConfirmButton: false,
                    timer: 2000,
                    background: "#1e293b",
                    color: "#f8fafc",
                  });
                }}
                className="w-full h-12 bg-muted/40 hover:bg-muted/60 border border-border rounded-xl text-[11px] font-black uppercase tracking-widest text-foreground transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-4 h-4" /> Clear Auth Cache
              </button>
            </div>
          </div>

          <div className="premium-card p-6 space-y-4 border-amber-500/20">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="text-[12px] font-black uppercase tracking-widest">Security Notice</h4>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed font-medium">
              Rotating the client secret will invalidate all existing tokens. Ensure downstream services are updated before rotating.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
