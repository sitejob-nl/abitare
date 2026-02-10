import { useState } from "react";
import { Loader2, ChevronDown, Lock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";
import { getBlockedStatuses, type OrderGateContext } from "@/lib/orderGates";

type OrderStatus = Database["public"]["Enums"]["order_status"];

const statusConfig: Record<OrderStatus, { label: string; color: string }> = {
  nieuw: { label: "Nieuw", color: "bg-blue-100 text-blue-800" },
  bestel_klaar: { label: "Bestel klaar", color: "bg-yellow-100 text-yellow-800" },
  controle: { label: "Controle", color: "bg-orange-100 text-orange-800" },
  besteld: { label: "Besteld", color: "bg-purple-100 text-purple-800" },
  in_productie: { label: "In productie", color: "bg-indigo-100 text-indigo-800" },
  levering_gepland: { label: "Levering gepland", color: "bg-cyan-100 text-cyan-800" },
  geleverd: { label: "Geleverd", color: "bg-teal-100 text-teal-800" },
  montage_gepland: { label: "Montage gepland", color: "bg-emerald-100 text-emerald-800" },
  gemonteerd: { label: "Gemonteerd", color: "bg-green-100 text-green-800" },
  nazorg: { label: "Nazorg", color: "bg-amber-100 text-amber-800" },
  afgerond: { label: "Afgerond", color: "bg-gray-100 text-gray-800" },
};

interface OrderStatusSelectProps {
  status: OrderStatus;
  onStatusChange: (status: OrderStatus) => void;
  isUpdating?: boolean;
  size?: "sm" | "default";
  gateContext?: OrderGateContext;
}

export function OrderStatusSelect({
  status,
  onStatusChange,
  isUpdating,
  size = "default",
  gateContext,
}: OrderStatusSelectProps) {
  const currentConfig = statusConfig[status] || statusConfig.nieuw;

  const blockedStatuses = gateContext
    ? getBlockedStatuses(gateContext)
    : {};

  if (isUpdating) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Bijwerken...</span>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Select
        value={status}
        onValueChange={(value) => {
          const gate = blockedStatuses[value];
          if (gate && !gate.allowed) return;
          onStatusChange(value as OrderStatus);
        }}
      >
        <SelectTrigger
          className={cn(
            "w-auto border-0 font-medium",
            size === "sm" ? "h-7 text-xs px-2" : "h-9 text-sm px-3",
            currentConfig.color
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusConfig).map(([key, config]) => {
            const gate = blockedStatuses[key];
            const blocked = gate && !gate.allowed;

            return (
              <SelectItem
                key={key}
                value={key}
                disabled={blocked}
                className={cn(blocked && "opacity-50")}
              >
                <div className="flex items-center gap-1.5">
                  {blocked && <Lock className="h-3 w-3 text-destructive shrink-0" />}
                  <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", config.color)}>
                    {config.label}
                  </span>
                  {blocked && (
                    <span className="text-[10px] text-muted-foreground ml-1 max-w-[180px] truncate">
                      {gate.reason}
                    </span>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </TooltipProvider>
  );
}

export function getStatusLabel(status: OrderStatus): string {
  return statusConfig[status]?.label || status;
}

export function getStatusColor(status: OrderStatus): string {
  return statusConfig[status]?.color || "";
}
