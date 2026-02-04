import { AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ConflictInfo } from "@/hooks/useCalendarConflicts";

interface ConflictBadgeProps {
  conflict: ConflictInfo;
}

export function ConflictBadge({ conflict }: ConflictBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
          <AlertTriangle className="h-3 w-3" />
          <span>Conflict</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <p className="font-medium">{conflict.installerName}</p>
        <p className="text-xs text-muted-foreground">
          {conflict.orderCount} montages gepland op deze dag
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
