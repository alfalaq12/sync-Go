"use client";

import { useState } from "react";
import { Activity, RefreshCw, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSessions } from "@/lib/api";
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

export default function SessionsPage() {
  const queryClient = useQueryClient();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const { data: sessionsData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["sessions"],
    queryFn: fetchSessions,
  });

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["sessions"] });
    await refetch();
    setTimeout(() => {
      setIsManualRefreshing(false);
      MySwal.fire({
        title: 'Refreshed',
        text: 'Active session logs updated.',
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
        ...swalTheme
      });
    }, 600);
  };

  const sessions = sessionsData?.data || [];
  const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE));
  const paginatedSessions = sessions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      <Breadcrumbs />
      
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Activity className="w-5 h-5" />
             </div>
             <h1 className="text-3xl font-semibold tracking-tight text-foreground">Active Sessions</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Monitor user connectivity and system access tokens.</p>
        </div>
        <button 
          onClick={handleRefresh}
          className="h-10 px-5 rounded-lg border border-border bg-card text-[13px] font-bold text-muted-foreground hover:text-primary transition-all flex items-center gap-2 active:scale-[0.98]"
        >
          <RefreshCw className={cn("w-4 h-4", (isFetching || isManualRefreshing) && "animate-spin")} /> Refresh Logs
        </button>
      </div>

      <div className="enterprise-card flex flex-col overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Session ID</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">User IP</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Client Agent</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
                {isLoading && (
                   <tr>
                     <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                       <Loader2 className="w-6 h-6 mx-auto animate-spin mb-3 text-primary" />
                       <p className="font-medium">Loading session data...</p>
                     </td>
                   </tr>
                )}
                {!isLoading && paginatedSessions.map((sess: any) => (
                  <tr key={sess.id} className="hover:bg-muted/50 transition-all">
                    <td className="px-6 py-4.5 font-mono text-[12px] text-foreground font-medium">{sess.id}</td>
                    <td className="px-6 py-4.5 text-muted-foreground">{sess.ip}</td>
                    <td className="px-6 py-4.5 text-muted-foreground max-w-[300px] truncate" title={sess.agent}>{sess.agent}</td>
                    <td className="px-6 py-4.5">
                      <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 uppercase tracking-tight">{sess.status}</span>
                    </td>
                    <td className="px-6 py-4.5 text-[12px] text-muted-foreground/60">{sess.started}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={sessions.length}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
}
