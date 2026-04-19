"use client";

import Link from "next/link";
import { ArrowLeft, Rocket, Construction, Layers } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#1E90FF]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-[#1E90FF]/10 rounded-full blur-[120px]" />
      </div>

      {/* Main Content Card */}
      <div className="relative z-10 w-full max-w-2xl text-center space-y-8 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Animated Icon Space */}
        <div className="relative flex justify-center mb-10">
           <div className="absolute inset-0 bg-[#1E90FF]/10 rounded-full blur-2xl animate-pulse scale-150" />
           <div className="relative p-6 bg-white border border-[#E2E8F0] rounded-[24px] shadow-2xl shadow-[#1E90FF]/10 flex items-center justify-center group hover:scale-105 transition-transform duration-500">
              <Rocket className="w-16 h-16 text-[#1E90FF] animate-bounce duration-[2000ms]" />
              <div className="absolute -top-2 -right-2 p-2 bg-[#1E90FF] text-white rounded-lg shadow-lg">
                 <Construction className="w-4 h-4" />
              </div>
           </div>
        </div>

        {/* Text Content */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E90FF]/10 border border-[#1E90FF]/20">
             <span className="w-2 h-2 rounded-full bg-[#1E90FF] animate-ping" />
             <span className="text-[11px] font-bold text-[#1E90FF] uppercase tracking-[0.15em]">System Status: Under Construction</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter text-[#0F172A]">
            Feature <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1E90FF] to-[#0ea5e9]">Coming Soon</span>
          </h1>

          <p className="text-lg text-[#64748B] max-w-lg mx-auto leading-relaxed">
            The page you are looking for is currently being engineered by our team. 
            We're building something massive here to automate your sync jobs.
          </p>
        </div>

        {/* Progress Mockup */}
        <div className="max-w-md mx-auto p-1 bg-[#E2E8F0] rounded-full overflow-hidden">
           <div className="h-1.5 bg-gradient-to-r from-[#1E90FF] to-[#0ea5e9] w-[85%] rounded-full animate-progress-glow" />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link 
            href="/dashboard"
            className="h-14 px-8 rounded-2xl bg-[#0F172A] text-white font-bold text-[15px] hover:bg-[#1e293b] shadow-xl shadow-[#0F172A]/10 transition-all flex items-center gap-3 group active:scale-[0.98]"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
          
          <button 
            disabled
            className="h-14 px-8 rounded-2xl border border-[#E2E8F0] bg-white text-[#64748B] font-bold text-[15px] flex items-center gap-3 transition-all opacity-60"
          >
            <Layers className="w-5 h-5" />
            V. 2.0.4 Pre-release
          </button>
        </div>
      </div>

      {/* Version Tag */}
      <div className="absolute bottom-10 left-10 text-[11px] font-bold text-[#94A3B8] uppercase tracking-widest hidden sm:block">
        SYNC-GO ENTERPRISE // CORE_ENGINE
      </div>

      <style jsx global>{`
        @keyframes progress-glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-progress-glow {
          animation: progress-glow 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
