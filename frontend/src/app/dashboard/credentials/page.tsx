"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, RefreshCw, Key, Edit, Trash2, ShieldCheck, Lock } from "lucide-react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCredentials, createCredential, updateCredential, deleteCredential } from "@/lib/api";
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

export default function CredentialsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCredId, setSelectedCredId] = useState<string | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const { data: credsData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["credentials"],
    queryFn: fetchCredentials,
  });

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["credentials"] });
    await refetch();
    setTimeout(() => {
      setIsManualRefreshing(false);
      MySwal.fire({
        title: 'Berhasil',
        text: 'Data kredensial berhasil diperbarui.',
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
    mutationFn: (id: string) => deleteCredential(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
      setSelectedCredId(null);
      MySwal.fire({ title: 'Terhapus!', text: 'Kredensial berhasil dihapus.', icon: 'success', ...swalTheme });
    },
    onError: (err: any) => {
      MySwal.fire({ title: 'Gagal', text: err?.response?.data?.error || 'Gagal menghapus kredensial.', icon: 'error', ...swalTheme });
    }
  });

  const credentials = credsData?.data || [];
  const selectedCred = credentials.find((c: any) => String(c.id) === selectedCredId);

  const filteredCreds = credentials.filter((c: any) => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = () => {
    if (!selectedCred) return;
    MySwal.fire({
      title: 'Hapus Kredensial?',
      text: `Apakah Anda yakin ingin menghapus kredensial "${selectedCred.name}"? Kredensial ini tidak akan bisa dihapus jika masih terhubung dengan network jobs yang sedang aktif.`,
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
        deleteMutation.mutate(selectedCredId!);
      }
    });
  };

  const handleCreateOrEdit = (cred?: any) => {
    const targetCred = cred || selectedCred;
    MySwal.fire({
      title: targetCred ? 'Edit Kredensial' : 'Kredensial Baru',
      html: `
        <div class="text-left space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Friendly Name</label>
            <input id="swal-name" class="swal2-input !mt-0 !w-full" placeholder="e.g. Production PostgreSQL" value="${targetCred?.name || ''}">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Database Username</label>
            <input id="swal-username" class="swal2-input !mt-0 !w-full" placeholder="e.g. postgres" value="${targetCred?.username || ''}">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
            <input id="swal-password" type="password" class="swal2-input !mt-0 !w-full" placeholder="Enter password">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Notes</label>
            <textarea id="swal-notes" class="swal2-textarea !mt-0 !w-full" placeholder="Additional details...">${targetCred?.notes || ''}</textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: targetCred ? 'Simpan Data' : 'Buat Baru',
      ...swalTheme,
      preConfirm: () => {
        const name = (document.getElementById('swal-name') as HTMLInputElement).value;
        const username = (document.getElementById('swal-username') as HTMLInputElement).value;
        const password = (document.getElementById('swal-password') as HTMLInputElement).value;
        const notes = (document.getElementById('swal-notes') as HTMLTextAreaElement).value;

        if (!name || (!targetCred && !password)) {
          MySwal.showValidationMessage('Name and Password are required');
          return false;
        }
        return { name, username, password, notes };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        if (targetCred) {
          updateMutation.mutate({ id: targetCred.id, data: result.value });
        } else {
          createMutation.mutate(result.value);
        }
      }
    });
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => createCredential(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
      MySwal.fire({ title: 'Berhasil', text: 'Kredensial berhasil dibuat.', icon: 'success', ...swalTheme });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updateCredential(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
      MySwal.fire({ title: 'Tersimpan!', text: 'Kredensial berhasil diperbarui.', icon: 'success', ...swalTheme });
    }
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="p-1.5 rounded-lg bg-[#1E90FF]/10 text-[#1E90FF]">
                <Lock className="w-6 h-6" />
             </div>
             <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A]">Centralized Vault</h1>
          </div>
          <p className="text-[14px] font-medium text-[#64748B]">Securely manage database credentials across your entire network.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh} 
            className="h-10 px-4 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[13px] font-semibold text-[#64748B] transition-all flex items-center gap-2 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${(isFetching || isManualRefreshing) ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button 
            onClick={() => handleCreateOrEdit()}
            className="h-10 px-5 rounded-lg bg-[#1E90FF] hover:bg-[#1c86ee] text-[13px] font-bold text-white shadow-lg shadow-[#1E90FF]/2 relative active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Plus className="w-4.5 h-4.5" /> New Credential
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
              placeholder="Search by name or username..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-lg border border-[#E2E8F0] bg-white text-[13px] font-medium text-[#0F172A] focus:ring-4 focus:ring-[#1E90FF]/5 focus:border-[#1E90FF] transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-blue-50/50 rounded-lg border border-blue-100">
             <ShieldCheck className="w-4 h-4 text-[#1E90FF]" />
             <span className="text-[11px] font-bold text-[#1E90FF] uppercase tracking-wider">AES-256 GCM Encryption Active</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">Friendly Name</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">Username</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">Notes</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider text-right">Last Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#64748B]">
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-3 text-[#1E90FF]" />
                    <p className="font-medium">Membuka brankas sandi...</p>
                  </td>
                </tr>
              )}
              {!isLoading && filteredCreds.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#94A3B8]">
                    <Key className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Belum ada kredensial yang tersimpan di dalam brankas.</p>
                  </td>
                </tr>
              )}
              {filteredCreds.map((cred: any) => {
                const isSelected = selectedCredId === String(cred.id);
                return (
                  <tr 
                    key={cred.id} 
                    onClick={() => setSelectedCredId(isSelected ? null : String(cred.id))}
                    className={cn(
                        "hover:bg-[#F8FAFC] transition-all cursor-pointer group",
                        isSelected ? "bg-[#F0F7FF] hover:bg-[#F0F7FF]" : ""
                    )}
                  >
                    <td className="px-6 py-4.5 text-center">
                      <div className="flex items-center justify-center">
                        <div className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                            isSelected ? "border-[#1E90FF] bg-[#1E90FF]" : "border-[#CBD5E1] bg-white group-hover:border-[#94A3B8]"
                        )}>
                          {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 font-bold font-mono text-[12px] text-[#0F172A]">{cred.id}</td>
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                          <Key className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-[#1E90FF]">{cred.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 font-semibold text-[#1F2937] font-mono text-xs">{cred.username || "—"}</td>
                    <td className="px-6 py-4.5 text-[12px] text-[#64748B] max-w-[300px] truncate">{cred.notes || "—"}</td>
                    <td className="px-6 py-4.5 text-[11px] font-bold text-[#94A3B8] text-right">
                      {cred.updated_at || cred.created_at}
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
                onClick={() => handleCreateOrEdit()}
                disabled={!selectedCredId} 
                className="h-10 px-5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#64748B] hover:text-[#1E90FF] hover:border-[#1E90FF]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Edit className="w-4 h-4" /> Edit Brankas
             </button>
             <div className="w-px h-6 bg-[#E2E8F0] mx-1" />
             <button 
                onClick={handleDelete}
                disabled={!selectedCredId} 
                className="h-10 px-5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#64748B] hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Trash2 className="w-4 h-4" /> Hapus Brankas
             </button>
          </div>
          
          <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">
            {selectedCredId ? `Credential Terpilih: ${selectedCred?.name}` : 'Pilih kredensial untuk melakukan modifikasi data'}
          </div>
        </div>
      </div>
    </div>
  );
}
