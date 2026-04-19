"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Edit, Trash2, Network as NetworkIcon, RefreshCw, Eye, PlayCircle, Activity } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchNetworks, deleteNetwork, testSourceConnection, testTargetConnection } from "@/lib/api";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

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
        title: 'Berhasil',
        text: 'Daftar jaringan berhasil diperbarui.',
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
      MySwal.fire({ title: 'Terhapus!', text: 'Jalur koneksi berhasil dihapus.', icon: 'success', ...swalTheme });
    },
    onError: (err: any) => {
      MySwal.fire({ title: 'Gagal', text: err?.response?.data?.error || 'Gagal menghapus data.', icon: 'error', ...swalTheme });
    }
  });

  const networks = networksData?.data || [];
  const total = networksData?.total || 0;
  const selectedNetwork = networks.find((n: any) => n.id === selectedNetworkId);

  const handleDelete = () => {
    if (!selectedNetwork) return;
    MySwal.fire({
      title: 'Hapus Jalur Data?',
      text: 'Apakah Anda yakin ingin menghapus jalur network ini? Aksi ini mungkin memutus proses sinkronisasi yang terhubung.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
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
      title: 'Menguji Konektivitas...',
      html: `Melakukan tes ping untuk <b>${net.id}</b>...`,
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
        title: 'Status Koneksi',
        html: `
          <div class="text-left space-y-3">
            <div class="p-3 rounded-lg border ${sourceRes.success ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Koneksi Asal (Source)</p>
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold">${sourceRes.message}</span>
                <span class="text-[10px] font-mono">${sourceRes.latency || ''}</span>
              </div>
            </div>
            <div class="p-3 rounded-lg border ${targetRes.success ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}">
              <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Koneksi Tujuan (Target)</p>
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
        title: 'Diagnostik Gagal',
        text: 'Sistem tidak dapat melakukan tes diagnostik pada jalur ini.',
        icon: 'error',
        ...swalTheme
      });
    }
  };

  const filteredNetworks = networks.filter((net: any) =>
    (net.source_node && net.source_node.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (net.target_node && net.target_node.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (net.id && net.id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="p-1.5 rounded-lg bg-[#1E90FF]/10 text-[#1E90FF]">
                <NetworkIcon className="w-6 h-6" />
             </div>
             <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A]">Topologi & Koneksi</h1>
          </div>
          <p className="text-[14px] font-medium text-[#64748B]">Konfigurasi alur data dari resource asal (source) ke tujuan (target) via pipeline.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh} 
            className="h-10 px-4 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[13px] font-semibold text-[#64748B] transition-all flex items-center gap-2 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${(isFetching || isManualRefreshing) ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button 
            onClick={() => router.push('/dashboard/network/new')} 
            className="h-10 px-5 rounded-lg bg-[#1E90FF] hover:bg-[#1c86ee] text-[13px] font-bold text-white shadow-lg shadow-[#1E90FF]/2 transition-all flex items-center gap-2 active:scale-[0.98]"
          >
            <Plus className="w-4.5 h-4.5" /> Tambah Jalur Data
          </button>
        </div>
      </div>

      <div className="enterprise-card flex flex-col bg-white border border-[#E2E8F0] overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input 
              type="text" 
              placeholder="Cari jalur network..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full h-11 pl-11 pr-4 rounded-lg border border-[#E2E8F0] bg-white text-[13px] font-medium text-[#0F172A] focus:outline-none focus:border-[#1E90FF] focus:ring-4 focus:ring-[#1E90FF]/5 transition-all outline-none" 
            />
          </div>
          <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">
            Total Jalur Terdaftar: {total}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">Konfigurasi Asal (Source)</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">Destinasi Tujuan (Target)</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">Status Jalur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#64748B]">
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-3 text-[#1E90FF]" />
                    <p className="font-medium">Memuat data topologi koneksi...</p>
                  </td>
                </tr>
              )}
              {!isLoading && filteredNetworks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#94A3B8]">
                    <p className="font-medium italic">Belum ada jalur jaringan yang terdaftar di sistem.</p>
                  </td>
                </tr>
              )}
              {filteredNetworks.map((net: any) => {
                const isSelected = selectedNetworkId === net.id;
                return (
                  <tr 
                    key={net.id} 
                    onClick={() => setSelectedNetworkId(isSelected ? null : net.id)}
                    className={`hover:bg-[#F8FAFC] transition-all cursor-pointer group ${isSelected ? 'bg-[#F0F7FF] hover:bg-[#F0F7FF]' : ''}`}
                  >
                    <td className="px-6 py-4.5 text-center">
                      <div className="flex items-center justify-center">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'border-[#1E90FF] bg-[#1E90FF]' : 'border-[#CBD5E1] bg-white group-hover:border-[#94A3B8]'}`}>
                          {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 font-bold font-mono text-[12px] text-[#0F172A]">{net.id}</td>
                    <td className="px-6 py-4.5">
                      <div className="flex flex-col">
                         <span className="text-[14px] font-bold text-[#0F172A]">{net.source_node || "MASTER_DEFAULT"}</span>
                         <span className="text-[11px] font-bold text-[#1E90FF] uppercase tracking-wider">{net.source_driver || "POSTGRES"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5">
                      <div className="flex flex-col">
                         <span className="text-[14px] font-bold text-[#0F172A]">{net.target_node || "LOCAL_AGENT"}</span>
                         <span className="text-[11px] font-bold text-[#00C6AD] uppercase tracking-wider">{net.target_driver || "MYSQL"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm shadow-emerald-500/5 uppercase">
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
        <div className="p-5 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between bg-[#F8FAFC]/30">
          <div className="flex items-center gap-3">
             <button 
                onClick={handleQuickTest}
                disabled={!selectedNetworkId} 
                className="h-10 px-5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#64748B] hover:text-emerald-500 hover:border-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Activity className="w-4 h-4" /> Tes Jaringan
             </button>
             <button 
                onClick={() => router.push(`/dashboard/network/${selectedNetworkId}?mode=view`)}
                disabled={!selectedNetworkId} 
                className="h-10 px-5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#64748B] hover:text-[#1E90FF] hover:border-[#1E90FF]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Eye className="w-4 h-4" /> Lihat Detail
             </button>
             <button 
                onClick={() => router.push(`/dashboard/network/${selectedNetworkId}`)}
                disabled={!selectedNetworkId} 
                className="h-10 px-5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#64748B] hover:text-[#1E90FF] hover:border-[#1E90FF]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Edit className="w-4 h-4" /> Edit Konfigurasi
             </button>
             <div className="w-px h-6 bg-[#E2E8F0] mx-1" />
             <button 
                onClick={handleDelete}
                disabled={!selectedNetworkId} 
                className="h-10 px-5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#64748B] hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Trash2 className="w-4 h-4" /> Hapus Jalur Data
             </button>
          </div>
          
          <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest hidden lg:block">
            {selectedNetworkId ? `Jalur Terpilih: ${selectedNetworkId}` : 'Pilih jalur koneksi untuk melihat status detail'}
          </div>
        </div>
      </div>
    </div>
  );
}
