import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  icon: ReactNode;
  iconVariant?: "primary" | "accent" | "success" | "warning";
  value: string;
  label: string;
  trend?: {
    value: string;
    direction: "up" | "down";
  };
  className?: string;
  animationDelay?: number;
}

export function StatCard({
  icon,
  iconVariant = "primary",
  value,
  label,
  trend,
  className,
  animationDelay = 0,
}: StatCardProps) {
  const iconClasses = {
    primary: "stat-icon-primary",
    accent: "stat-icon-accent",
    success: "stat-icon-success",
    warning: "stat-icon-warning",
  };

  const delayClasses = {
    0: "animate-fade-in",
    1: "animate-fade-in-delay-1",
    2: "animate-fade-in-delay-2",
    3: "animate-fade-in-delay-3",
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-4 sm:p-6 card-hover",
        delayClasses[animationDelay as keyof typeof delayClasses] || "animate-fade-in",
        className
      )}
    >
      <div className="mb-2 sm:mb-4 flex items-start justify-between">
        <div
          className={cn(
            "flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl text-lg sm:text-xl",
            iconClasses[iconVariant]
          )}
        >
          {icon}
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 rounded-md px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold",
              trend.direction === "up" ? "trend-up" : "trend-down"
            )}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            ) : (
              <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            )}
            {trend.value}
          </div>
        )}
      </div>
      <div className="text-xl sm:text-[32px] font-bold leading-none tracking-tight text-foreground">
        {value}
      </div>
      <div className="mt-1 text-[11px] sm:text-[13px] text-muted-foreground line-clamp-1">{label}</div>
    </div>
  );
}
