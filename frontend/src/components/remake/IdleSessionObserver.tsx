"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { logout as apiLogout } from "@/lib/api";
import { ShieldAlert, AlertTriangle, Clock, LogOut, Check } from "lucide-react";

const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes
const WARNING_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiration

export default function IdleSessionObserver() {
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(WARNING_THRESHOLD / 1000);
  const router = useRouter();
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (err) {
      console.error("Inactivity logout failed:", err);
    }
    sessionStorage.removeItem("auth_user");
    router.push("/login");
  }, [router]);

  const startTimers = useCallback(() => {
    // Clear existing
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    
    setShowWarning(false);
    setTimeLeft(WARNING_THRESHOLD / 1000);

    // Set auto-logout timer
    timerRef.current = setTimeout(() => {
      logout();
    }, TIMEOUT_DURATION);

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      // Start countdown
      countdownRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
             if (countdownRef.current) clearInterval(countdownRef.current);
             return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, TIMEOUT_DURATION - WARNING_THRESHOLD);
  }, [logout]);

  const resetActivity = useCallback(() => {
    if (!showWarning) {
      startTimers();
    }
  }, [showWarning, startTimers]);

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart"];
    
    // Initial start
    startTimers();

    events.forEach((event) => {
      window.addEventListener(event, resetActivity);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetActivity);
      });
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [resetActivity, startTimers]);

  if (!showWarning) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#0F172A]/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[24px] shadow-2xl border border-[#E2E8F0] w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header Section */}
        <div className="p-8 text-center space-y-4">
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-2 relative">
             <div className="absolute inset-0 rounded-full bg-amber-200/20 animate-ping" />
             <AlertTriangle className="w-10 h-10 text-amber-500 relative z-10" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-[#0F172A]">Sesi Segera Berakhir</h2>
            <p className="text-[14px] text-[#64748B] leading-relaxed px-4">
              Anda tidak melakukan aktivitas selama beberapa waktu. Untuk alasan keamanan, sistem akan mengeluarkan Anda secara otomatis.
            </p>
          </div>

          {/* Timer Display */}
          <div className="bg-[#F8FAFC] rounded-2xl p-6 border border-[#E2E8F0] flex flex-col items-center">
             <div className="flex items-center gap-2 text-[#64748B] text-[12px] font-bold uppercase tracking-widest mb-1">
                <Clock className="w-4 h-4" /> Waktu Tersisa
             </div>
             <div className="text-4xl font-mono font-bold text-[#0F172A]">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
             </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-8 pt-0 flex flex-col gap-3">
           <button 
             onClick={() => {
                setShowWarning(false);
                startTimers();
             }}
             className="h-14 w-full rounded-xl bg-[#1E90FF] text-white font-bold text-[15px] hover:bg-[#1c86ee] transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#1E90FF]/20 active:scale-[0.98]"
           >
             <Check className="w-5 h-5" /> Saya Masih Disini
           </button>
           
           <button 
             onClick={logout}
             className="h-14 w-full rounded-xl bg-white border border-[#E2E8F0] text-[#64748B] font-bold text-[15px] hover:bg-[#F8FAFC] hover:text-red-500 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
           >
             <LogOut className="w-5 h-5" /> Logout Sekarang
           </button>
        </div>

        {/* Footer Security Note */}
        <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-8 py-4 flex items-center justify-center gap-2">
           <ShieldAlert className="w-3.5 h-3.5 text-[#64748B]/50" />
           <span className="text-[11px] font-bold text-[#64748B]/50 uppercase tracking-wider">Keamanan Sesi Terenkripsi Automatis</span>
        </div>
      </div>
    </div>
  );
}
