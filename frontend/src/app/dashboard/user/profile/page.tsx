"use client";

import { useState } from "react";

import { User, Search, Plus, Edit, Eye, Trash2, KeyRound, RefreshCw, Loader2, X, Check, CheckCircle2, XCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUsers, createUser, updateUser, deleteUser, fetchRoles } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Breadcrumbs } from "@/components/remake/Breadcrumbs";

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"create" | "edit" | "view">("create");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error", message: string } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "operator",
    branch: "",
    email: ""
  });

  const { data: usersData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  const { data: rolesData } = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
  });

  const users = usersData?.data || [];
  const roles = rolesData?.data || [];
  const selectedUser = users.find((u: any) => u.id === selectedUserId);

  const filteredUsers = users.filter((u: any) => 
    String(u.id).toLowerCase().includes(searchTerm.toLowerCase()) || 
    String(u.name).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Mutations
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setModalOpen(false);
      resetForm();
      setNotification({ type: "success", message: "User created successfully!" });
    },
    onError: (err: any) => setNotification({ type: "error", message: err.response?.data?.error || "Failed to create user" })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setModalOpen(false);
      setNotification({ type: "success", message: "User data updated successfully!" });
    },
    onError: (err: any) => setNotification({ type: "error", message: err.response?.data?.error || "Failed to update user" })
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setDeleteModalOpen(false);
      setSelectedUserId(null);
      setNotification({ type: "success", message: "User deleted successfully!" });
    },
    onError: (err: any) => {
      setDeleteModalOpen(false);
      setNotification({ type: "error", message: err.response?.data?.error || "Failed to delete user" });
    }
  });

  const resetForm = () => {
    setFormData({ username: "", password: "", role: "operator", branch: "", email: "" });
  };

  const handleOpenCreate = () => {
    setModalType("create");
    resetForm();
    setModalOpen(true);
  };

  const handleOpenView = () => {
    if (!selectedUser) return;
    setModalType("view");
    setFormData({
      username: selectedUser.id,
      password: "",
      role: selectedUser.role,
      branch: selectedUser.branch || "",
      email: selectedUser.email || ""
    });
    setModalOpen(true);
  };

  const handleOpenEdit = () => {
    if (!selectedUser) return;
    setModalType("edit");
    setFormData({
      username: selectedUser.id,
      password: "", // Only update if typed
      role: selectedUser.role,
      branch: selectedUser.branch || "",
      email: selectedUser.email || ""
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
      updateMutation.mutate({ id: selectedUserId!, data: formData });
    }
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      <Breadcrumbs />
      
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <User className="w-5 h-5" />
             </div>
             <h1 className="text-3xl font-semibold tracking-tight text-foreground">System Users List</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Manage access, permissions, and user accounts in the sync infrastructure.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="h-10 px-5 rounded-lg bg-[#1E90FF] hover:bg-[#1c86ee] text-[13px] font-bold text-white shadow-lg shadow-[#1E90FF]/2 transition-all flex items-center gap-2 active:scale-[0.98]"
        >
          <Plus className="w-4.5 h-4.5" /> Add New User
        </button>
      </div>

      <div className="enterprise-card flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="relative w-full max-w-sm flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
              <input 
                type="text" 
                placeholder="Search user..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="w-full h-11 pl-11 pr-4 rounded-lg border border-border bg-card text-[13px] font-medium text-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
              />
            </div>
          </div>
          <button onClick={() => refetch()} className="w-10 h-10 flex items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-primary transition-all">
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Account ID</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Branch</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Email Address</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right">Last Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
               {isLoading && (
                 <tr>
                   <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                     <Loader2 className="w-6 h-6 mx-auto animate-spin mb-3 text-primary" />
                     <p className="font-medium">Loading user directory...</p>
                   </td>
                 </tr>
               )}
               {!isLoading && filteredUsers.length === 0 && (
                 <tr>
                   <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-medium italic">
                     No users found.
                   </td>
                 </tr>
               )}
               {!isLoading && filteredUsers.map((u: any) => (
                 <tr 
                   key={u.id} 
                   onClick={() => setSelectedUserId(u.id)}
                   className={cn(
                     "transition-all cursor-pointer",
                     selectedUserId === u.id ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"
                   )}
                 >
                   <td className="px-6 py-4.5 text-center">
                     <div className="flex items-center justify-center">
                       <div className={cn(
                         "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                         selectedUserId === u.id ? "border-primary bg-primary" : "border-border bg-card"
                       )}>
                          {selectedUserId === u.id && <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />}
                       </div>
                     </div>
                   </td>
                   <td className="px-6 py-4.5 font-bold font-mono text-[12px] text-foreground">{u.id}</td>
                   <td className="px-6 py-4.5">
                     <span className="px-2.5 py-1 rounded-full bg-muted text-[11px] font-bold text-muted-foreground uppercase">
                        {u.role}
                     </span>
                   </td>
                   <td className="px-6 py-4.5 text-[13px] text-muted-foreground">{u.branch || "—"}</td>
                   <td className="px-6 py-4.5 text-[13px] text-muted-foreground">{u.email || "—"}</td>
                   <td className="px-6 py-4.5 text-[12px] font-medium text-muted-foreground/60 text-right">{u.lastLogin || "Never"}</td>
                 </tr>
               ))}
            </tbody>
          </table>
        </div>

        {/* Action Bar */}
        <div className="p-5 border-t border-border flex flex-wrap items-center justify-between bg-muted/10">
          <div className="flex items-center gap-3">
             <button 
                onClick={handleOpenView}
                disabled={!selectedUserId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
             >
               <Eye className="w-4 h-4" /> View User
             </button>
             <button 
                onClick={handleOpenEdit}
                disabled={!selectedUserId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
             >
               <Edit className="w-4 h-4" /> Edit User
             </button>
             <div className="w-px h-6 bg-border mx-1" />
             <button 
                onClick={() => setDeleteModalOpen(true)}
                disabled={!selectedUserId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
             >
               <Trash2 className="w-4 h-4" /> Delete User
             </button>
          </div>
        </div>
      </div>

      {/* Modal - Create/Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 border-b border-border flex items-center justify-between bg-card">
                <h2 className="text-xl font-bold text-foreground">
                    {modalType === "create" ? "Create New User" : modalType === "view" ? "User Details" : "Edit User Details"}
                </h2>
                <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                   <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-muted/10">
                 <div className="space-y-1.5">
                   <label className="text-[12px] font-bold text-muted-foreground uppercase">Username / ID</label>
                   <input 
                     type="text" 
                     value={formData.username}
                     onChange={(e) => setFormData({...formData, username: e.target.value})}
                     className="w-full h-11 px-4 rounded-lg border border-border bg-card text-[14px] font-medium text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all disabled:bg-muted/50 disabled:text-muted-foreground"
                     disabled={modalType !== "create"}
                     required
                   />
                 </div>

                 <div className="space-y-1.5">
                   <label className="text-[12px] font-bold text-muted-foreground uppercase">Role</label>
                   <select 
                     value={formData.role}
                     onChange={(e) => setFormData({...formData, role: e.target.value})}
                     className="w-full h-11 px-4 rounded-lg border border-border bg-card text-[14px] font-medium text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all disabled:bg-muted/50 disabled:text-muted-foreground"
                     disabled={modalType === "view"}
                     required
                   >
                     {roles.map((r: any) => (
                       <option key={r.id} value={r.name}>{r.name}</option>
                     ))}
                     {roles.length === 0 && <option value="operator">Operator</option>}
                   </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[12px] font-bold text-muted-foreground uppercase">Branch</label>
                      <input 
                        type="text" 
                        value={formData.branch}
                        onChange={(e) => setFormData({...formData, branch: e.target.value})}
                        placeholder="e.g. Jakarta HQ"
                        className="w-full h-11 px-4 rounded-lg border border-border bg-card text-[14px] font-medium text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all disabled:bg-muted/50 disabled:text-muted-foreground"
                        disabled={modalType === "view"}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[12px] font-bold text-muted-foreground uppercase">Email</label>
                      <input 
                        type="email" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="user@example.com"
                        className="w-full h-11 px-4 rounded-lg border border-border bg-card text-[14px] font-medium text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all disabled:bg-muted/50 disabled:text-muted-foreground"
                        disabled={modalType === "view"}
                      />
                    </div>
                  </div>

                  {modalType !== "view" && (
                     <div className="space-y-1.5">
                       <label className="text-[12px] font-bold text-muted-foreground uppercase">
                         {modalType === "create" ? "Password" : "New Password (Optional)"}
                       </label>
                       <input 
                         type="password" 
                         value={formData.password}
                         onChange={(e) => setFormData({...formData, password: e.target.value})}
                         className="w-full h-11 px-4 rounded-lg border border-border bg-card text-[14px] font-medium text-foreground outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                         required={modalType === "create"}
                       />
                     </div>
                  )}

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
                         className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-[14px] font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                       >
                         {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                         {modalType === "create" ? "Create User" : "Save Changes"}
                       </button>
                   )}
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Modal - Delete Confirmation */}
      {deleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 text-center space-y-4">
                 <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Trash2 className="w-8 h-8" />
                 </div>
                 <div>
                    <h3 className="text-xl font-bold text-foreground">Delete User?</h3>
                    <p className="text-[14px] text-muted-foreground mt-1 px-4">
                       Are you sure you want to delete <span className="font-bold text-foreground">"{selectedUser.id}"</span>? This action cannot be undone.
                    </p>
                 </div>
                 <div className="flex flex-col gap-2">
                    <button 
                       onClick={() => deleteMutation.mutate(selectedUserId!)}
                       className="h-12 w-full rounded-xl bg-red-500 text-white font-bold text-[14px] hover:bg-red-600 transition-all flex items-center justify-center gap-2"
                    >
                       {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Yes, Delete User"}
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
