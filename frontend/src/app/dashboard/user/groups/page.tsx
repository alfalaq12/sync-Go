"use client";

import { useState } from "react";
import { Users, Search, Plus, Edit, Eye, Trash2, RefreshCw, Loader2, X, Check, CheckCircle2, XCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchGroups, createGroup, updateGroup, deleteGroup } from "@/lib/api";

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"create" | "edit" | "view">("create");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error", message: string } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  });

  const { data: groupsData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["groups"],
    queryFn: fetchGroups,
  });

  const groups = groupsData?.data || [];
  const selectedGroup = groups.find((g: any) => String(g.id) === String(selectedGroupId));

  const filteredGroups = groups.filter((g: any) => 
    String(g.id).toLowerCase().includes(searchTerm.toLowerCase()) || 
    String(g.name).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setModalOpen(false);
      resetForm();
      setNotification({ type: "success", message: "Grup berhasil dibuat!" });
    },
    onError: (err: any) => setNotification({ type: "error", message: err.response?.data?.error || "Gagal membuat grup" })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updateGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setModalOpen(false);
      setNotification({ type: "success", message: "Data grup berhasil diperbarui!" });
    },
    onError: (err: any) => setNotification({ type: "error", message: err.response?.data?.error || "Gagal memperbarui grup" })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setDeleteModalOpen(false);
      setSelectedGroupId(null);
      setNotification({ type: "success", message: "Grup berhasil dihapus!" });
    },
    onError: (err: any) => {
      setDeleteModalOpen(false);
      setNotification({ type: "error", message: err.response?.data?.error || "Gagal menghapus grup" });
    }
  });

  const resetForm = () => {
    setFormData({ name: "", description: "" });
  };

  const handleOpenCreate = () => {
    setModalType("create");
    resetForm();
    setModalOpen(true);
  };

  const handleOpenView = () => {
    if (!selectedGroup) return;
    setModalType("view");
    setFormData({
      name: selectedGroup.name,
      description: selectedGroup.description || ""
    });
    setModalOpen(true);
  };

  const handleOpenEdit = () => {
    if (!selectedGroup) return;
    setModalType("edit");
    setFormData({
      name: selectedGroup.name,
      description: selectedGroup.description || ""
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (modalType === "view") {
        setModalOpen(false);
        return;
    }
    if (modalType === "create") {
      createMutation.mutate(formData);
    } else {
      updateMutation.mutate({ id: selectedGroupId!, data: formData });
    }
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="p-1.5 rounded-lg bg-[#1E90FF]/10 text-[#1E90FF]">
                <Users className="w-5 h-5" />
             </div>
             <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A]">Grup & Tim Pengguna</h1>
          </div>
          <p className="text-[14px] font-medium text-[#64748B]">Kelola pengelompokan akun dan koordinasi tim secara struktural.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => refetch()} 
            className="h-10 px-4 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[13px] font-semibold text-[#64748B] transition-all flex items-center gap-2 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button 
            onClick={handleOpenCreate}
            className="h-10 px-5 rounded-lg bg-[#1E90FF] hover:bg-[#1c86ee] text-[13px] font-bold text-white shadow-lg shadow-[#1E90FF]/2 transition-all flex items-center gap-2 active:scale-[0.98]"
          >
            <Plus className="w-4.5 h-4.5" /> Buat Grup Baru
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
              placeholder="Cari grup atau ID..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full h-11 pl-11 pr-4 rounded-lg border border-[#E2E8F0] bg-white text-[13px] font-medium text-[#0F172A] focus:outline-none focus:border-[#1E90FF] focus:ring-4 focus:ring-[#1E90FF]/5 transition-all outline-none" 
            />
          </div>
          <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">
            Total Groups: {groups.length}
          </div>
        </div>

        {/* Table Section */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider w-40">Group ID</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">Group Name</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider text-right">Records</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
               {isLoading && (
                 <tr>
                   <td colSpan={4} className="px-6 py-12 text-center text-[#64748B]">
                     <Loader2 className="w-6 h-6 mx-auto animate-spin mb-3 text-[#1E90FF]" />
                     <p className="font-medium">Loading groups...</p>
                   </td>
                 </tr>
               )}
               {!isLoading && filteredGroups.length === 0 && (
                 <tr>
                   <td colSpan={4} className="px-6 py-12 text-center text-[#94A3B8] font-medium italic">
                     No groups found matching your criteria.
                   </td>
                 </tr>
               )}
               {!isLoading && filteredGroups.map((g: any) => {
                 const isSelected = selectedGroupId === g.id;
                 return (
                  <tr 
                    key={g.id} 
                    onClick={() => setSelectedGroupId(isSelected ? null : g.id)}
                    className={`hover:bg-[#F8FAFC] transition-all cursor-pointer group ${isSelected ? 'bg-[#F0F7FF] hover:bg-[#F0F7FF]' : ''}`}
                  >
                    <td className="px-6 py-4.5 text-center">
                      <div className="flex items-center justify-center">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${isSelected ? 'border-[#1E90FF] bg-[#1E90FF]' : 'border-[#CBD5E1] bg-white group-hover:border-[#94A3B8]'}`}>
                           {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 font-bold font-mono text-[12px] text-[#0F172A]">{g.id}</td>
                    <td className="px-6 py-4.5 font-bold text-[#0F172A]">{g.name}</td>
                    <td className="px-6 py-4.5 text-right font-bold text-[#94A3B8] text-[11px]">ACTIVE</td>
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
                onClick={handleOpenView}
                disabled={!selectedGroupId} 
                className="h-10 px-5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#64748B] hover:text-[#1E90FF] hover:border-[#1E90FF]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Eye className="w-4 h-4" /> View Details
             </button>
             <button 
                onClick={handleOpenEdit}
                disabled={!selectedGroupId} 
                className="h-10 px-5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#64748B] hover:text-[#1E90FF] hover:border-[#1E90FF]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Edit className="w-4 h-4" /> Edit Group
             </button>
             <div className="w-px h-6 bg-[#E2E8F0] mx-1" />
             <button 
                onClick={() => setDeleteModalOpen(true)}
                disabled={!selectedGroupId} 
                className="h-10 px-5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#64748B] hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Trash2 className="w-4 h-4" /> Delete Group
             </button>
          </div>
          <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">
            {selectedGroupId ? `Grup Terpilih: ${selectedGroup?.name}` : 'Pilih grup untuk melakukan modifikasi'}
          </div>
        </div>
      </div>

      {/* Modal - Create/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setModalOpen(false)}>
           <div className="bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
                <h2 className="text-xl font-bold text-[#0F172A]">
                    {modalType === "create" ? "Buat Grup Baru" : modalType === "view" ? "Detail Informasi Grup" : "Ubah Grup"}
                </h2>
                <button onClick={() => setModalOpen(false)} className="text-[#64748B] hover:text-[#0F172A] transition-colors">
                   <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
                 <div className="space-y-1.5">
                   <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">Group Name</label>
                   <input 
                     type="text" 
                     value={formData.name}
                     onChange={(e) => setFormData({...formData, name: e.target.value})}
                     placeholder="e.g. Administrators"
                     className="w-full h-11 px-4 rounded-lg border border-[#E2E8F0] bg-white text-[14px] font-semibold text-[#0F172A] outline-none focus:border-[#1E90FF] focus:ring-4 focus:ring-[#1E90FF]/5 transition-all disabled:bg-slate-50 disabled:text-slate-400 placeholder:text-slate-300"
                     disabled={modalType === "view"}
                     required
                   />
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">Description</label>
                   <textarea 
                     value={formData.description}
                     onChange={(e) => setFormData({...formData, description: e.target.value})}
                     placeholder="Enter group purpose or notes..."
                     className="w-full min-h-[100px] p-4 rounded-lg border border-[#E2E8F0] bg-white text-[14px] font-semibold text-[#0F172A] outline-none focus:border-[#1E90FF] focus:ring-4 focus:ring-[#1E90FF]/5 transition-all resize-none disabled:bg-slate-50 disabled:text-slate-400 placeholder:text-slate-300"
                     disabled={modalType === "view"}
                   />
                 </div>

                 <div className="pt-4 flex items-center gap-3">
                   <button 
                     type="button"
                     onClick={() => setModalOpen(false)}
                     className="flex-1 h-12 rounded-xl border border-[#E2E8F0] bg-white text-[14px] font-bold text-[#64748B] hover:bg-[#F8FAFC] transition-all"
                   >
                     {modalType === "view" ? "Tutup" : "Batal"}
                   </button>
                   {modalType !== "view" && (
                       <button 
                         type="submit"
                         disabled={createMutation.isPending || updateMutation.isPending}
                         className="flex-1 h-12 rounded-xl bg-[#1E90FF] text-white text-[14px] font-bold hover:bg-[#1c86ee] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1E90FF]/25"
                       >
                         {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                         {modalType === "create" ? "Tambah Grup" : "Simpan Perubahan"}
                       </button>
                   )}
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Modal - Delete Confirmation */}
      {deleteModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDeleteModalOpen(false)}>
           <div className="bg-white rounded-2xl shadow-2xl border border-red-100 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-8 text-center space-y-4">
                 <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Trash2 className="w-8 h-8" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-[#0F172A]">Delete Group?</h3>
                    <p className="text-[14px] text-[#64748B] mt-1 px-4 leading-relaxed">
                       Are you sure you want to delete <span className="font-bold text-[#0F172A]">"{selectedGroup.name}"</span>? Members will lose their group associations.
                    </p>
                 </div>
                 <div className="flex flex-col gap-2 pt-2">
                    <button 
                       onClick={() => deleteMutation.mutate(String(selectedGroupId!))}
                       className="h-12 w-full rounded-xl bg-red-500 text-white font-bold text-[14px] hover:bg-red-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                    >
                       {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Delete Group"}
                    </button>
                    <button 
                       onClick={() => setDeleteModalOpen(false)}
                       className="h-12 w-full rounded-xl bg-white border border-[#E2E8F0] text-[#64748B] font-bold text-[14px] hover:bg-[#F8FAFC] transition-all"
                    >
                       Cancel
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Modal - Notification (Success/Error) */}
      {notification && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl border w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 text-center space-y-4">
                 <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                    {notification.type === 'success' ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-[#0F172A]">{notification.type === 'success' ? 'Berhasil!' : 'Gagal!'}</h3>
                    <p className="text-[14px] text-[#64748B] mt-1 px-4">
                       {notification.message}
                    </p>
                 </div>
                 <div className="pt-2">
                    <button 
                       onClick={() => setNotification(null)}
                       className={`h-12 w-full rounded-xl text-white font-bold text-[14px] transition-all ${notification.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}
                    >
                       Tutup
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
