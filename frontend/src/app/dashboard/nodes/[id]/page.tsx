"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, X, Server, ShieldCheck } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getNode, createNode, updateNode } from "@/lib/api";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { cn } from "@/lib/utils";

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

export default function NodeEditPage() {
  const router = useRouter();
  const params = useParams();
  const isNew = params?.id === "new";

  const [formData, setFormData] = useState({
    id: "",
    nodeCode: "",
    nodeName: "",
    hostname: "",
    ipAddress: "",
    connectionMode: "direct",
    notes: "",
    bandwidthLimit: "",
    enableTimeSync: true,
    offlineMode: false,
    clonedNode: false,
    owner: "admin",
    isDistributed: false,
    agentToken: "",
    batchSize: "1000",
  });

  // Fetch existing node data for edit mode
  const { data: nodeData } = useQuery({
    queryKey: ["node", params?.id],
    queryFn: () => getNode(params?.id as string),
    enabled: !isNew && !!params?.id,
  });

  useEffect(() => {
    if (nodeData?.data) {
      const n = nodeData.data;
      setFormData({
        id: String(n.id) || "",
        nodeCode: n.node_code || "",
        nodeName: n.node_name || "",
        hostname: n.hostname || "",
        ipAddress: n.ip_address || "",
        connectionMode: n.connection_mode || "direct",
        notes: n.notes || "",
        bandwidthLimit: n.bandwidth_limit ? String(n.bandwidth_limit) : "",
        enableTimeSync: n.enable_time_sync ?? true,
        offlineMode: n.offline_mode ?? false,
        clonedNode: n.cloned_node ?? false,
        owner: n.owner || "admin",
        isDistributed: n.is_distributed ?? false,
        agentToken: n.agent_token || "",
        batchSize: n.batch_size ? String(n.batch_size) : "1000",
      });
    }
  }, [nodeData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        node_code: formData.nodeCode,
        node_name: formData.nodeName,
        hostname: formData.hostname,
        ip_address: formData.ipAddress,
        connection_mode: formData.connectionMode,
        notes: formData.notes,
        bandwidth_limit: formData.bandwidthLimit ? parseInt(formData.bandwidthLimit) : null,
        enable_time_sync: formData.enableTimeSync,
        offline_mode: formData.offlineMode,
        cloned_node: formData.clonedNode,
        owner: formData.owner,
        is_distributed: formData.isDistributed,
        agent_token: formData.agentToken,
        batch_size: parseInt(formData.batchSize) || 1000,
      };
      if (isNew) {
        return createNode(payload);
      } else {
        return updateNode(params?.id as string, payload);
      }
    },
    onSuccess: () => {
      MySwal.fire({ 
        title: isNew ? 'Node Created' : 'Node Updated', 
        text: `Node "${formData.nodeName || formData.nodeCode}" has been saved successfully.`, 
        icon: 'success', 
        ...swalTheme 
      }).then(() => {
        router.push("/dashboard/nodes");
      });
    },
    onError: (err: any) => {
      MySwal.fire({ 
        title: 'Error', 
        text: err?.response?.data?.error || 'Failed to save node.', 
        icon: 'error', 
        ...swalTheme 
      });
    },
  });

  return (
    <div className="p-8 max-w-[1000px] mx-auto animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button 
            onClick={() => router.push("/dashboard/nodes")}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border shadow-sm text-muted-foreground hover:text-primary hover:border-primary transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
               <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Server className="w-5 h-5" />
               </div>
               <h1 className="text-2xl font-bold tracking-tight text-foreground">
                 {isNew ? "Register New Node" : `Configure Node: ${formData.nodeCode} (ID: ${formData.id})`}
               </h1>
               {!isNew && nodeData?.data?.status && (
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest border uppercase transition-all",
                  nodeData.data.status === 'online' 
                     ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-sm shadow-emerald-500/5' 
                     : 'bg-muted text-muted-foreground border-border'
                )}>
                  {nodeData.data.status === 'online' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  {nodeData.data.status}
                </div>
              )}
            </div>
            <p className="text-[14px] font-medium text-muted-foreground">Adjust node properties and synchronization limits.</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="enterprise-card bg-card border border-border shadow-xl">
        <div className="p-8 sm:p-10 space-y-8">
          
          <div className="grid gap-6 sm:grid-cols-[200px_1fr] items-center">
            <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wide">Node Code</label>
            <input 
              value={formData.nodeCode}
              onChange={(e) => setFormData({...formData, nodeCode: e.target.value})}
              placeholder="e.g. AGENT_JKT_01"
              className={cn(
                "w-full sm:w-64 h-11 px-4 rounded-lg border text-sm font-bold transition-all bg-muted/50 border-border text-foreground focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none"
              )}
            />
            {!isNew && <p className="text-[11px] text-muted-foreground font-medium sm:col-start-2 italic">Database Numeric ID: {formData.id}</p>}
          </div>

          <div className="grid gap-6 sm:grid-cols-[200px_1fr] items-center">
            <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wide">Node Name</label>
            <input 
              value={formData.nodeName}
              onChange={(e) => setFormData({...formData, nodeName: e.target.value})}
              placeholder="Enter node display name"
              className="w-full sm:w-[450px] h-11 px-4 rounded-lg border border-border bg-muted/50 text-sm font-bold text-foreground focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-[200px_1fr] items-center">
            <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wide">Connection Mode</label>
            <select 
              value={formData.connectionMode}
              onChange={(e) => setFormData({...formData, connectionMode: e.target.value})}
              className="w-full sm:w-[300px] h-11 px-4 rounded-lg border border-border bg-muted/50 text-sm font-bold text-foreground focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all appearance-none cursor-pointer"
            >
              <option value="direct">Direct (Same Network)</option>
              <option value="agent">Agent (Remote Network)</option>
            </select>
          </div>

          <div className="grid gap-6 sm:grid-cols-[200px_1fr] items-center">
            <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wide">IP Address</label>
            <input 
              value={formData.ipAddress}
              onChange={(e) => setFormData({...formData, ipAddress: e.target.value})}
              placeholder="e.g. 192.168.1.100"
              className="w-full sm:w-[300px] h-11 px-4 rounded-lg border border-border bg-muted/50 text-sm font-mono font-bold text-foreground focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-[200px_1fr] items-center">
            <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wide">Hostname</label>
            <input 
              value={formData.hostname}
              onChange={(e) => setFormData({...formData, hostname: e.target.value})}
              placeholder="e.g. server-01.local"
              className="w-full sm:w-[450px] h-11 px-4 rounded-lg border border-border bg-muted/50 text-sm font-bold text-foreground focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-[200px_1fr] items-center">
            <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" /> Owner
            </label>
            <input 
              value={formData.owner}
              onChange={(e) => setFormData({...formData, owner: e.target.value})}
              className="w-full sm:w-[300px] h-11 px-4 rounded-lg border border-border bg-muted/50 text-sm font-bold text-foreground focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all"
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-[200px_1fr] items-start">
            <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wide mt-3">Detailed Notes</label>
            <textarea 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={4}
              placeholder="Optional notes about this node's role and topology..."
              className="w-full sm:w-[600px] p-4 rounded-lg border border-border bg-muted/50 text-sm font-bold text-foreground focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all resize-y"
            />
          </div>

          <div className="border-t border-border pt-10 mt-4">
             <div className="grid gap-6 sm:grid-cols-[200px_1fr] items-center mb-8">
               <label className="text-[13px] font-bold text-muted-foreground uppercase tracking-wide">Bandwidth Limit (Byte/s)</label>
               <input 
                 placeholder="Unlimited if empty"
                 value={formData.bandwidthLimit}
                 onChange={(e) => setFormData({...formData, bandwidthLimit: e.target.value})}
                 className="w-full sm:w-[300px] h-11 px-4 rounded-lg border border-border bg-muted/50 text-sm font-mono font-bold text-foreground focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all"
               />
             </div>

             {/* Modern Toggle Grid */}
             <div className="space-y-4">
               {[
                 { label: "Time Synchronization", desc: "Automatically sync time with Master server", key: "enableTimeSync" as const, color: "peer-checked:bg-[#1E90FF]" },
                 { label: "Offline Mode", desc: "Allow local processing when Master connection is lost", key: "offlineMode" as const, color: "peer-checked:bg-[#EF4444]" },
                 { label: "Replica Node", desc: "Mark this node as a virtual replica", key: "clonedNode" as const, color: "peer-checked:bg-[#00C6AD]" },
                 { label: "Distributed Mode", desc: "Use Agent for cross-network/firewall synchronization", key: "isDistributed" as const, color: "peer-checked:bg-[#8B5CF6]" },
               ].map((toggle) => (
                 <div key={toggle.key} className="grid gap-6 sm:grid-cols-[200px_1fr] items-center">
                   <label className="flex flex-col">
                      <span className="text-[13px] font-bold text-foreground">{toggle.label}</span>
                      <span className="text-[11px] font-medium text-muted-foreground">{toggle.desc}</span>
                   </label>
                   <label className="relative inline-flex items-center cursor-pointer group w-fit">
                     <input type="checkbox" checked={formData[toggle.key]} onChange={(e) => setFormData({...formData, [toggle.key]: e.target.checked})} className="sr-only peer" />
                     <div className={cn(
                       "w-11 h-6 bg-muted/50 border border-border peer-focus:outline-none rounded-full peer transition-all duration-300",
                       "after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm",
                       "peer-checked:after:translate-x-full",
                       toggle.color
                     )} />
                   </label>
                 </div>
               ))}
               {formData.isDistributed && (
                <div className="mt-8 p-6 rounded-xl bg-violet-500/10 border border-violet-500/20 space-y-4 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4.5 h-4.5 text-violet-500" />
                    <span className="text-[12px] font-bold text-violet-500 uppercase tracking-widest">Agent Authentication & Security</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[180px_1fr] items-center">
                    <label className="text-[11px] font-bold text-violet-500 uppercase tracking-wider">Agent Access Token</label>
                    <input 
                      type="password"
                      value={formData.agentToken}
                      onChange={(e) => setFormData({...formData, agentToken: e.target.value})}
                      placeholder="Enter secret token for gRPC authentication"
                      className="w-full sm:w-[400px] h-10 px-4 rounded-lg border border-violet-500/30 bg-card text-sm font-bold text-foreground focus:ring-4 focus:ring-violet-500/10 outline-none transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-violet-500 font-medium italic">This token must match the --token flag when running the Sync-Go Agent binary.</p>
                </div>
              )}

              {/* Advanced Settings Section */}
              <div className="mt-8 pt-8 border-t border-border">
                <details className="group">
                  <summary className="flex items-center justify-between cursor-pointer list-none">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-muted/50 text-muted-foreground group-open:bg-amber-500/10 group-open:text-amber-500 transition-all">
                        <Save className="w-4 h-4" />
                      </div>
                      <span className="text-[13px] font-bold text-muted-foreground group-open:text-amber-500 uppercase tracking-widest transition-all">Advanced Settings</span>
                    </div>
                    <div className="text-muted-foreground group-open:rotate-180 transition-transform duration-300">
                      <ArrowLeft className="w-4 h-4 -rotate-90" />
                    </div>
                  </summary>
                  <div className="mt-6 p-6 rounded-xl bg-muted/30 border border-border space-y-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid gap-6 sm:grid-cols-[200px_1fr] items-center">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Batch Size</label>
                      <div className="space-y-1.5">
                        <input 
                          type="number"
                          value={formData.batchSize}
                          onChange={(e) => setFormData({...formData, batchSize: e.target.value})}
                          placeholder="Default: 1000"
                          className="w-full sm:w-32 h-10 px-4 rounded-lg border border-border bg-card text-sm font-bold text-foreground focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                        />
                        <p className="text-[10px] text-muted-foreground font-medium">Sets the number of rows per gRPC transmission. Larger is faster, but requires more RAM.</p>
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-10 py-6 border-t border-border bg-muted/10 flex items-center justify-between">
          <button 
            onClick={() => router.push("/dashboard/nodes")}
            className="h-11 px-6 rounded-lg border border-border bg-card hover:bg-muted text-[11px] font-bold text-muted-foreground transition-all flex items-center gap-2 uppercase tracking-widest active:scale-[0.98]"
          >
            <X className="w-4 h-4" /> Cancel Changes
          </button>
          <button 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="h-11 px-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-[11px] font-bold transition-all flex items-center gap-2 shadow-lg shadow-primary/20 shadow-sm uppercase tracking-widest active:scale-[0.98] disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saveMutation.isPending ? 'Saving Registry...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
