"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  className
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startIdx = (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-muted/20 border-t border-border", className)}>
      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
        Showing <span className="text-foreground">{startIdx}</span> - <span className="text-foreground">{endIdx}</span> of <span className="text-foreground">{totalItems}</span> items
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="w-8 h-8 flex items-center justify-center rounded border border-border bg-card text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 flex items-center justify-center rounded border border-border bg-card text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center px-4 h-8 bg-card border border-border rounded text-[12px] font-bold text-foreground">
          Page {currentPage} of {totalPages}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded border border-border bg-card text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded border border-border bg-card text-muted-foreground hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
