"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Edit, Trash2, Network as NetworkIcon, RefreshCw, Eye, PlayCircle, Activity } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNetworks, deleteNetwork, testSourceConnection, testTargetConnection } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/remake/Breadcrumbs";
import { Pagination } from "@/components/remake/Pagination";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

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

export default function NetworkPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const { data: networksData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["networks"],
    queryFn: fetchNetworks,
    refetchInterval: 5000,
  });

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["networks"] });
    await refetch();
    setTimeout(() => {
      setIsManualRefreshing(false);
      MySwal.fire({
        title: 'Success',
        text: 'Network list updated successfully.',
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
    mutationFn: (id: string) => deleteNetwork(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["networks"] });
      setSelectedNetworkId(null);
      MySwal.fire({ title: 'Deleted!', text: 'Connection path deleted successfully.', icon: 'success', ...swalTheme });
    },
    onError: (err: any) => {
      MySwal.fire({ title: 'Failed', text: err?.response?.data?.error || 'Failed to delete data.', icon: 'error', ...swalTheme });
    }
  });

  const networks = networksData?.data || [];
  const total = networksData?.total || 0;
  const selectedNetwork = networks.find((n: any) => n.id === selectedNetworkId);

  const handleDelete = () => {
    if (!selectedNetwork) return;
    MySwal.fire({
      title: 'Delete Data Path?',
      text: 'Are you sure you want to delete this network path? This action may interrupt connected synchronization processes.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      ...swalTheme,
      customClass: { 
        ...swalTheme.customClass, 
        confirmButton: 'premium-button bg-red-600 text-white px-6 py-2 ml-4' 
      }
    }).then((result) => {
      if (result.isConfirmed) deleteMutation.mutate(selectedNetworkId!);
    });
  };

  const handleQuickTest = async () => {
    if (!selectedNetwork) return;
    const net = selectedNetwork;
    MySwal.fire({
      title: 'Testing Connectivity...',
      html: `Performing ping test for <b>${net.id}</b>...`,
      allowOutsideClick: false,
      didOpen: () => {
        MySwal.showLoading();
      },
      ...swalTheme
    });

    try {
      const sourceRes = await testSourceConnection(net.id);
      const targetRes = await testTargetConnection(net.id);

      MySwal.fire({
        title: 'Connection Status',
        html: `
          <div class="text-left space-y-3">
            <div class="p-3 rounded-lg border ${sourceRes.success ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}">
              <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Source Connection</p>
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold">${sourceRes.message}</span>
                <span class="text-[10px] font-mono">${sourceRes.latency || ''}</span>
              </div>
            </div>
            <div class="p-3 rounded-lg border ${targetRes.success ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}">
              <p class="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Target Connection</p>
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold">${targetRes.message}</span>
                <span class="text-[10px] font-mono">${targetRes.latency || ''}</span>
              </div>
            </div>
          </div>
        `,
        icon: (sourceRes.success && targetRes.success) ? 'success' : 'warning',
        ...swalTheme
      });
    } catch (err: any) {
      MySwal.fire({
        title: 'Diagnostics Failed',
        text: 'The system could not perform diagnostic tests on this path.',
        icon: 'error',
        ...swalTheme
      });
    }
  };

  const filteredNetworks = networks.filter((net: any) =>
    (net.sid && net.sid.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (net.name && net.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (net.source_node && net.source_node.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (net.target_node && net.target_node.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (net.id && net.id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <Breadcrumbs />
      
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <NetworkIcon className="w-6 h-6" />
             </div>
             <h1 className="text-3xl font-semibold tracking-tight text-foreground">Topology & Connections</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Configure data flow from source resources to target destinations via pipeline.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh} 
            className="h-10 px-4 rounded-lg bg-card border border-border hover:bg-muted text-[13px] font-semibold text-muted-foreground transition-all flex items-center gap-2 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${(isFetching || isManualRefreshing) ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button 
            onClick={() => router.push('/dashboard/network/new')} 
            className="h-10 px-5 rounded-lg bg-primary hover:bg-primary/90 text-[13px] font-bold text-primary-foreground shadow-lg shadow-primary/2 transition-all flex items-center gap-2 active:scale-[0.98]"
          >
            <Plus className="w-4.5 h-4.5" /> Add Data Path
          </button>
        </div>
      </div>

      <div className="enterprise-card flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input 
              type="text" 
              placeholder="Search network paths..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full h-11 pl-11 pr-4 rounded-lg border border-border bg-card text-[13px] font-medium text-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
            />
          </div>
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            Total Registered Paths: {total}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Name (SID)</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-center">Source Config</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-center">Target Config</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Path Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-3 text-primary" />
                    <p className="font-medium">Loading topology connections data...</p>
                  </td>
                </tr>
              )}
              {!isLoading && filteredNetworks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#94A3B8]">
                    <p className="font-medium italic">No network paths registered in the system yet.</p>
                  </td>
                </tr>
              )}
              {filteredNetworks.map((net: any) => {
                const isSelected = selectedNetworkId === net.id;
                return (
                  <tr 
                    key={net.id} 
                    onClick={() => setSelectedNetworkId(isSelected ? null : net.id)}
                    className={cn(
                      "transition-all cursor-pointer group",
                      isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"
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
                    <td className="px-6 py-4.5 font-bold font-mono text-[12px] text-muted-foreground/60">{net.id}</td>
                    <td className="px-6 py-4.5">
                      <div className="flex flex-col">
                         <span className="text-[14px] font-bold text-foreground">{net.name || "Default Pipeline"}</span>
                         <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-wider">{net.sid || "NSID-UNSET"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 text-center">
                      <div className="flex flex-col items-center">
                         <span className="text-[14px] font-bold text-foreground">{net.source_node || "MASTER_DEFAULT"}</span>
                         <span className="text-[11px] font-bold text-primary uppercase tracking-wider">{net.source_driver || "POSTGRES"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 text-center">
                      <div className="flex flex-col items-center">
                         <span className="text-[14px] font-bold text-foreground">{net.target_node || "LOCAL_AGENT"}</span>
                         <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">{net.target_driver || "MYSQL"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm uppercase">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {(net.status || 'active').toUpperCase()}
                      </span>
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
                onClick={handleQuickTest}
                disabled={!selectedNetworkId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-emerald-500 hover:border-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Activity className="w-4 h-4" /> Test Network
             </button>
             <button 
                onClick={() => router.push(`/dashboard/network/${selectedNetworkId}?mode=view`)}
                disabled={!selectedNetworkId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Eye className="w-4 h-4" /> View Details
             </button>
             <button 
                onClick={() => router.push(`/dashboard/network/${selectedNetworkId}`)}
                disabled={!selectedNetworkId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Edit className="w-4 h-4" /> Edit Config
             </button>
             <button 
                onClick={() => router.push(`/dashboard/network/new?clone=${selectedNetworkId}`)}
                disabled={!selectedNetworkId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-amber-500 hover:border-amber-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
              >
                <PlayCircle className="w-4 h-4 rotate-90" /> Duplicate
              </button>
             <div className="w-px h-6 bg-border mx-1" />
             <button 
                onClick={handleDelete}
                disabled={!selectedNetworkId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Trash2 className="w-4 h-4" /> Delete Path
             </button>
          </div>
          
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest hidden lg:block">
            {selectedNetworkId ? `Selected Path: ${selectedNetworkId}` : 'Select a connection path to view detailed status'}
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
