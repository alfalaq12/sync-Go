"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { 
  Loader2, Eye, EyeOff, Lock, User, 
  Activity, ArrowRight, ShieldCheck, 
  Database, GitMerge, Shield, CheckCircle2,
  Waves
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { cn } from "@/lib/utils";

const MySwal = withReactContent(Swal);

const formSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", password: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
      const response = await axios.post(`${API_BASE}/login`, values);
      return response.data;
    },
    onSuccess: (data) => {
      sessionStorage.setItem("auth_token", data.token);
      if (data.user) sessionStorage.setItem("auth_user", typeof data.user === 'string' ? data.user : JSON.stringify(data.user));
      MySwal.fire({
        title: "Authenticated",
        text: "Redirecting to management console...",
        icon: "success",
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1500,
        background: '#FFFFFF',
        color: '#0F172A',
        iconColor: '#10B981',
      }).then(() => {
        router.push("/dashboard");
      });
    },
    onError: () => {
      MySwal.fire({
        title: "Access Denied",
        text: "Invalid credentials provided.",
        icon: "error",
        background: '#FFFFFF',
        color: '#0F172A',
        confirmButtonColor: '#1E90FF',
      });
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    loginMutation.mutate(values);
  }

  return (
    <div className="min-h-screen flex font-sans overflow-hidden">
      
      {/* LEFT PANEL (60%) */}
      <div className="hidden lg:flex lg:w-[60%] bg-[#0F2444] relative flex-col justify-between p-16 selection:bg-[#1E90FF]/30 selection:text-white">
        
        {/* Decorative Grid Overlay */}
        <div className="absolute inset-0 dot-pattern opacity-20 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[#1E90FF]/5 to-transparent pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1E90FF] rounded-lg flex items-center justify-center text-white shadow-lg shadow-[#1E90FF]/20 animate-pulse">
            <Activity className="w-6 h-6 stroke-[2.5px]" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white uppercase letter-spacing-[0.05em]">Sync-Go</span>
        </div>

        {/* Main Brand Content */}
        <div className="relative z-10 max-w-xl self-center mb-12">
          <h1 className="text-6xl font-semibold leading-[1.1] text-white tracking-tight mb-6">
            High-Performance <br />
            <span className="text-[#1E90FF]">Data Synchronization</span> <br />
            Infrastructure.
          </h1>
          <p className="text-[17px] text-[#94B8D8] italic leading-relaxed">
            The next generation of enterprise data distribution. Reliable, scalable, and built for speed.
          </p>
        </div>

        {/* Features at Bottom */}
        <div className="relative z-10 grid grid-cols-3 gap-8 pt-12 border-t border-white/10">
          {[
            { 
              title: "Real-time Node Connectivity", 
              desc: "gRPC powered streaming protocol", 
              icon: Activity 
            },
            { 
              title: "Cross-Database Schema Mapping", 
              desc: "PostgreSQL, Oracle, and more", 
              icon: Database 
            },
            { 
              title: "Distributed Task Processing", 
              desc: "Resilient concurrent ETL pipelines", 
              icon: GitMerge 
            }
          ].map((feature, i) => (
            <div key={i} className="space-y-4 group">
              <div className="w-10 h-10 rounded-lg border border-[#1E90FF]/30 bg-[#1E90FF]/10 flex items-center justify-center text-[#1E90FF] group-hover:bg-[#1E90FF]/20 transition-colors">
                <feature.icon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-[14px] font-semibold text-white tracking-wide">{feature.title}</h3>
                <p className="text-[12px] text-[#94B8D8] leading-snug">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL (40%) */}
      <div className="flex-1 bg-[#F5F7FA] flex flex-col justify-center items-center p-8 relative">
        
        {/* Inner shadow for card depth effect */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(15,23,42,0.02)]" />

        <div className="w-full max-w-[420px] bg-white rounded-[16px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#E2E8F0] p-10 relative z-10">
          
          <div className="mb-8">
            <h2 className="text-[28px] font-semibold text-[#0F172A] mb-2">Sign In</h2>
            <p className="text-[14px] text-[#64748B] font-normal leading-relaxed">
              Enter your credentials to access the master control panel.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold tracking-[0.07em] text-[#64748B] uppercase">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#64748B]/50" />
                <input
                  type="text"
                  placeholder="admin"
                  className="w-full h-12 bg-white border border-[#E2E8F0] rounded-lg pl-11 pr-4 text-[14px] font-medium text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#1E90FF] focus:ring-4 focus:ring-[#1E90FF]/5 transition-all outline-none"
                  {...form.register("username")}
                />
              </div>
              {form.formState.errors.username && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold tracking-[0.07em] text-[#64748B] uppercase">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-[#64748B]/50" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full h-12 bg-white border border-[#E2E8F0] rounded-lg pl-11 pr-11 text-[14px] font-medium text-[#0F172A] placeholder:text-[#94A3B8] focus:border-[#1E90FF] focus:ring-4 focus:ring-[#1E90FF]/5 transition-all outline-none"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#64748B]/40 hover:text-[#0F172A] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-red-500 mt-1">{form.formState.errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full h-[46px] bg-[#1E90FF] hover:bg-[#1c86ee] text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 shadow-lg shadow-[#1E90FF]/20"
            >
              {loginMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>SIGN IN</span>
                  <ArrowRight className="w-4.5 h-4.5" />
                </>
              )}
            </button>
            
            <p className="text-[13px] text-center text-[#64748B] leading-relaxed">
              By signing in, you agree to our <br />
              <span className="text-[#1E90FF] font-medium hover:underline cursor-pointer">Terms of Service</span> and <span className="text-[#1E90FF] font-medium hover:underline cursor-pointer">Privacy Policy</span>.
            </p>
          </form>
        </div>

        <div className="absolute bottom-8 flex items-center gap-2 px-4 py-2 rounded-full border border-[#E2E8F0] bg-white/50 backdrop-blur-sm shadow-sm select-none">
          <Shield className="w-3.5 h-3.5 text-[#1E90FF]" />
          <span className="text-[11px] font-bold tracking-widest text-[#64748B] uppercase">Secured by JWT Authentication Protocol</span>
        </div>
      </div>
    </div>
  );
}
