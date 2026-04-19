"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Copy, Edit, Trash2, Eye, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSchemas, deleteSchema } from "@/lib/api";
import { format } from "date-fns";
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

export default function SchemaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSchemaId, setSelectedSchemaId] = useState<string | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const { data: schemasData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["schemas"],
    queryFn: fetchSchemas,
    refetchInterval: 5000,
  });

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["schemas"] });
    await refetch();
    // Force spinner for at least 600ms for better UX feedback
    setTimeout(() => {
      setIsManualRefreshing(false);
      MySwal.fire({
        title: 'Berhasil',
        text: 'Daftar schema berhasil diperbarui.',
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        ...swalTheme
      });
    }, 600);
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSchema(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schemas"] });
      setSelectedSchemaId(null);
      MySwal.fire({ title: 'Terhapus!', text: 'Schema berhasil dihapus.', icon: 'success', ...swalTheme });
    },
    onError: (err: any) => {
      MySwal.fire({ title: 'Gagal', text: err?.response?.data?.error || 'Gagal menghapus schema.', icon: 'error', ...swalTheme });
    }
  });

  const schemas = schemasData?.data || [];
  const total = schemasData?.total || 0;
  const selectedSchema = schemas.find((s: any) => s.id === selectedSchemaId);

  const handleDelete = () => {
    if (!selectedSchema) return;
    MySwal.fire({
      title: 'Hapus Schema?',
      text: `Apakah Anda yakin ingin menghapus schema "${selectedSchema.name}"? Ini akan berdampak pada Job ETL yang menggunakannya.`,
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
      if (result.isConfirmed) deleteMutation.mutate(selectedSchemaId!);
    });
  };

  const filteredSchemas = schemas.filter((schema: any) => 
    schema.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    schema.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="p-1.5 rounded-lg bg-[#1E90FF]/10 text-[#1E90FF]">
                <Copy className="w-5 h-5" />
             </div>
             <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A]">Struktur Schema & Aturan</h1>
          </div>
          <p className="text-[14px] font-medium text-[#64748B]">Mapping kolom dan query untuk pengambilan/pengiriman data antar endpoint.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh} 
            className="h-10 px-4 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[13px] font-semibold text-[#64748B] transition-all flex items-center gap-2 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${(isFetching || isManualRefreshing) ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button 
            onClick={() => router.push('/dashboard/schema/new')} 
            className="h-10 px-5 rounded-lg bg-[#1E90FF] hover:bg-[#1c86ee] text-[13px] font-bold text-white shadow-lg shadow-[#1E90FF]/2 transition-all flex items-center gap-2 active:scale-[0.98]"
          >
            <Plus className="w-4.5 h-4.5" /> Buat Schema Baru
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
              placeholder="Cari struktur schema..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full h-11 pl-11 pr-4 rounded-lg border border-[#E2E8F0] bg-white text-[13px] font-medium text-[#0F172A] focus:outline-none focus:border-[#1E90FF] focus:ring-4 focus:ring-[#1E90FF]/5 transition-all outline-none" 
            />
          </div>
          <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">
            Total Schema: {total}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">Nama Schema</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">Pemilik</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">Konfigurasi</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider text-right">Update Terakhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#64748B]">
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-3 text-[#1E90FF]" />
                    <p className="font-medium">Memuat data schema...</p>
                  </td>
                </tr>
              )}
              {!isLoading && filteredSchemas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#94A3B8]">
                    <p className="font-medium italic">Belum ada schema yang terdaftar di sistem.</p>
                  </td>
                </tr>
              )}
              {filteredSchemas.map((schema: any) => {
                const isSelected = selectedSchemaId === schema.id;
                return (
                  <tr 
                    key={schema.id} 
                    onClick={() => setSelectedSchemaId(isSelected ? null : schema.id)}
                    className={`hover:bg-[#F8FAFC] transition-all cursor-pointer group ${isSelected ? 'bg-[#F0F7FF] hover:bg-[#F0F7FF]' : ''}`}
                  >
                    <td className="px-6 py-4.5 text-center">
                      <div className="flex items-center justify-center">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'border-[#1E90FF] bg-[#1E90FF]' : 'border-[#CBD5E1] bg-white group-hover:border-[#94A3B8]'}`}>
                          {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 font-bold font-mono text-[12px] text-[#0F172A]">{schema.id}</td>
                    <td className="px-6 py-4.5 font-bold text-[#1E90FF]">{schema.name}</td>
                    <td className="px-6 py-4.5 font-bold text-[#64748B] text-[12px] uppercase tracking-tight">{schema.owner || "SYSTEM"}</td>
                    <td className="px-6 py-4.5">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] text-[10px] font-bold text-[#0F172A]">
                        {schema.queries_count || 0} QUERIES
                      </div>
                    </td>
                    <td className="px-6 py-4.5 text-[12px] font-medium text-[#94A3B8] text-right">
                      {schema.updated_at ? format(new Date(schema.updated_at), 'dd/MM/yyyy HH:mm:ss') : "—"}
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
                onClick={() => router.push(`/dashboard/schema/${selectedSchemaId}?mode=view`)}
                disabled={!selectedSchemaId} 
                className="h-10 px-5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#64748B] hover:text-[#1E90FF] hover:border-[#1E90FF]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Eye className="w-4 h-4" /> Lihat Detail
             </button>
             <button 
                onClick={() => router.push(`/dashboard/schema/${selectedSchemaId}`)}
                disabled={!selectedSchemaId} 
                className="h-10 px-5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#64748B] hover:text-[#1E90FF] hover:border-[#1E90FF]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Edit className="w-4 h-4" /> Edit Schema
             </button>
             <div className="w-px h-6 bg-[#E2E8F0] mx-1" />
             <button 
                onClick={handleDelete}
                disabled={!selectedSchemaId} 
                className="h-10 px-5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#64748B] hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Trash2 className="w-4 h-4" /> Hapus Schema
             </button>
          </div>
          
          <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">
            {selectedSchemaId ? `Schema Terpilih: ${selectedSchema?.name}` : 'Pilih struktur schema untuk modifikasi'}
          </div>
        </div>
      </div>
    </div>
  );
}
