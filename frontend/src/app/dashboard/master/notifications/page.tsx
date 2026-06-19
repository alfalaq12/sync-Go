"use client";

import React, { useEffect, useState } from "react";
import { Bell, MessageSquare, Mail, Smartphone, ShieldAlert, CheckCircle2, Search, Filter, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchSystemSettings, sendTestNotification } from "@/lib/api";
import Swal from "sweetalert2";

export default function NotificationsPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [sendingTest, setSendingTest] = useState<string | null>(null);

  const [history, setHistory] = useState([
    { type: "System", message: "Kernel update deployed to NODE-01", time: "2 hours ago", status: "Read" },
    { type: "Security", message: "Failed login attempt from 192.168.1.100", time: "5 hours ago", status: "Unread" },
    { type: "Job", message: "Consolidation Job #1024 completed successfully", time: "1 day ago", status: "Read" },
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
      console.error("Failed to load notifications settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async (channel: string) => {
    let target = "";
    if (channel === "Email SMTP") {
      target = settings.smtp_user || "alert@syncgo.io";
    } else if (channel === "SMS Gateway") {
      target = settings.sms_phone || "+628123456789";
    } else {
      target = settings.authws_url || "https://auth.company.internal/verify";
    }

    const { value: targetVal } = await Swal.fire({
      title: `Send Test Alert via ${channel}`,
      input: "text",
      inputLabel: `Enter target destination:`,
      inputValue: target,
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) return "You need to specify a target destination!";
      },
      background: "#1e293b",
      color: "#f8fafc",
      confirmButtonColor: "#4f46e5",
    });

    if (!targetVal) return;

    try {
      setSendingTest(channel);
      const res = await sendTestNotification({ channel, target: targetVal });
      
      // Add mock notification to history
      setHistory((prev) => [
        { type: "System", message: `Test warning successfully dispatched to ${targetVal}`, time: "Just now", status: "Unread" },
        ...prev,
      ]);

      Swal.fire({
        title: "Dispatched",
        html: `<p class="text-sm">${res.message}</p><pre class="bg-black/20 text-xs p-3 rounded text-left font-mono mt-4 text-emerald-400 overflow-x-auto">${res.logs}</pre>`,
        icon: "success",
        background: "#1e293b",
        color: "#f8fafc",
        confirmButtonColor: "#4f46e5",
      });
    } catch (err) {
      Swal.fire({
        title: "Dispatch Failed",
        text: "Could not send test notification. Check server console logs.",
        icon: "error",
        background: "#1e293b",
        color: "#f8fafc",
      });
    } finally {
      setSendingTest(null);
    }
  };

  const markAllRead = () => {
    setHistory((prev) => prev.map((item) => ({ ...item, status: "Read" })));
    Swal.fire({
      title: "Success",
      text: "All notifications marked as read.",
      icon: "success",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 1500,
      background: "#1e293b",
      color: "#f8fafc",
    });
  };

  if (loading) {
    return (
      <div className="h-[400px] flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest font-mono">Loading Alerts Dashboard...</p>
      </div>
    );
  }

  const channels = [
    { label: "Email SMTP", icon: Mail, configKey: "smtp_host", active: !!settings.smtp_host },
    { label: "SMS Gateway", icon: Smartphone, configKey: "sms_api", active: !!settings.sms_api },
    { label: "Webhooks", icon: MessageSquare, configKey: "authws_url", active: !!settings.authws_url },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.4)]" />
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">System Notifications</h1>
        </div>
        <p className="text-[12px] font-semibold text-muted-foreground/70 tracking-[0.05em] uppercase ml-4 border-l border-border/50 pl-4">
          Manage system alerts, webhooks, and communication channels.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active Channels */}
          <div className="premium-card p-8 space-y-8">
            <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Active Channels</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {channels.map((channel) => (
                <div key={channel.label} className="p-6 rounded-2xl bg-muted/20 border border-border flex flex-col items-center gap-4 text-center group">
                  <div className={cn("p-3 rounded-xl transition-all", channel.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    <channel.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">{channel.label}</p>
                    <p className={cn("text-[10px] font-black uppercase tracking-widest mt-1", channel.active ? "text-emerald-500" : "text-muted-foreground/45")}>
                      {channel.active ? "Configured" : "Unconfigured"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSendTest(channel.label)}
                    disabled={sendingTest !== null}
                    className="w-full mt-2 py-2 bg-primary/10 hover:bg-primary/20 text-[10px] font-black text-primary border border-primary/20 hover:border-primary/40 rounded-xl uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    {sendingTest === channel.label ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    Test Route
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          <div className="premium-card overflow-hidden">
            <div className="px-8 py-6 border-b border-border bg-muted/20 flex items-center justify-between">
              <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest">Notification History</h3>
              <button 
                onClick={markAllRead}
                className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline cursor-pointer"
              >
                Mark all as read
              </button>
            </div>
            <div className="divide-y divide-border">
              {history.map((item, i) => (
                <div key={i} className="px-8 py-5 flex items-center justify-between hover:bg-muted/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-2 h-2 rounded-full shadow-sm",
                      item.status === "Unread" ? "bg-primary animate-pulse" : "bg-muted-foreground/30"
                    )} />
                    <div>
                      <p className="text-sm font-bold text-foreground/90 tracking-tight">{item.message}</p>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">{item.type} · {item.time}</p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground/20" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Alerts */}
        <div className="space-y-6">
          <div className="premium-card p-8 space-y-6">
            <h3 className="text-[12px] font-black text-foreground uppercase tracking-widest">Alert Thresholds</h3>
            <div className="space-y-4">
              {[
                { label: "Critical Failure", level: "Instant" },
                { label: "Node Offline", level: "30 Seconds" },
                { label: "Sync Warning", level: "Batch Daily" },
              ].map((t, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-[11px] font-bold text-foreground/80">{t.label}</span>
                  <span className="text-[10px] font-black text-primary uppercase">{t.level}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
