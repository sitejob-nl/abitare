import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarView = "month" | "week" | "day";

interface CalendarViewToggleProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

export function CalendarViewToggle({ view, onViewChange }: CalendarViewToggleProps) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-muted/50 p-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("month")}
        className={cn(
          "h-7 px-3 text-xs font-medium",
          view === "month" && "bg-background shadow-sm"
        )}
      >
        Maand
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("week")}
        className={cn(
          "h-7 px-3 text-xs font-medium",
          view === "week" && "bg-background shadow-sm"
        )}
      >
        Week
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange("day")}
        className={cn(
          "h-7 px-3 text-xs font-medium",
          view === "day" && "bg-background shadow-sm"
        )}
      >
        Dag
      </Button>
    </div>
  );
}
