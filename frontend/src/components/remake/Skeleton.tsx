import { cn } from "@/lib/utils"

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted dark:bg-slate-800", className)}
      {...props}
    />
  )
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number, cols?: number }) {
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center space-x-4 px-6 pt-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-[100px]" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4 border-t border-border px-6 py-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton 
              key={j} 
              className={cn(
                "h-8", 
                j === 0 ? "w-8 rounded-full" : "w-full"
              )} 
            />
          ))}
        </div>
      ))}
    </div>
  )
}
