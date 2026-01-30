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
        "rounded-xl border border-border bg-card p-6 card-hover",
        delayClasses[animationDelay as keyof typeof delayClasses] || "animate-fade-in",
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl text-xl",
            iconClasses[iconVariant]
          )}
        >
          {icon}
        </div>
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold",
              trend.direction === "up" ? "trend-up" : "trend-down"
            )}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.value}
          </div>
        )}
      </div>
      <div className="text-[32px] font-bold leading-none tracking-tight text-foreground">
        {value}
      </div>
      <div className="mt-1 text-[13px] text-muted-foreground">{label}</div>
    </div>
  );
}
