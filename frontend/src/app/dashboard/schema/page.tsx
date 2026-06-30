"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Copy, Edit, Trash2, Eye, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TableSkeleton } from "@/components/remake/Skeleton";
import { Breadcrumbs } from "@/components/remake/Breadcrumbs";
import { Pagination } from "@/components/remake/Pagination";
import { fetchSchemas, deleteSchema } from "@/lib/api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
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

export default function SchemaPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
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
        title: 'Success',
        text: 'Schema list updated successfully.',
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
      MySwal.fire({ title: 'Deleted!', text: 'Schema deleted successfully.', icon: 'success', ...swalTheme });
    },
    onError: (err: any) => {
      MySwal.fire({ title: 'Failed', text: err?.response?.data?.error || 'Failed to delete schema.', icon: 'error', ...swalTheme });
    }
  });

  const schemas = schemasData?.data || [];
  const total = schemasData?.total || 0;
  const selectedSchema = schemas.find((s: any) => s.id === selectedSchemaId);

  const handleDelete = () => {
    if (!selectedSchema) return;
    MySwal.fire({
      title: 'Delete Schema?',
      text: `Are you sure you want to delete the schema "${selectedSchema.name}"? This will impact ETL Jobs using it.`,
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
      if (result.isConfirmed) deleteMutation.mutate(selectedSchemaId!);
    });
  };

  const filteredSchemas = schemas.filter((schema: any) => 
    schema.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    schema.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredSchemas.length / PAGE_SIZE));
  const paginatedSchemas = filteredSchemas.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      <Breadcrumbs />
      
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Copy className="w-5 h-5" />
             </div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Schema Structure & Rules</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Column and query mapping for data extraction/loading between endpoints.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh} 
            className="h-10 px-4 rounded-lg bg-card border border-border hover:bg-muted text-[13px] font-semibold text-muted-foreground transition-all flex items-center gap-2 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${(isFetching || isManualRefreshing) ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button 
            onClick={() => router.push('/dashboard/schema/new')} 
            className="h-10 px-5 rounded-lg bg-primary hover:bg-primary/90 text-[13px] font-bold text-primary-foreground shadow-lg shadow-primary/2 transition-all flex items-center gap-2 active:scale-[0.98]"
          >
            <Plus className="w-4.5 h-4.5" /> Create New Schema
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
              placeholder="Search schema structure..." 
              value={searchTerm} 
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
              className="w-full h-11 pl-11 pr-4 rounded-lg border border-border bg-card text-[13px] font-medium text-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
            />
          </div>
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            Total Schemas: {total}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Schema Name</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Owner</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Configuration</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right">Last Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-0 py-0 text-center">
                    <TableSkeleton rows={6} cols={6} />
                  </td>
                </tr>
              )}
              {!isLoading && filteredSchemas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <p className="font-medium italic">No schema registered in the system yet.</p>
                  </td>
                </tr>
              )}
              {paginatedSchemas.map((schema: any) => {
                const isSelected = selectedSchemaId === schema.id;
                return (
                  <tr
                    key={schema.id} 
                    onClick={() => setSelectedSchemaId(isSelected ? null : schema.id)}
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
                    <td className="px-6 py-4.5 font-bold font-mono text-[12px] text-foreground">{schema.id}</td>
                    <td className="px-6 py-4.5 font-bold text-primary">{schema.name}</td>
                    <td className="px-6 py-4.5 font-bold text-muted-foreground text-[12px] uppercase tracking-tight">{schema.owner || "SYSTEM"}</td>
                    <td className="px-6 py-4.5">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-muted border border-border text-[10px] font-bold text-foreground">
                        {schema.queries_count || 0} QUERIES
                      </div>
                    </td>
                    <td className="px-6 py-4.5 text-[12px] font-medium text-muted-foreground/70 text-right">
                      {schema.updated_at ? format(new Date(schema.updated_at), 'dd/MM/yyyy HH:mm:ss') : "—"}
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
                onClick={() => router.push(`/dashboard/schema/${selectedSchemaId}?mode=view`)}
                disabled={!selectedSchemaId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Eye className="w-4 h-4" /> View Details
             </button>
             <button 
                onClick={() => router.push(`/dashboard/schema/${selectedSchemaId}`)}
                disabled={!selectedSchemaId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Edit className="w-4 h-4" /> Edit Schema
             </button>
             <div className="w-px h-6 bg-border mx-1" />
             <button 
                onClick={handleDelete}
                disabled={!selectedSchemaId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Trash2 className="w-4 h-4" /> Delete Schema
             </button>
          </div>
          
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            {selectedSchemaId ? `Selected Schema: ${selectedSchema?.name}` : 'Select a schema structure to modify'}
          </div>
        </div>

        {/* Pagination */}
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredSchemas.length}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
}
