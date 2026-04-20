"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-lg border border-border animate-pulse bg-muted" />
    );
  }

  const modes = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ];

  return (
    <div className="flex items-center p-1 bg-muted/50 rounded-xl border border-border">
      {modes.map((mode) => (
        <button
          key={mode.value}
          onClick={() => setTheme(mode.value)}
          title={`Switch to ${mode.label} mode`}
          className={cn(
            "p-1.5 rounded-lg transition-all flex items-center justify-center relative",
            theme === mode.value 
              ? "bg-card shadow-sm text-primary ring-1 ring-border/20" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <mode.icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}
