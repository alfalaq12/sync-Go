"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, RefreshCw, ServerCog, Edit, Trash2, Eye, MonitorPlay, Terminal, Power } from "lucide-react";
import { TableSkeleton } from "@/components/remake/Skeleton";
import { Breadcrumbs } from "@/components/remake/Breadcrumbs";
import { Pagination } from "@/components/remake/Pagination";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNodes, deleteNode } from "@/lib/api";
import { format } from "date-fns";
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

export default function NodesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const { data: nodesData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["nodes"],
    queryFn: fetchNodes,
    refetchInterval: 5000,
  });

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["nodes"] });
    await refetch();
    setTimeout(() => {
      setIsManualRefreshing(false);
      MySwal.fire({
        title: 'Success',
        text: 'Node server list updated successfully.',
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
        ...swalTheme
      });
    }, 600);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nodes"] });
      setSelectedNodeId(null);
      MySwal.fire({ title: 'Deleted!', text: 'Node deleted successfully.', icon: 'success', ...swalTheme });
    },
    onError: (err: any) => {
      MySwal.fire({ title: 'Failed', text: err?.response?.data?.error || 'Failed to delete node.', icon: 'error', ...swalTheme });
    }
  });

  const nodes = nodesData?.data || [];
  const total = nodesData?.total || 0;
  const selectedNode = nodes.find((n: any) => String(n.id) === selectedNodeId);

  const filteredNodes = nodes.filter((node: any) => 
    node.id.toString().includes(searchTerm) || 
    node.node_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (node.hostname && node.hostname.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (node.node_name && node.node_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = () => {
    if (!selectedNode) return;
    MySwal.fire({
      title: 'Delete Node?',
      text: `Are you sure you want to delete the secondary node "${selectedNode.node_name || selectedNode.node_code}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      ...swalTheme,
      customClass: {
        ...swalTheme.customClass,
        confirmButton: 'premium-button bg-red-600 text-white px-6 py-2 ml-4',
      }
    }).then((result) => {
      if (result.isConfirmed) {
        deleteMutation.mutate(selectedNodeId!);
      }
    });
  };

  const handleInfoAction = (title: string, msg: string) => {
    MySwal.fire({ title, text: msg, icon: 'info', ...swalTheme });
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <Breadcrumbs />
      
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <ServerCog className="w-6 h-6" />
             </div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Nodes & Servers List</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Manage synchronization endpoints and remote server connection statuses.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh} 
            className="h-10 px-4 rounded-lg bg-card border border-border hover:bg-muted text-[13px] font-semibold text-muted-foreground transition-all flex items-center gap-2 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${(isFetching || isManualRefreshing) ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button 
            onClick={() => router.push('/dashboard/nodes/new')} 
            className="h-10 px-5 rounded-lg bg-primary hover:bg-primary/90 text-[13px] font-bold text-primary-foreground shadow-lg shadow-primary/2 relative active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Plus className="w-4.5 h-4.5" /> Register Node
          </button>
        </div>
      </div>

      <div className="enterprise-card flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input 
              type="text" 
              placeholder="Search by ID, Code, Name, or IP..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-lg border border-border bg-card text-[13px] font-medium text-foreground focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            {[
              { icon: MonitorPlay, label: "System Monitor", action: () => handleInfoAction('System Monitor', 'Opening hardware diagnostics in real-time...') },
              { icon: Terminal, label: "FS Console", action: () => handleInfoAction('File Console', 'File System Console feature will be available in the next update.') },
              { icon: Power, label: "OS Restart", action: () => handleInfoAction('OS Restart', 'Remote server restart feature will be available in the next update.') },
            ].map((action, i) => (
              <button 
                key={i} 
                onClick={action.action} 
                title={action.label} 
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-primary transition-all"
              >
                <action.icon className="w-4.5 h-4.5" />
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Node Code</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Node Name</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Mode</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Address</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right">Last Heartbeat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-0 py-0 text-center">
                    <TableSkeleton rows={8} cols={8} />
                  </td>
                </tr>
              )}
              {!isLoading && filteredNodes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    <ServerCog className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="font-medium italic">No nodes registered in the registry yet.</p>
                  </td>
                </tr>
              )}
              {filteredNodes.map((node: any) => {
                const isSelected = selectedNodeId === String(node.id);
                return (
                  <tr 
                    key={node.id} 
                    onClick={() => setSelectedNodeId(isSelected ? null : String(node.id))}
                    className={cn(
                        "hover:bg-muted/50 transition-all cursor-pointer group",
                        isSelected ? "bg-primary/5 hover:bg-primary/10" : ""
                    )}
                  >
                    <td className="px-6 py-4.5 text-center">
                      <div className="flex items-center justify-center">
                        <div className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                            isSelected ? "border-primary bg-primary" : "border-border bg-card group-hover:border-muted-foreground"
                        )}>
                          {isSelected && <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 font-bold font-mono text-[12px] text-foreground">{node.id}</td>
                    <td className="px-6 py-4.5 font-bold font-mono text-[12px] text-primary">{node.node_code}</td>
                    <td className="px-6 py-4.5 font-semibold text-foreground">{node.node_name || node.hostname || "—"}</td>
                    <td className="px-6 py-4.5">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider border",
                        node.connection_mode === 'agent' 
                           ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20' 
                          : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                      )}>
                        {(node.connection_mode || 'direct').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className={cn(
                        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider border transition-all duration-500",
                        node.status === 'online' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/5' 
                          : node.status === 'idle'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          : 'bg-muted text-muted-foreground border-border'
                      )}>
                        {node.status === 'online' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        {node.status === 'idle' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                        {(node.status || 'offline').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 font-mono text-[12px] text-muted-foreground">{node.ip_address || "—"}</td>
                    <td className="px-6 py-4.5 text-[12px] font-medium text-muted-foreground/60 text-right">
                      {node.last_seen ? format(new Date(node.last_seen), 'dd/MM/yyyy HH:mm:ss') : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Action Bar */}
        <div className="p-5 border-t border-border flex flex-wrap items-center justify-between bg-muted/10">
          <div className="flex items-center gap-3">
             <button 
                onClick={() => router.push(`/dashboard/nodes/${selectedNodeId}`)}
                disabled={!selectedNodeId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
             >
               <Edit className="w-4 h-4" /> Edit Node
             </button>
             <button 
                onClick={() => handleInfoAction('Node Details', `Displaying technical specifications for ${selectedNode?.node_name || selectedNode?.node_code}`)}
                disabled={!selectedNodeId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
             >
               <Eye className="w-4 h-4" /> View Details
             </button>
             <div className="w-px h-6 bg-border mx-1" />
             <button 
                onClick={handleDelete}
                disabled={!selectedNodeId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
             >
               <Trash2 className="w-4 h-4" /> Delete Node
             </button>
          </div>
          
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            {selectedNodeId ? `Selected Node: ${selectedNode?.node_code}` : 'Select a node to view action options'}
          </div>
        </div>

        {/* Pagination */}
        <Pagination 
          currentPage={1}
          totalPages={Math.ceil(total / 10) || 1}
          onPageChange={() => {}}
          totalItems={total}
          pageSize={10}
        />
      </div>
    </div>
  );
}

