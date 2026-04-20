"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ChevronDown, User } from "lucide-react";
import { logout } from "@/lib/api";
import { cn } from "@/lib/utils";

export function UserDropdown() {
  const router = useRouter();
  const [user, setUser] = useState("User");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = sessionStorage.getItem("auth_user");
    if (storedUser) {
      setUser(storedUser);
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed:", err);
    }
    sessionStorage.removeItem("auth_user");
    router.push("/login");
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 p-1.5 rounded-full transition-all duration-200 border border-transparent",
          isOpen ? "bg-muted border-border" : "hover:bg-muted/50"
        )}
      >
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm ring-2 ring-background ring-offset-1 ring-offset-muted">
          {user.charAt(0).toUpperCase()}
        </div>
        <div className="hidden sm:flex flex-col items-start pr-2">
          <span className="text-[13px] font-bold text-foreground leading-tight">{user}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Administrator</span>
        </div>
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl shadow-2xl z-[110] overflow-hidden animate-in zoom-in-95 slide-in-from-top-2 duration-200">
          <div className="p-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-red-500 hover:bg-red-500/10 rounded-lg transition-colors group"
            >
              <div className="p-1.5 rounded-md bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                <LogOut className="w-4 h-4" />
              </div>
              <span>Logout Session</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
