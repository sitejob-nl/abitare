import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TimeTrackerProps {
  startTime: string;
  endTime: string;
  onStartTimeChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
  disabled?: boolean;
}

export function TimeTracker({
  startTime,
  endTime,
  onStartTimeChange,
  onEndTimeChange,
  disabled,
}: TimeTrackerProps) {
  // Calculate total hours
  const calculateHours = () => {
    if (!startTime || !endTime) return null;

    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (endMinutes <= startMinutes) return null;

    const diffMinutes = endMinutes - startMinutes;
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  };

  const totalHours = calculateHours();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime">Starttijd</Label>
          <Input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => onStartTimeChange(e.target.value)}
            disabled={disabled}
            className="min-h-[44px]"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">Eindtijd</Label>
          <Input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => onEndTimeChange(e.target.value)}
            disabled={disabled}
            className="min-h-[44px]"
          />
        </div>
      </div>

      {totalHours && (
        <div className="rounded-lg bg-muted p-3 text-center">
          <span className="text-sm text-muted-foreground">Totaal: </span>
          <span className="font-semibold">{totalHours} uur</span>
        </div>
      )}
    </div>
  );
}
