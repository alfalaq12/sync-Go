"use client";

import React, { useEffect, useState } from "react";
import { MessageSquare, Save, RefreshCw, Smartphone, Webhook, Zap, AlertTriangle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchSystemSettings, updateSystemSettings, sendTestNotification } from "@/lib/api";
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

export default function SMSGatewayPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("twilio");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await fetchSystemSettings();
      setSettings(data);
      if (data["sms_provider"]) {
        setActiveTab(data["sms_provider"]);
      }
    } catch (err: any) {
      console.error(err);
      MySwal.fire({ title: 'Error', text: 'Failed to load system settings.', icon: 'error', ...swalTheme });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleProviderChange = (provider: string) => {
    setActiveTab(provider);
    handleChange("sms_provider", provider);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSystemSettings(settings);
      MySwal.fire({ title: 'Success', text: 'SMS Gateway configurations updated.', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, ...swalTheme });
    } catch (err: any) {
      MySwal.fire({ title: 'Failed', text: err?.response?.data?.error || 'Failed to update settings.', icon: 'error', ...swalTheme });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestGateway = async () => {
    MySwal.fire({
      title: 'Testing SMS Gateway',
      html: `
        <div class="text-left font-mono text-sm space-y-2 mt-4 text-primary bg-primary/5 p-4 rounded-lg border border-primary/20 overflow-x-auto">
          <div>> Dispatching payload to Provider (${activeTab.toUpperCase()})...</div>
          <div class="animate-pulse">> Waiting for response...</div>
        </div>
      `,
      showConfirmButton: false,
      allowOutsideClick: false,
      ...swalTheme
    });

    try {
      const res = await sendTestNotification({
        channel: "SMS Gateway",
        target: settings["sms_api"] || "http://mock-sms-gateway.local"
      });
      MySwal.fire({
        title: 'Gateway Test Successful',
        text: res.message || 'SMS dispatched successfully.',
        icon: 'success',
        ...swalTheme
      });
    } catch (err: any) {
      MySwal.fire({
        title: 'Gateway Test Failed',
        text: err?.response?.data?.error || 'Failed to dispatch test SMS.',
        icon: 'error',
        ...swalTheme
      });
    }
  };

  const templateContent = settings["sms_template"] || "Your Sync-Go verification code is: {OTP}. Valid for {EXPIRY} minutes. Do not share this code with anyone.";

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <Breadcrumbs />
      
      {/* Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">SMS Gateway Provider</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Configure your SMS dispatch provider for 2FA and system alert notifications.</p>
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
              onClick={() => handleProviderChange("twilio")}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-lg text-[13px] font-bold transition-all text-left",
                activeTab === "twilio" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-3">
                <Smartphone className="w-4 h-4" /> Twilio
              </div>
              {activeTab === "twilio" && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
            </button>
            <button
              onClick={() => handleProviderChange("nexmo")}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-lg text-[13px] font-bold transition-all text-left",
                activeTab === "nexmo" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4" /> Nexmo / Vonage
              </div>
              {activeTab === "nexmo" && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
            </button>
            <button
              onClick={() => handleProviderChange("custom")}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-lg text-[13px] font-bold transition-all text-left",
                activeTab === "custom" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <div className="flex items-center gap-3">
                <Webhook className="w-4 h-4" /> Custom HTTP
              </div>
              {activeTab === "custom" && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 enterprise-card flex flex-col min-h-[600px] overflow-hidden">
          
          <div className="p-8 flex-1">
            <h3 className="text-xl font-bold text-foreground capitalize mb-1">{activeTab.replace("-", " ")} Integration</h3>
            <p className="text-[13px] text-muted-foreground mb-8">Enter the API credentials provided by your SMS vendor.</p>
            
            <div className="space-y-6 max-w-3xl">
              
              {/* Common Credentials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Account SID / API Key</label>
                  <input 
                    type="password" 
                    placeholder="Enter API Key"
                    className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
                    value={settings[`sms_api`] || ""}
                    onChange={(e) => handleChange("sms_api", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Auth Token / API Secret</label>
                  <input 
                    type="password" 
                    placeholder="Enter Secret Key"
                    className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
                    value={settings[`sms_key`] || ""}
                    onChange={(e) => handleChange("sms_key", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Sender ID / From Number</label>
                <input 
                  type="text" 
                  placeholder="e.g. +1234567890 or SYNCGO"
                  className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
                  value={settings[`sms_phone`] || ""}
                  onChange={(e) => handleChange("sms_phone", e.target.value)}
                />
              </div>

              {/* Custom HTTP specifics */}
              {activeTab === "custom" && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-6 border-t border-border pt-6 mt-6">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">HTTP Endpoint URL</label>
                    <input 
                      type="text" 
                      placeholder="https://your-api.com/v1/sms/send"
                      className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
                      value={settings[`sms_custom_url`] || ""}
                      onChange={(e) => handleChange("sms_custom_url", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">HTTP Method</label>
                      <select 
                        className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
                        value={settings[`sms_custom_method`] || "POST"}
                        onChange={(e) => handleChange("sms_custom_method", e.target.value)}
                      >
                        <option value="POST">POST (JSON Payload)</option>
                        <option value="GET">GET (Query Params)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Custom Headers (JSON)</label>
                      <input 
                        type="text" 
                        placeholder='{"Content-Type": "application/json"}'
                        className="w-full h-11 px-4 rounded-lg bg-muted/50 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono"
                        value={settings[`sms_custom_headers`] || ""}
                        onChange={(e) => handleChange("sms_custom_headers", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Message Template Editor */}
              <div className="border-t border-border pt-8 mt-8">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-foreground mb-4 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" /> SMS Message Template
                </label>
                <div className="relative">
                  <textarea 
                    className="w-full h-32 p-4 rounded-lg bg-muted/30 border border-border text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono resize-none leading-relaxed text-foreground"
                    value={templateContent}
                    onChange={(e) => handleChange("sms_template", e.target.value)}
                  />
                  <div className="absolute top-4 right-4 text-xs font-bold text-muted-foreground/50">
                    {templateContent.length}/160 chars
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="px-2 py-1 rounded bg-muted text-[10px] font-mono font-bold text-muted-foreground">{"{OTP}"}</span>
                  <span className="px-2 py-1 rounded bg-muted text-[10px] font-mono font-bold text-muted-foreground">{"{EXPIRY}"}</span>
                  <span className="px-2 py-1 rounded bg-muted text-[10px] font-mono font-bold text-muted-foreground">{"{USER}"}</span>
                  <span className="text-[10px] text-muted-foreground flex items-center ml-2">Click placeholders to use in template</span>
                </div>
              </div>

            </div>
          </div>

          {/* Panel Footer */}
          <div className="p-6 border-t border-border bg-muted/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-500">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold">Testing will send a real SMS and may incur charges.</span>
            </div>
            <button 
              onClick={handleTestGateway}
              className="h-10 px-6 rounded-lg bg-foreground text-background text-[13px] font-bold hover:bg-foreground/90 transition-all flex items-center gap-2 shadow-lg"
            >
              <Send className="w-4 h-4" /> Test Gateway Connection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
