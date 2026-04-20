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
import { Breadcrumbs } from "@/components/remake/Breadcrumbs";
import { Pagination } from "@/components/remake/Pagination";

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
        title: 'Success',
        text: 'Credential data updated successfully.',
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
      MySwal.fire({ title: 'Deleted!', text: 'Credential deleted successfully.', icon: 'success', ...swalTheme });
    },
    onError: (err: any) => {
      MySwal.fire({ title: 'Failed', text: err?.response?.data?.error || 'Failed to delete credential.', icon: 'error', ...swalTheme });
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
      title: 'Delete Credential?',
      text: `Are you sure you want to delete the credential "${selectedCred.name}"? This credential cannot be deleted if it is still connected to active network jobs.`,
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
        deleteMutation.mutate(selectedCredId!);
      }
    });
  };

  const handleCreateOrEdit = (cred?: any) => {
    const targetCred = cred || selectedCred;
    MySwal.fire({
      title: targetCred ? 'Edit Credential' : 'New Credential',
      html: `
        <div class="text-left space-y-4">
          <div>
            <label class="block text-xs font-bold text-muted-foreground uppercase mb-1">Friendly Name</label>
            <input id="swal-name" class="swal2-input !mt-0 !w-full" placeholder="e.g. Production PostgreSQL" value="${targetCred?.name || ''}">
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-foreground uppercase mb-1">Database Username</label>
            <input id="swal-username" class="swal2-input !mt-0 !w-full" placeholder="e.g. postgres" value="${targetCred?.username || ''}">
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-foreground uppercase mb-1">Password</label>
            <input id="swal-password" type="password" class="swal2-input !mt-0 !w-full" placeholder="Enter password">
          </div>
          <div>
            <label class="block text-xs font-bold text-muted-foreground uppercase mb-1">Notes</label>
            <textarea id="swal-notes" class="swal2-textarea !mt-0 !w-full" placeholder="Additional details...">${targetCred?.notes || ''}</textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: targetCred ? 'Save Data' : 'Create New',
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
      MySwal.fire({ title: 'Success', text: 'Credential created successfully.', icon: 'success', ...swalTheme });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updateCredential(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
      MySwal.fire({ title: 'Saved!', text: 'Credential updated successfully.', icon: 'success', ...swalTheme });
    }
  });

  return (
    <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <Breadcrumbs />
      
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Lock className="w-6 h-6" />
             </div>
             <h1 className="text-3xl font-semibold tracking-tight text-foreground">Centralized Vault</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Securely manage database credentials across your entire network.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh} 
            className="h-10 px-4 rounded-lg bg-card border border-border hover:bg-muted text-[13px] font-semibold text-muted-foreground transition-all flex items-center gap-2 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${(isFetching || isManualRefreshing) ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button 
            onClick={() => handleCreateOrEdit()}
            className="h-10 px-5 rounded-lg bg-primary hover:bg-primary/90 text-[13px] font-bold text-primary-foreground shadow-lg shadow-primary/2 relative active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Plus className="w-4.5 h-4.5" /> New Credential
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
              placeholder="Search by name or username..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-11 pr-4 rounded-lg border border-border bg-card text-[13px] font-medium text-foreground focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none"
            />
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 rounded-lg border border-primary/10">
             <ShieldCheck className="w-4 h-4 text-primary" />
             <span className="text-[11px] font-bold text-primary uppercase tracking-wider">AES-256 GCM Encryption Active</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Friendly Name</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Username</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Notes</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right">Last Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-3 text-primary" />
                    <p className="font-medium">Opening password vault...</p>
                  </td>
                </tr>
              )}
              {!isLoading && filteredCreds.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#94A3B8]">
                    <Key className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No credentials saved in the vault yet.</p>
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
                    <td className="px-6 py-4.5 font-bold font-mono text-[12px] text-foreground">{cred.id}</td>
                    <td className="px-6 py-4.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <Key className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-primary">{cred.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 font-semibold text-foreground font-mono text-xs">{cred.username || "—"}</td>
                    <td className="px-6 py-4.5 text-[12px] text-muted-foreground max-w-[300px] truncate">{cred.notes || "—"}</td>
                    <td className="px-6 py-4.5 text-[11px] font-bold text-muted-foreground/60 text-right">
                      {cred.updated_at || cred.created_at}
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
                onClick={() => handleCreateOrEdit()}
                disabled={!selectedCredId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Edit className="w-4 h-4" /> Edit Vault
             </button>
             <div className="w-px h-6 bg-border mx-1" />
             <button 
                onClick={handleDelete}
                disabled={!selectedCredId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Trash2 className="w-4 h-4" /> Delete Vault
             </button>
          </div>
          
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            {selectedCredId ? `Selected Credential: ${selectedCred?.name}` : 'Select a credential to modify data'}
          </div>
        </div>

        {/* Pagination placeholder as total is not defined similarly to other pages yet */}
        <Pagination 
          currentPage={1}
          totalPages={1}
          onPageChange={() => {}}
          totalItems={credentials.length}
          pageSize={10}
        />
      </div>
    </div>
  );
}
