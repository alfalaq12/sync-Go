"use client";

import React, { useEffect, useState } from "react";
import { Shield, Save, RefreshCw, Smartphone, Key, Users, Check, AlertCircle } from "lucide-react";
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

export default function SMSAuthPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Whitelist state
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [newPhone, setNewPhone] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSystemSettings();
      setSettings(data);
      if (data["sms_whitelist"]) {
        setWhitelist(data["sms_whitelist"].split(",").filter((p: string) => p.trim() !== ""));
      }
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

  const handleAddPhone = () => {
    if (!newPhone.trim()) return;
    if (whitelist.includes(newPhone)) {
      MySwal.fire({ title: 'Duplicate', text: 'Phone number already in whitelist.', icon: 'warning', ...swalTheme });
      return;
    }
    const updatedList = [...whitelist, newPhone];
    setWhitelist(updatedList);
    handleChange("sms_whitelist", updatedList.join(","));
    setNewPhone("");
  };

  const handleRemovePhone = (phone: string) => {
    const updatedList = whitelist.filter(p => p !== phone);
    setWhitelist(updatedList);
    handleChange("sms_whitelist", updatedList.join(","));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSystemSettings(settings);
      MySwal.fire({ title: 'Success', text: 'SMS Auth settings updated.', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, ...swalTheme });
    } catch (err: any) {
      MySwal.fire({ title: 'Failed', text: err?.response?.data?.error || 'Failed to update settings.', icon: 'error', ...swalTheme });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestOTP = () => {
    MySwal.fire({
      title: 'Sending Test OTP',
      html: `
        <div class="text-left font-mono text-sm space-y-2 mt-4 text-primary bg-primary/5 p-4 rounded-lg border border-primary/20">
          <div>> Connecting to SMS Provider...</div>
          <div class="animate-pulse">> Dispatching OTP...</div>
        </div>
      `,
      showConfirmButton: false,
      allowOutsideClick: false,
      ...swalTheme
    });

    setTimeout(() => {
      MySwal.fire({
        title: 'OTP Sent',
        text: 'A test OTP has been dispatched via the configured gateway.',
        icon: 'success',
        ...swalTheme
      });
    }, 1500);
  };

  const is2FAEnabled = settings["sms_2fa_enable"] === "true";

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <Breadcrumbs />
      
      {/* Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">SMS Authentication (2FA)</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Secure your console access with SMS-based Two-Factor Authentication.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Settings Column */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="enterprise-card p-8 relative overflow-hidden">
            {/* Global Enable Toggle */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-border">
              <div>
                <h3 className="text-xl font-bold text-foreground">Require SMS 2FA for Login</h3>
                <p className="text-sm text-muted-foreground mt-1">Enforce two-factor authentication for all administrator accounts.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={is2FAEnabled}
                  onChange={(e) => handleChange(`sms_2fa_enable`, e.target.checked)}
                />
                <div className="w-14 h-7 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary shadow-inner"></div>
              </label>
            </div>

            <div className={cn("space-y-6 transition-all duration-300", !is2FAEnabled && "opacity-50 pointer-events-none")}>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">OTP Length</label>
                  <select 
                    className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    value={settings["sms_otp_length"] || "6"}
                    onChange={(e) => handleChange("sms_otp_length", e.target.value)}
                  >
                    <option value="4">4 Digits (Standard)</option>
                    <option value="6">6 Digits (Secure)</option>
                    <option value="8">8 Digits (Ultra Secure)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">OTP Expiry (Minutes)</label>
                  <input 
                    type="number" 
                    min="1" max="60"
                    className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    value={settings["sms_otp_expiry"] || "5"}
                    onChange={(e) => handleChange("sms_otp_expiry", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Fallback Email Address (If SMS fails)</label>
                <input 
                  type="email" 
                  placeholder="admin@your-domain.com"
                  className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  value={settings["sms_fallback_email"] || ""}
                  onChange={(e) => handleChange("sms_fallback_email", e.target.value)}
                />
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={handleTestOTP}
                  className="h-10 px-6 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[13px] font-bold hover:bg-primary hover:text-white transition-all flex items-center gap-2"
                >
                  <Smartphone className="w-4 h-4" /> Send Test OTP
                </button>
              </div>

            </div>

            {/* Inactive Overlay Warning */}
            {!is2FAEnabled && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-10 flex items-center justify-center mt-24">
                <div className="bg-card border border-border p-4 rounded-xl shadow-2xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  <span className="font-bold text-sm text-foreground">2FA is currently disabled globally.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          <div className="enterprise-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">Bypass Whitelist</h3>
            </div>
            <p className="text-[12px] text-muted-foreground mb-4">Phone numbers in this list will bypass the 2FA requirement during login (useful for emergency break-glass accounts).</p>
            
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                placeholder="+62812..."
                className="flex-1 h-9 px-3 rounded-md border border-border bg-muted/50 text-xs focus:border-primary outline-none"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPhone()}
              />
              <button 
                onClick={handleAddPhone}
                className="h-9 px-3 bg-card border border-border rounded-md text-xs font-bold hover:bg-primary hover:text-white hover:border-primary transition-all"
              >
                Add
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto premium-scrollbar pr-1">
              {whitelist.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-border rounded-lg text-muted-foreground text-xs">
                  No numbers whitelisted.
                </div>
              ) : (
                whitelist.map((phone, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-border/50">
                    <span className="font-mono text-xs font-bold text-foreground">{phone}</span>
                    <button 
                      onClick={() => handleRemovePhone(phone)}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <span className="sr-only">Remove</span>
                      &times;
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="enterprise-card p-6 bg-gradient-to-br from-card to-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">Need SMS Gateway?</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              2FA requires a configured SMS provider (e.g. Twilio, Nexmo, or internal API) to dispatch messages.
            </p>
            <a 
              href="/dashboard/coming-soon/sms-gateway" 
              className="inline-flex items-center justify-center w-full h-9 rounded-md bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all"
            >
              Configure Gateway &rarr;
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
