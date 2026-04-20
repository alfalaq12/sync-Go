"use client";

import React from "react";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Breadcrumbs() {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter((v) => v.length > 0);

  return (
    <nav className="flex items-center space-x-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
      <Link 
        href="/dashboard" 
        className="hover:text-primary transition-colors flex items-center gap-1"
      >
        <Home className="w-3 h-3" />
        <span>SYNC-GO</span>
      </Link>
      
      {pathSegments.map((segment, index) => {
        const href = `/${pathSegments.slice(0, index + 1).join("/")}`;
        const isLast = index === pathSegments.length - 1;
        const label = segment.replace(/-/g, " ");

        // Skip "dashboard" since we have the Home icon
        if (segment === "dashboard") return null;

        return (
          <React.Fragment key={href}>
            <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
            <Link
              href={href}
              className={cn(
                "transition-colors hover:text-primary",
                isLast ? "text-foreground pointer-events-none" : ""
              )}
            >
              {label}
            </Link>
          </React.Fragment>
        );
      })}
    </nav>
  );
}
