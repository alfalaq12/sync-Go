"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, MoreVertical, RefreshCw, Power, MonitorPlay, Terminal, ServerCog, Edit, Trash2, Eye } from "lucide-react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNodes, deleteNode } from "@/lib/api";
import { format } from "date-fns";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { cn } from "@/lib/utils";

const MySwal = withReactContent(Swal);

const swalTheme = {
  background: '#FFFFFF',
  color: '#0F172A',
  customClass: {
    popup: 'enterprise-card shadow-2xl border border-[#E2E8F0]',
    confirmButton: 'premium-button premium-button-primary px-6 py-2 ml-4',
    cancelButton: 'premium-button bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] px-6 py-2'
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
        title: 'Berhasil',
        text: 'Daftar server node berhasil diperbarui.',
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
      MySwal.fire({ title: 'Terhapus!', text: 'Node berhasil dihapus.', icon: 'success', ...swalTheme });
    },
    onError: (err: any) => {
      MySwal.fire({ title: 'Gagal', text: err?.response?.data?.error || 'Gagal menghapus node.', icon: 'error', ...swalTheme });
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
      title: 'Hapus Node?',
      text: `Apakah Anda yakin ingin menghapus server node "${selectedNode.node_name || selectedNode.node_code}"? Aksi ini tidak dapat dibatalkan.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
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
      
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="p-1.5 rounded-lg bg-[#1E90FF]/10 text-[#1E90FF]">
                <ServerCog className="w-6 h-6" />
             </div>
             <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A]">Daftar Node & Server</h1>
          </div>
          <p className="text-[14px] font-medium text-[#64748B]">Kelola endpoint sinkronisasi dan status koneksi server remote.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh} 
            className="h-10 px-4 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[13px] font-semibold text-[#64748B] transition-all flex items-center gap-2 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${(isFetching || isManualRefreshing) ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button 
            onClick={() => router.push('/dashboard/nodes/new')} 
            className="h-10 px-5 rounded-lg bg-[#1E90FF] hover:bg-[#1c86ee] text-[13px] font-bold text-white shadow-lg shadow-[#1E90FF]/2 relative active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Plus className="w-4.5 h-4.5" /> Register Node
          </button>
        </div>
      </div>

      <div className="enterprise-card flex flex-col bg-white border border-[#E2E8F0] overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F8FAFC]/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input 
              type="text" 
              placeholder="Cari berdasarkan ID, Kode, Nama, atau IP..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-lg border border-[#E2E8F0] bg-white text-[13px] font-medium text-[#0F172A] focus:ring-4 focus:ring-[#1E90FF]/5 focus:border-[#1E90FF] transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            {[
              { icon: MonitorPlay, label: "System Monitor", action: () => handleInfoAction('Monitor Sistem', 'Membuka diagnostik hardware secara real-time...') },
              { icon: Terminal, label: "FS Console", action: () => handleInfoAction('Konsol File', 'Fitur Konsol System File akan tersedia di update berikutnya.') },
              { icon: Power, label: "OS Restart", action: () => handleInfoAction('Restart OS', 'Fitur restart server jarak jauh akan tersedia di update berikutnya.') },
            ].map((action, i) => (
              <button 
                key={i} 
                onClick={action.action} 
                title={action.label} 
                className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#E2E8F0] bg-white hover:bg-blue-50 text-[#64748B] hover:text-[#1E90FF] transition-all"
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
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">Node Code</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">Node Name</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">Mode</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">Address</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider text-right">Last Heartbeat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#64748B]">
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-3 text-[#1E90FF]" />
                    <p className="font-medium">Memuat data node...</p>
                  </td>
                </tr>
              )}
              {!isLoading && filteredNodes.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-[#94A3B8]">
                    <ServerCog className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="font-medium italic">Belum ada node yang terdaftar di registry.</p>
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
                        "hover:bg-[#F8FAFC] transition-all cursor-pointer group",
                        isSelected ? "bg-[#F0F7FF] hover:bg-[#F0F7FF]" : ""
                    )}
                  >
                    <td className="px-6 py-4.5 text-center">
                      <div className="flex items-center justify-center">
                        <div className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                            isSelected ? "border-[#1E90FF] bg-[#1E90FF]" : "border-[#CBD5E1] bg-white"
                        )}>
                          {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 font-bold font-mono text-[12px] text-[#0F172A]">{node.id}</td>
                    <td className="px-6 py-4.5 font-bold font-mono text-[12px] text-[#1E90FF]">{node.node_code}</td>
                    <td className="px-6 py-4.5 font-semibold text-[#1F2937]">{node.node_name || node.hostname || "—"}</td>
                    <td className="px-6 py-4.5">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider border",
                        node.connection_mode === 'agent' 
                           ? 'bg-violet-50 text-violet-700 border-violet-100' 
                          : 'bg-blue-50 text-blue-700 border-blue-100'
                      )}>
                        {(node.connection_mode || 'direct').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className={cn(
                        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider border transition-all duration-500",
                        node.status === 'online' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-500/5' 
                          : node.status === 'idle'
                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      )}>
                        {node.status === 'online' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                        {node.status === 'idle' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                        {(node.status || 'offline').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 font-mono text-[12px] text-[#64748B]">{node.ip_address || "—"}</td>
                    <td className="px-6 py-4.5 text-[12px] font-medium text-[#94A3B8] text-right">
                      {node.last_seen ? format(new Date(node.last_seen), 'dd/MM/yyyy HH:mm:ss') : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Action Bar */}
        <div className="p-5 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between bg-[#F8FAFC]/30">
          <div className="flex items-center gap-3">
             <button 
                onClick={() => router.push(`/dashboard/nodes/${selectedNodeId}`)}
                disabled={!selectedNodeId} 
                className="h-10 px-5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#64748B] hover:text-[#1E90FF] hover:border-[#1E90FF]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
             >
               <Edit className="w-4 h-4" /> Edit Node
             </button>
             <button 
                onClick={() => handleInfoAction('Detail Node', `Menampilkan spesifikasi teknis untuk ${selectedNode?.node_name || selectedNode?.node_code}`)}
                disabled={!selectedNodeId} 
                className="h-10 px-5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#64748B] hover:text-[#1E90FF] hover:border-[#1E90FF]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
             >
               <Eye className="w-4 h-4" /> Lihat Detail
             </button>
             <div className="w-px h-6 bg-[#E2E8F0] mx-1" />
             <button 
                onClick={handleDelete}
                disabled={!selectedNodeId} 
                className="h-10 px-5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#64748B] hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
             >
               <Trash2 className="w-4 h-4" /> Hapus Node
             </button>
          </div>
          
          <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">
            {selectedNodeId ? `Node Terpilih: ${selectedNode?.node_code}` : 'Pilih node untuk melihat opsi tindakan'}
          </div>
        </div>
      </div>
    </div>
  );
}

