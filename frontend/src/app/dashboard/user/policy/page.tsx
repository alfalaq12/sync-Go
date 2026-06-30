"use client";

import { useState } from "react";

import { FileText, Search, Plus, Edit, Eye, Trash2, RefreshCw, Loader2, X, Check, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPolicies, createPolicy, updatePolicy, deletePolicy } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/remake/Breadcrumbs";
import { Pagination } from "@/components/remake/Pagination";

export default function PolicyPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"create" | "edit" | "view">("create");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error", message: string } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    policy_type: "permission",
    content: "",
    description: ""
  });

  const { data: policiesData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["policies"],
    queryFn: fetchPolicies,
  });

  const policies = policiesData?.data || [];
  const selectedPolicy = policies.find((p: any) => String(p.id) === String(selectedPolicyId));

  const filteredPolicies = policies.filter((p: any) => 
    String(p.id).toLowerCase().includes(searchTerm.toLowerCase()) || 
    String(p.name).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredPolicies.length / PAGE_SIZE));
  const paginatedPolicies = filteredPolicies.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Mutations
  const createMutation = useMutation({
    mutationFn: createPolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      setModalOpen(false);
      resetForm();
      setNotification({ type: "success", message: "Policy created successfully!" });
    },
    onError: (err: any) => setNotification({ type: "error", message: err.response?.data?.error || "Failed to create policy" })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updatePolicy(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      setModalOpen(false);
      setNotification({ type: "success", message: "Policy rules updated successfully!" });
    },
    onError: (err: any) => setNotification({ type: "error", message: err.response?.data?.error || "Failed to update policy" })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePolicy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      setDeleteModalOpen(false);
      setSelectedPolicyId(null);
      setNotification({ type: "success", message: "Policy deleted successfully!" });
    },
    onError: (err: any) => {
      setDeleteModalOpen(false);
      setNotification({ type: "error", message: err.response?.data?.error || "Failed to delete policy" });
    }
  });

  const resetForm = () => {
    setFormData({ name: "", policy_type: "permission", content: "", description: "" });
  };

  const handleOpenCreate = () => {
    setModalType("create");
    resetForm();
    setModalOpen(true);
  };

  const handleOpenView = () => {
    if (!selectedPolicy) return;
    setModalType("view");
    setFormData({
      name: selectedPolicy.name,
      policy_type: selectedPolicy.policy_type || "permission",
      content: selectedPolicy.content || "",
      description: selectedPolicy.description || ""
    });
    setModalOpen(true);
  };

  const handleOpenEdit = () => {
    if (!selectedPolicy) return;
    setModalType("edit");
    setFormData({
      name: selectedPolicy.name,
      policy_type: selectedPolicy.policy_type || "permission",
      content: selectedPolicy.content || "",
      description: selectedPolicy.description || ""
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
      updateMutation.mutate({ id: selectedPolicyId!, data: formData });
    }
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      <Breadcrumbs />
      
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <FileText className="w-5 h-5" />
             </div>
             <h1 className="text-3xl font-semibold tracking-tight text-foreground">Access Policies</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Manage security protocols, access restrictions, and system rules centrally.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => refetch()} 
            className="h-10 px-4 rounded-lg bg-card border border-border hover:bg-muted text-[13px] font-semibold text-muted-foreground transition-all flex items-center gap-2 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button 
            onClick={handleOpenCreate}
            className="h-10 px-5 rounded-lg bg-primary hover:bg-primary/90 text-[13px] font-bold text-primary-foreground shadow-lg shadow-primary/2 transition-all flex items-center gap-2 active:scale-[0.98]"
          >
            <Plus className="w-4.5 h-4.5" /> Create New Policy
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
                placeholder="Search policies..." 
                value={searchTerm} 
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
                className="w-full h-11 pl-11 pr-4 rounded-lg border border-border bg-card text-[13px] font-medium text-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
              />
          </div>
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            {policies.length} Active Policies
          </div>
        </div>

        {/* Table/Content */}
        <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-6 py-4 w-10"></th>
                    <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider w-40">Policy ID</th>
                    <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Policy Name</th>
                    <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right">Records</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                        <Loader2 className="w-6 h-6 mx-auto animate-spin mb-3 text-primary" />
                        <p className="font-medium">Loading security policies...</p>
                      </td>
                    </tr>
                  )}
                  {!isLoading && filteredPolicies.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-[#94A3B8] font-medium">
                        No policies found.
                      </td>
                    </tr>
                  )}
                  {!isLoading && paginatedPolicies.map((p: any) => {
                    const isSelected = selectedPolicyId === p.id;
                    return (
                      <tr 
                        key={p.id} 
                        onClick={() => setSelectedPolicyId(isSelected ? null : p.id)}
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
                        <td className="px-6 py-4.5 font-bold font-mono text-[12px] text-foreground">{p.id}</td>
                        <td className="px-6 py-4.5 font-bold text-foreground">{p.name}</td>
                        <td className="px-6 py-4.5">
                           <span className="px-2.5 py-1 rounded-full bg-primary/10 text-[10px] font-bold text-primary uppercase tracking-tight">
                              {p.policy_type}
                           </span>
                        </td>
                        <td className="px-6 py-4.5 text-right font-bold text-muted-foreground/60 text-[11px]">ENFORCED</td>
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
                onClick={handleOpenView}
                disabled={!selectedPolicyId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Eye className="w-4 h-4" /> View Details
             </button>
             <button 
                onClick={handleOpenEdit}
                disabled={!selectedPolicyId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Edit className="w-4 h-4" /> Edit Policy
             </button>
             <div className="w-px h-6 bg-border mx-1" />
             <button 
                onClick={() => setDeleteModalOpen(true)}
                disabled={!selectedPolicyId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Trash2 className="w-4 h-4" /> Delete Policy
             </button>
          </div>
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            {selectedPolicyId ? `Selected Policy: ${selectedPolicy?.name}` : 'Select a policy to modify'}
          </div>
        </div>

        {/* Pagination */}
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredPolicies.length}
          pageSize={PAGE_SIZE}
        />
      </div>

      {/* Modal - Create/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setModalOpen(false)}>
           <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-border flex items-center justify-between bg-card">
                <h2 className="text-xl font-bold text-foreground">
                    {modalType === "create" ? "Add New Policy" : modalType === "view" ? "Policy Details" : "Edit Policy Rules"}
                </h2>
                <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                   <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-muted/10 max-h-[80vh] overflow-y-auto">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Policy Name</label>
                      <input 
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        placeholder="e.g. ReadOnly-Access"
                        className="w-full h-11 px-4 rounded-lg border border-border bg-card text-[14px] font-semibold text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all disabled:bg-muted/50 disabled:text-muted-foreground placeholder:text-muted-foreground/30"
                        disabled={modalType === "view"}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Type</label>
                      <select 
                        value={formData.policy_type}
                        onChange={(e) => setFormData({...formData, policy_type: e.target.value})}
                        className="w-full h-11 px-4 rounded-lg border border-border bg-card text-[14px] font-semibold text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all disabled:bg-muted/50 disabled:text-muted-foreground"
                        disabled={modalType === "view"}
                        required
                      >
                        <option value="permission">Permission</option>
                        <option value="restriction">Restriction</option>
                        <option value="conditional">Conditional</option>
                      </select>
                    </div>
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Description</label>
                   <input 
                     type="text" 
                     value={formData.description}
                     onChange={(e) => setFormData({...formData, description: e.target.value})}
                     placeholder="Brief overview of this policy's effect..."
                     className="w-full h-11 px-4 rounded-lg border border-border bg-card text-[14px] font-semibold text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all disabled:bg-muted/50 disabled:text-muted-foreground placeholder:text-muted-foreground/30"
                     disabled={modalType === "view"}
                   />
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Policy Content (JSON/Text)</label>
                   <textarea 
                     value={formData.content}
                     onChange={(e) => setFormData({...formData, content: e.target.value})}
                     placeholder="Define rules here..."
                     className="w-full min-h-[150px] p-4 rounded-lg border border-border bg-card text-[13px] font-mono font-semibold text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all resize-none disabled:bg-muted/50 disabled:text-muted-foreground placeholder:text-muted-foreground/30"
                     disabled={modalType === "view"}
                   />
                 </div>

                 <div className="pt-4 flex items-center gap-3">
                   <button 
                     type="button"
                     onClick={() => setModalOpen(false)}
                     className="flex-1 h-12 rounded-xl border border-border bg-card text-[14px] font-bold text-muted-foreground hover:bg-muted transition-all"
                   >
                     {modalType === "view" ? "Close" : "Cancel"}
                   </button>
                   {modalType !== "view" && (
                       <button 
                         type="submit"
                         disabled={createMutation.isPending || updateMutation.isPending}
                         className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-[14px] font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                       >
                         {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                         {modalType === "create" ? "Add Policy" : "Update Rules"}
                       </button>
                   )}
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Modal - Delete Confirmation */}
      {deleteModalOpen && selectedPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDeleteModalOpen(false)}>
           <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="p-8 text-center space-y-4">
                 <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <FileText className="w-8 h-8" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-foreground">Delete Policy?</h3>
                    <p className="text-[14px] text-muted-foreground mt-1 px-4 leading-relaxed">
                       Delete <span className="font-bold text-foreground">"{selectedPolicy.name}"</span>? Any user or group attached to this rule will revert to system defaults.
                    </p>
                 </div>
                 <div className="flex flex-col gap-2 pt-2">
                    <button 
                       onClick={() => deleteMutation.mutate(String(selectedPolicyId!))}
                       className="h-12 w-full rounded-xl bg-red-500 text-white font-bold text-[14px] hover:bg-red-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
                    >
                       {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Deletion"}
                    </button>
                     <button 
                        onClick={() => setDeleteModalOpen(false)}
                        className="h-12 w-full rounded-xl bg-muted border border-border text-muted-foreground font-bold text-[14px] hover:bg-muted/80 transition-all"
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
           <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 text-center space-y-4">
                 <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2 ${notification.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {notification.type === 'success' ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-foreground">{notification.type === 'success' ? 'Success!' : 'Failed!'}</h3>
                    <p className="text-[14px] text-muted-foreground mt-1 px-4">
                       {notification.message}
                    </p>
                 </div>
                 <div className="pt-2">
                    <button 
                       onClick={() => setNotification(null)}
                       className={`h-12 w-full rounded-xl text-white font-bold text-[14px] transition-all ${notification.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600'}`}
                    >
                       Close
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
