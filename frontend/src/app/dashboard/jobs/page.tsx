"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search, Play, Square, RefreshCcw, Activity, Trash2, CheckCircle2, XCircle, AlertCircle, Clock, Plus, Timer } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJobs, startJob, abortJob, resetJob, deleteJob } from "@/lib/api";
import { TableSkeleton } from "@/components/remake/Skeleton";
import { Breadcrumbs } from "@/components/remake/Breadcrumbs";
import { Pagination } from "@/components/remake/Pagination";
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

export default function JobsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const { data: jobsData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
    refetchInterval: 3000,
  });

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["jobs"] });
    await refetch();
    setTimeout(() => {
      setIsManualRefreshing(false);
      MySwal.fire({
        title: 'Success',
        text: 'Job queue updated successfully.',
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
        ...swalTheme
      });
    }, 600);
  };

  const jobs = jobsData?.data || [];
  const total = jobsData?.total || 0;

  const filteredJobs = jobs.filter((job: any) =>
    (job.name && job.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (job.st_job_id && job.st_job_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (job.id && String(job.id).includes(searchTerm))
  );

  const doAction = async (action: () => Promise<any>, successMsg: string) => {
    try {
      MySwal.fire({ title: 'Success', text: successMsg, icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, ...swalTheme });
    } catch (err: any) {
      MySwal.fire({ title: 'Execution Failed', text: err?.response?.data?.error || 'This action failed to execute.', icon: 'error', ...swalTheme });
    }
  };

  const handleStartJob = () => {
    if (!selectedJobId) { MySwal.fire({ title: 'Select Job', text: 'Please click on a pipeline to run it.', icon: 'warning', ...swalTheme }); return; }
    doAction(() => startJob(String(selectedJobId)), 'Pipeline execution process has started.');
  };

  const handleAbortJob = () => {
    if (!selectedJobId) { MySwal.fire({ title: 'Select Job', text: 'Please click on a job to forcefully abort it.', icon: 'warning', ...swalTheme }); return; }
    MySwal.fire({
      title: 'Abort Execution?', 
      text: 'Are you sure you want to forcefully abort this synchronization process?', 
      icon: 'warning', 
      showCancelButton: true, 
      confirmButtonText: 'Yes, Abort', 
      cancelButtonText: 'Cancel',
      ...swalTheme,
      customClass: { 
        ...swalTheme.customClass, 
        confirmButton: 'premium-button bg-red-600 text-white px-6 py-2 ml-4' 
      }
    }).then((r) => { if (r.isConfirmed) doAction(() => abortJob(String(selectedJobId)), 'Pipeline aborted successfully.'); });
  };

  const handleResetJob = () => {
    if (!selectedJobId) { MySwal.fire({ title: 'Select Job', text: 'Please click on a job to reset its status.', icon: 'warning', ...swalTheme }); return; }
    doAction(() => resetJob(String(selectedJobId)), 'Pipeline index status reset successfully (pending).');
  };

  const handleDeleteJob = () => {
    if (!selectedJobId) { MySwal.fire({ title: 'Select Job', text: 'Please click on a job to delete it.', icon: 'warning', ...swalTheme }); return; }
    MySwal.fire({
      title: 'Delete Job History?', 
      text: 'This action cannot be undone. Are you sure you want to delete this job execution profile?', 
      icon: 'warning', 
      showCancelButton: true, 
      confirmButtonText: 'Yes, Delete', 
      cancelButtonText: 'Cancel',
      ...swalTheme,
      customClass: { 
        ...swalTheme.customClass, 
        confirmButton: 'premium-button bg-red-600 text-white px-6 py-2 ml-4' 
      }
    }).then((r) => { if (r.isConfirmed) doAction(() => deleteJob(String(selectedJobId)), 'Pipeline history profile deleted successfully.'); });
  };

  // UI Helpers
  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'running': return { icon: RefreshCcw, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', glow: '', animate: 'animate-spin' };
      case 'completed': return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', glow: '', animate: '' };
      case 'failed': return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', glow: '', animate: '' };
      case 'pending': default: return { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', glow: '', animate: '' };
    }
  }

  const formatDuration = (seconds: number | null | undefined): string => {
    if (seconds == null || seconds < 0) return "\u2014";
    const totalSec = Math.floor(seconds);
    if (totalSec < 60) return `${totalSec}d`;
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hours > 0) return `${hours}j ${minutes}m ${secs}d`;
    return `${minutes}m ${secs}d`;
  };

  return (
    <div className="p-8 max-w-[1800px] mx-auto animate-in fade-in duration-500">
      <Breadcrumbs />
      
      {/* Header Section */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-lg bg-[#1E90FF]/10 text-[#1E90FF]">
              <Activity className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Job Queue Monitoring</h1>
          </div>
          <p className="text-[14px] font-medium text-muted-foreground">Monitor execution status, progress, and data synchronization logs in real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh} 
            className="h-10 px-4 rounded-lg bg-card border border-border hover:bg-muted text-[13px] font-semibold text-muted-foreground transition-all flex items-center gap-2 active:scale-95"
          >
            <RefreshCcw className={`w-4 h-4 ${(isFetching || isManualRefreshing) ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button 
            onClick={() => router.push('/dashboard/jobs/new')} 
            className="h-10 px-5 rounded-lg bg-[#1E90FF] hover:bg-[#1c86ee] text-[13px] font-bold text-white shadow-lg shadow-[#1E90FF]/2 transition-all flex items-center gap-2 active:scale-[0.98]"
          >
            <Plus className="w-4.5 h-4.5" /> Create Manual Job
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="enterprise-card border border-border shadow-xl overflow-hidden flex flex-col relative z-10">
        
        {/* Superior Toolbar */}
        <div className="p-5 border-b border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input 
              type="text" 
              placeholder="Search pipeline..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full h-11 pl-11 pr-4 rounded-lg border border-border bg-card text-[13px] font-medium text-foreground focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none" 
            />
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Polling Active
            </div>
            <div className="h-4 w-px bg-border" />
            <span>Total Streams: {total}</span>
          </div>
        </div>

        {/* Data Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-muted/30 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <th className="px-6 py-4 w-[60px] text-center">Select</th>
                <th className="px-4 py-4 w-[140px]">Job ID</th>
                <th className="px-4 py-4">Pipeline Identity</th>
                <th className="px-4 py-4 w-[140px]">Source Node</th>
                <th className="px-4 py-4 w-[140px]">Target Node</th>
                <th className="px-4 py-4 w-[240px] text-center">Transfer Progress</th>
                <th className="px-4 py-4 text-right">Throughput</th>
                <th className="px-4 py-4 text-center w-[130px]">Duration</th>
                <th className="px-4 py-4 text-right">Last Sync</th>
                <th className="px-6 py-4 w-[140px] text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && (
                <tr>
                  <td colSpan={10} className="px-0 py-0 text-center">
                    <TableSkeleton rows={10} cols={10} />
                  </td>
                </tr>
              )}
              {!isLoading && filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-5"><AlertCircle className="w-8 h-8 text-muted-foreground/30" /></div>
                      <p className="text-foreground text-base font-bold">No pipeline execution history yet.</p>
                      <p className="text-muted-foreground text-sm mt-1">This job queue is usually created automatically when you create a new Network Endpoint.</p>
                    </div>
                  </td>
                </tr>
              )}
              {filteredJobs.map((job: any) => {
                const conf = getStatusConfig(job.status);
                const isSelected = selectedJobId === job.id;
                return (
                  <tr 
                    key={job.id} 
                    onClick={() => setSelectedJobId(isSelected ? null : job.id)} 
                    className={cn(
                      "transition-all cursor-pointer group",
                      isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"
                    )}
                  >
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center">
                        <div className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                            isSelected ? "border-primary bg-primary" : "border-border bg-card group-hover:border-muted-foreground"
                        )}>
                           {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground shadow-sm" />}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 font-mono font-bold text-primary text-[12px]">{job.st_job_id || `#${job.id}`}</td>
                    <td className="px-4 py-5">
                      <div className="font-bold text-foreground text-[14px] group-hover:text-primary transition-colors">{job.name}</div>
                      <div className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest mt-0.5">{job.job_type || "ETL"} OPERATION</div>
                    </td>
                    <td className="px-4 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                       {job.source_node_id ? `NODE-${job.source_node_id}` : "—"}
                    </td>
                    <td className="px-4 py-5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                       {job.target_node_id ? `NODE-${job.target_node_id}` : "—"}
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex flex-col gap-2.5 min-w-[220px]">
                        <div className="flex justify-between items-end px-0.5">
                           <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                             {job.status === 'running' ? 'Active Transfer' : 'Channel Ready'}
                           </span>
                           <span className={cn(
                             "text-[11px] font-mono font-bold",
                             job.progress === 100 ? "text-emerald-500" : "text-foreground"
                           )}>
                             {job.progress || 0}%
                           </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden border border-border shadow-inner relative">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-1000 relative z-10",
                              job.status === 'failed' ? "bg-red-500" : 
                              job.status === 'running' ? "bg-primary animate-pulse shadow-[0_0_10px_rgba(30,144,255,0.4)]" :
                              job.status === 'completed' ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                            )} 
                            style={{ width: `${job.progress || 0}%` }} 
                          />
                        </div>
                        <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                          <Activity className={cn("w-3 h-3", job.status === 'running' && "text-primary")} />
                          {job.status === 'running' ? `Streaming... ${job.records_processed || 0} rows` : 'Sync idle'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-right font-mono text-[13px] font-bold text-foreground">
                      {Intl.NumberFormat('id-ID').format(job.records_processed || 0)}
                    </td>
                    <td className="px-4 py-5 text-center">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[12px] font-bold tracking-tight",
                        job.status === 'running' 
                          ? "bg-blue-500/10 text-blue-500 border border-blue-500/20 animate-pulse" 
                          : job.status === 'completed'
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : job.status === 'failed'
                          ? "bg-red-500/10 text-red-500 border border-red-500/20"
                          : "text-muted-foreground/60"
                      )}>
                        <Timer className="w-3 h-3" />
                        {formatDuration(job.duration_seconds)}
                      </div>
                    </td>
                    <td className="px-4 py-5 text-muted-foreground/60 font-bold text-[11px] uppercase tracking-tight text-right">
                      {job.started_at ? format(new Date(job.started_at), 'dd/MM/yyyy HH:mm:ss') : "Offline"}
                    </td>
                    <td className="px-6 py-5 flex justify-center">
                      <div className={`px-4 py-1.5 rounded-full flex items-center gap-2 border ${conf.bg} ${conf.color} ${conf.border} shadow-sm uppercase`}>
                        <conf.icon className={`w-3.5 h-3.5 ${conf.animate}`} />
                        <span className="text-[9px] font-black tracking-widest">{job.status}</span>
                      </div>
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
                onClick={handleStartJob}
                disabled={!selectedJobId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Play className="w-4 h-4 fill-current" /> Run
             </button>
             <button 
                onClick={handleAbortJob}
                disabled={!selectedJobId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Square className="w-4 h-4 fill-current" /> Abort
             </button>
             <div className="w-px h-6 bg-border mx-1" />
             <button 
                onClick={handleResetJob}
                disabled={!selectedJobId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-primary hover:border-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <RefreshCcw className="w-4 h-4" /> Reset State
             </button>
             <button 
                onClick={handleDeleteJob}
                disabled={!selectedJobId} 
                className="h-10 px-5 rounded-lg border border-border bg-card text-[12px] font-bold text-muted-foreground hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Trash2 className="w-4 h-4" /> Delete Job
             </button>
          </div>
          
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest hidden sm:block">
            {selectedJobId ? `Selected Pipeline (ID: ${selectedJobId})` : 'Select a job queue for execution'}
          </div>
        </div>

        {/* Pagination */}
        <Pagination 
          currentPage={1}
          totalPages={Math.ceil(total / 10) || 1}
          onPageChange={() => {}}
          totalItems={total}
          pageSize={10}
        />

      </div>
    </div>
  );
}
