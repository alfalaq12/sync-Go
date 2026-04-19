"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Search, Play, Square, RefreshCcw, Activity, Trash2, CheckCircle2, XCircle, AlertCircle, Clock, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchJobs, startJob, abortJob, resetJob, deleteJob } from "@/lib/api";
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
        title: 'Berhasil',
        text: 'Antrean job berhasil diperbarui.',
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
      await action();
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      MySwal.fire({ title: 'Berhasil', text: successMsg, icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, ...swalTheme });
    } catch (err: any) {
      MySwal.fire({ title: 'Gagal Dieksekusi', text: err?.response?.data?.error || 'Aksi ini gagal untuk dijalankan.', icon: 'error', ...swalTheme });
    }
  };

  const handleStartJob = () => {
    if (!selectedJobId) { MySwal.fire({ title: 'Pilih Job', text: 'Silakan klik salah satu pipeline untuk menjalankannya.', icon: 'warning', ...swalTheme }); return; }
    doAction(() => startJob(String(selectedJobId)), 'Proses eksekusi pipeline telah dimulai.');
  };

  const handleAbortJob = () => {
    if (!selectedJobId) { MySwal.fire({ title: 'Pilih Job', text: 'Silakan klik salah satu job untuk menghentikan paksa (abort).', icon: 'warning', ...swalTheme }); return; }
    MySwal.fire({
      title: 'Hentikan Eksekusi?', 
      text: 'Apakah Anda yakin ingin menghentikan paksa proses sinkronisasi ini (abort)?', 
      icon: 'warning', 
      showCancelButton: true, 
      confirmButtonText: 'Ya, Hentikan', 
      cancelButtonText: 'Batal',
      ...swalTheme,
      customClass: { 
        ...swalTheme.customClass, 
        confirmButton: 'premium-button bg-red-600 text-white px-6 py-2 ml-4' 
      }
    }).then((r) => { if (r.isConfirmed) doAction(() => abortJob(String(selectedJobId)), 'Pipeline berhasil dihentikan secara paksa.'); });
  };

  const handleResetJob = () => {
    if (!selectedJobId) { MySwal.fire({ title: 'Pilih Job', text: 'Silakan klik salah satu job untuk mereset statusnya.', icon: 'warning', ...swalTheme }); return; }
    doAction(() => resetJob(String(selectedJobId)), 'Status index pipeline berhasil di-reset kembali (pending).');
  };

  const handleDeleteJob = () => {
    if (!selectedJobId) { MySwal.fire({ title: 'Pilih Job', text: 'Silakan klik salah satu job untuk dihapus.', icon: 'warning', ...swalTheme }); return; }
    MySwal.fire({
      title: 'Hapus Riwayat Job?', 
      text: 'Aksi ini tidak dapat dibatalkan. Anda yakin ingin menghapus profil eksekusi job ini?', 
      icon: 'warning', 
      showCancelButton: true, 
      confirmButtonText: 'Ya, Hapus', 
      cancelButtonText: 'Batal',
      ...swalTheme,
      customClass: { 
        ...swalTheme.customClass, 
        confirmButton: 'premium-button bg-red-600 text-white px-6 py-2 ml-4' 
      }
    }).then((r) => { if (r.isConfirmed) doAction(() => deleteJob(String(selectedJobId)), 'Profil riwayat pipeline berhasil dihapus.'); });
  };

  // UI Helpers
  const getStatusConfig = (status: string) => {
    switch(status) {
      case 'running': return { icon: RefreshCcw, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', glow: '', animate: 'animate-spin' };
      case 'completed': return { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', glow: '', animate: '' };
      case 'failed': return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', glow: '', animate: '' };
      case 'pending': default: return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', glow: '', animate: '' };
    }
  }

  return (
    <div className="p-8 max-w-[1800px] mx-auto animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-1.5 rounded-lg bg-[#1E90FF]/10 text-[#1E90FF]">
              <Activity className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A]">Monitoring Antrean Job</h1>
          </div>
          <p className="text-[14px] font-medium text-[#64748B]">Pantau status eksekusi, progres, dan log sinkronisasi data secara real-time.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleRefresh} 
            className="h-10 px-4 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[13px] font-semibold text-[#64748B] transition-all flex items-center gap-2 active:scale-95"
          >
            <RefreshCcw className={`w-4 h-4 ${(isFetching || isManualRefreshing) ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button 
            onClick={() => router.push('/dashboard/jobs/new')} 
            className="h-10 px-5 rounded-lg bg-[#1E90FF] hover:bg-[#1c86ee] text-[13px] font-bold text-white shadow-lg shadow-[#1E90FF]/2 transition-all flex items-center gap-2 active:scale-[0.98]"
          >
            <Plus className="w-4.5 h-4.5" /> Buat Job Manual
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="enterprise-card bg-white border border-[#E2E8F0] shadow-xl overflow-hidden flex flex-col relative z-10">
        
        {/* Superior Toolbar */}
        <div className="p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            <input 
              type="text" 
              placeholder="Cari pipeline..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="w-full h-11 pl-11 pr-4 rounded-lg border border-[#E2E8F0] bg-white text-[13px] font-medium text-[#0F172A] focus:outline-none focus:border-[#1E90FF] focus:ring-4 focus:ring-[#1E90FF]/5 transition-all outline-none" 
            />
          </div>
          <div className="flex items-center gap-3 text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Polling Active
            </div>
            <div className="h-4 w-px bg-[#E2E8F0]" />
            <span>Total Streams: {total}</span>
          </div>
        </div>

        {/* Data Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold text-[#64748B] uppercase tracking-widest">
                <th className="px-6 py-4 w-[60px] text-center">Pilih</th>
                <th className="px-4 py-4 w-[140px]">ID Job</th>
                <th className="px-4 py-4">Identitas Pipeline</th>
                <th className="px-4 py-4 w-[140px]">Node Sumber</th>
                <th className="px-4 py-4 w-[140px]">Node Target</th>
                <th className="px-4 py-4 w-[240px] text-center">Progres Transfer</th>
                <th className="px-4 py-4 text-right">Throughput</th>
                <th className="px-4 py-4 text-right">Sinkronisasi Terakhir</th>
                <th className="px-6 py-4 w-[140px] text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {isLoading && (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center text-[#64748B]">
                    <RefreshCcw className="w-8 h-8 mx-auto animate-spin mb-4 text-[#1E90FF]" />
                    <p className="font-bold uppercase tracking-widest text-[11px]">Memuat status eksekusi job...</p>
                  </td>
                </tr>
              )}
              {!isLoading && filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-[#F1F5F9] flex items-center justify-center mb-5"><AlertCircle className="w-8 h-8 text-[#CBD5E1]" /></div>
                      <p className="text-[#0F172A] text-base font-bold">Belum ada history eksekusi pipeline.</p>
                      <p className="text-[#64748B] text-sm mt-1">Antrean job ini biasanya terbuat secara otomatis saat Anda membuat Endpoint Network baru.</p>
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
                    className={`transition-all cursor-pointer group ${isSelected ? 'bg-[#F0F7FF] hover:bg-[#F0F7FF]' : 'hover:bg-[#F8FAFC]'}`}
                  >
                    <td className="px-6 py-5 text-center">
                      <div className="flex items-center justify-center">
                        <div className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                            isSelected ? "border-[#1E90FF] bg-[#1E90FF]" : "border-[#CBD5E1] bg-white group-hover:border-[#94A3B8]"
                        )}>
                           {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 font-mono font-bold text-[#1E90FF] text-[12px]">{job.st_job_id || `#${job.id}`}</td>
                    <td className="px-4 py-5">
                      <div className="font-bold text-[#0F172A] text-[14px] group-hover:text-[#1E90FF] transition-colors">{job.name}</div>
                      <div className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mt-0.5">{job.job_type || "ETL"} OPERATION</div>
                    </td>
                    <td className="px-4 py-5 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                       {job.source_node_id ? `NODE-${job.source_node_id}` : "—"}
                    </td>
                    <td className="px-4 py-5 text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                       {job.target_node_id ? `NODE-${job.target_node_id}` : "—"}
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex flex-col gap-2.5 min-w-[220px]">
                        <div className="flex justify-between items-end px-0.5">
                           <span className="text-[9px] font-black text-[#1E90FF] uppercase tracking-widest">
                             {job.status === 'running' ? 'Active Transfer' : 'Channel Ready'}
                           </span>
                           <span className={`text-[11px] font-mono font-bold ${job.progress === 100 ? 'text-emerald-600' : 'text-[#0F172A]'}`}>
                             {job.progress || 0}%
                           </span>
                        </div>
                        <div className="w-full bg-[#F1F5F9] rounded-full h-2.5 overflow-hidden border border-[#E2E8F0] shadow-inner relative">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 relative z-10 ${
                              job.status === 'failed' ? 'bg-red-500' : 
                              job.status === 'running' ? 'bg-[#1E90FF] animate-pulse shadow-[0_0_10px_rgba(30,144,255,0.4)]' :
                              job.status === 'completed' ? 'bg-emerald-500' : 'bg-slate-300'
                            }`} 
                            style={{ width: `${job.progress || 0}%` }} 
                          />
                        </div>
                        <div className="flex items-center gap-2 text-[9px] font-bold text-[#94A3B8] uppercase tracking-tighter">
                          <Activity className={`w-3 h-3 ${job.status === 'running' ? 'text-[#1E90FF]' : ''}`} />
                          {job.status === 'running' ? `Streaming... ${job.records_processed || 0} rows` : 'Sync idle'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-right font-mono text-[13px] font-bold text-[#0F172A]">
                      {Intl.NumberFormat('id-ID').format(job.records_processed || 0)}
                    </td>
                    <td className="px-4 py-5 text-[#94A3B8] font-bold text-[11px] uppercase tracking-tight text-right">
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
        <div className="p-5 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between bg-[#F8FAFC]/30">
          <div className="flex items-center gap-3">
             <button 
                onClick={handleStartJob}
                disabled={!selectedJobId} 
                className="h-10 px-5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#64748B] hover:text-[#1E90FF] hover:border-[#1E90FF]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Play className="w-4 h-4 fill-current" /> Jalankan
             </button>
             <button 
                onClick={handleAbortJob}
                disabled={!selectedJobId} 
                className="h-10 px-5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#64748B] hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Square className="w-4 h-4 fill-current" /> Hentikan
             </button>
             <div className="w-px h-6 bg-[#E2E8F0] mx-1" />
             <button 
                onClick={handleResetJob}
                disabled={!selectedJobId} 
                className="h-10 px-5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#64748B] hover:text-[#1E90FF] hover:border-[#1E90FF]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <RefreshCcw className="w-4 h-4" /> Reset State
             </button>
             <button 
                onClick={handleDeleteJob}
                disabled={!selectedJobId} 
                className="h-10 px-5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] font-bold text-[#64748B] hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
             >
               <Trash2 className="w-4 h-4" /> Hapus Job
             </button>
          </div>
          
          <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest hidden sm:block">
            {selectedJobId ? `Pipeline Terpilih (ID: ${selectedJobId})` : 'Pilih antrean job untuk eksekusi'}
          </div>
        </div>

      </div>
    </div>
  );
}
