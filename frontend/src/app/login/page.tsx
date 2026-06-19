"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import api from "@/lib/api";
import { 
  Loader2, Eye, EyeOff, Lock, User, 
  ArrowRight, ShieldCheck, 
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
      const response = await api.post(`/login`, values);
      return response.data;
    },
    onSuccess: (data) => {
      // SECURITY FIX: Do not store sensitive tokens in sessionStorage (prevents XSS theft)
      // Token is now stored in an HttpOnly cookie managed by the backend.
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
    <div className="min-h-screen flex font-sans overflow-hidden mesh-gradient">
      
      {/* LEFT PANEL (60%) */}
      <div className="hidden lg:flex lg:w-[60%] bg-[#080f1e] relative flex-col justify-between p-20 selection:bg-primary/30 selection:text-white border-r border-border/40">
        
        {/* Technical Grid Overlay & Floating Lights */}
        <div className="absolute inset-0 cyber-grid opacity-75" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] left-[10%] w-[350px] h-[350px] rounded-full bg-primary/8 blur-[100px]" />
          <div className="absolute bottom-[10%] right-[10%] w-[450px] h-[450px] rounded-full bg-accent/6 blur-[120px]" />
        </div>

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-xl shadow-primary/20">
            <img src="/syncgo-logo.png" alt="Sync-Go" className="w-full h-full object-cover" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white uppercase font-mono">Sync-Go</span>
        </div>

        {/* Main Brand Content */}
        <div className="relative z-10 max-w-xl self-center mb-16">
          <h1 className="text-6xl font-black leading-[1.08] text-white tracking-tighter mb-8">
            High-Performance <br />
            <span className="bg-gradient-to-r from-primary via-[#818cf8] to-cyan-400 bg-clip-text text-transparent">Data Sync</span> <br />
            Infrastructure.
          </h1>
          <p className="text-[17px] text-muted-foreground/80 font-medium leading-relaxed max-w-lg">
            The next generation of enterprise data distribution. Reliable, scalable, and built for ultimate gRPC streaming speeds.
          </p>
        </div>

        {/* Features at Bottom */}
        <div className="relative z-10 grid grid-cols-3 gap-8 pt-10 border-t border-white/10">
          {[
            { 
              title: "Real-time Node Connectivity", 
              desc: "gRPC powered streaming protocol", 
              icon: Waves 
            },
            { 
              title: "Cross-DB Schema Mapping", 
              desc: "PostgreSQL, Oracle, and more", 
              icon: Database 
            },
            { 
              title: "Distributed ETL Processing", 
              desc: "Resilient concurrent pipelines", 
              icon: GitMerge 
            }
          ].map((feature, i) => (
            <div key={i} className="space-y-4 group p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl border border-primary/20 bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 duration-300">
                <feature.icon className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-[14px] font-bold text-white tracking-wide">{feature.title}</h3>
                <p className="text-[12px] text-muted-foreground/60 leading-snug">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL (40%) */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 relative">
        
        {/* Subtle grid in background of light panel */}
        <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />

        <div className="w-full max-w-[440px] bg-card/65 dark:bg-slate-900/60 backdrop-blur-2xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-border/80 p-10 relative z-10 hover:border-primary/25 transition-all duration-500">
          
          <div className="mb-8">
            <h2 className="text-3xl font-black text-foreground mb-2">Sign In</h2>
            <p className="text-[14px] text-muted-foreground/80 font-semibold leading-relaxed">
              Enter your credentials to access the master control panel.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black tracking-[0.1em] text-muted-foreground/60 uppercase font-mono">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/40" />
                <input
                  type="text"
                  placeholder="admin"
                  className="w-full h-12 bg-white/60 dark:bg-[#080f1e]/40 border border-border/70 rounded-2xl pl-11 pr-4 text-[14px] font-semibold text-foreground placeholder:text-muted-foreground/45 focus:border-primary/80 focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                  {...form.register("username")}
                />
              </div>
              {form.formState.errors.username && (
                <p className="text-xs text-red-500 mt-1 font-semibold">{form.formState.errors.username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black tracking-[0.1em] text-muted-foreground/60 uppercase font-mono">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/40" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full h-12 bg-white/60 dark:bg-[#080f1e]/40 border border-border/70 rounded-2xl pl-11 pr-11 text-[14px] font-semibold text-foreground placeholder:text-muted-foreground/45 focus:border-primary/80 focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-red-500 mt-1 font-semibold">{form.formState.errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full h-12 bg-primary hover:bg-primary/95 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 duration-300"
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
            
            <p className="text-[13px] text-center text-muted-foreground/75 leading-relaxed font-semibold">
              By signing in, you agree to our <br />
              <span className="text-primary font-bold hover:underline cursor-pointer">Terms of Service</span> and <span className="text-primary font-bold hover:underline cursor-pointer">Privacy Policy</span>.
            </p>
          </form>
        </div>

        <div className="absolute bottom-8 flex items-center gap-2.5 px-5 py-2.5 rounded-full border border-border/60 bg-white/40 dark:bg-[#080f1e]/40 backdrop-blur-md shadow-sm select-none animate-in fade-in duration-1000">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase font-mono">Secured by JWT Authentication Protocol</span>
        </div>
      </div>
    </div>
  );
}
