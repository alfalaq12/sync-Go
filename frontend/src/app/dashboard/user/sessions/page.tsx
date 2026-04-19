"use client";

import { useState } from "react";
import { Activity, RefreshCw, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSessions } from "@/lib/api";
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

export default function SessionsPage() {
  const queryClient = useQueryClient();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

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

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
             <div className="p-1.5 rounded-lg bg-[#1E90FF]/10 text-[#1E90FF]">
                <Activity className="w-5 h-5" />
             </div>
             <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A]">Active Sessions</h1>
          </div>
          <p className="text-[14px] font-medium text-[#64748B]">Monitor user connectivity and system access tokens.</p>
        </div>
        <button 
          onClick={handleRefresh}
          className="h-10 px-5 rounded-lg bg-white border border-[#E2E8F0] text-[13px] font-bold text-[#64748B] hover:text-[#1E90FF] transition-all flex items-center gap-2 active:scale-[0.98]"
        >
          <RefreshCw className={`w-4 h-4 ${(isFetching || isManualRefreshing) ? 'animate-spin' : ''}`} /> Refresh Logs
        </button>
      </div>

      <div className="enterprise-card flex flex-col bg-white border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">Session ID</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">User IP</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">Client Agent</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-bold text-[#64748B] text-[11px] uppercase tracking-wider">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
                {isLoading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[#64748B]">
                      <Loader2 className="w-6 h-6 mx-auto animate-spin mb-3 text-[#1E90FF]" />
                      <p className="font-medium">Loading session data...</p>
                    </td>
                  </tr>
                )}
                {!isLoading && sessions.map((sess: any) => (
                  <tr key={sess.id} className="hover:bg-[#F8FAFC] transition-all">
                    <td className="px-6 py-4.5 font-mono text-[12px] text-[#0F172A] font-medium">{sess.id}</td>
                    <td className="px-6 py-4.5 text-[#64748B]">{sess.ip}</td>
                    <td className="px-6 py-4.5 text-[#64748B] max-w-[300px] truncate" title={sess.agent}>{sess.agent}</td>
                    <td className="px-6 py-4.5">
                      <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold bg-green-100 text-green-700 uppercase">{sess.status}</span>
                    </td>
                    <td className="px-6 py-4.5 text-[12px] text-[#64748B]">{sess.started}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
