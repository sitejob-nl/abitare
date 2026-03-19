import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useProfiles } from "@/hooks/useUsers";
import {
  useWorkSchedules,
  useUpsertWorkSchedule,
  DAY_LABELS,
  DEFAULT_SCHEDULE,
  type WorkScheduleDay,
} from "@/hooks/useWorkSchedules";

export function WorkScheduleEditor() {
  const { data: profiles = [] } = useProfiles();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const { data: saved = [], isLoading } = useWorkSchedules(selectedUserId || undefined);
  const upsert = useUpsertWorkSchedule();

  const [days, setDays] = useState<WorkScheduleDay[]>(DEFAULT_SCHEDULE);

  // Sync saved data into local state
  useEffect(() => {
    if (saved.length > 0) {
      setDays(
        DEFAULT_SCHEDULE.map((def) => {
          const existing = saved.find((s) => s.day_of_week === def.day_of_week);
          if (existing) {
            return {
              day_of_week: existing.day_of_week,
              start_time: existing.start_time?.slice(0, 5) || def.start_time,
              end_time: existing.end_time?.slice(0, 5) || def.end_time,
              is_working_day: existing.is_working_day,
              break_minutes: existing.break_minutes,
            };
          }
          return def;
        })
      );
    } else if (selectedUserId) {
      setDays(DEFAULT_SCHEDULE);
    }
  }, [saved, selectedUserId]);

  const updateDay = (idx: number, patch: Partial<WorkScheduleDay>) => {
    setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    try {
      await upsert.mutateAsync({ userId: selectedUserId, days });
      toast({ title: "Werkrooster opgeslagen" });
    } catch (e: any) {
      toast({ title: "Fout", description: e.message, variant: "destructive" });
    }
  };

  const activeProfiles = profiles.filter((p) => p.is_active !== false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Werkroosters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-xs">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecteer medewerker" />
            </SelectTrigger>
            <SelectContent>
              {activeProfiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name || p.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedUserId && isLoading && (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {selectedUserId && !isLoading && (
          <>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Dag</TableHead>
                    <TableHead className="w-[60px]">Werkdag</TableHead>
                    <TableHead className="w-[100px]">Start</TableHead>
                    <TableHead className="w-[100px]">Einde</TableHead>
                    <TableHead className="w-[80px]">Pauze (min)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {days.map((day, idx) => (
                    <TableRow key={day.day_of_week}>
                      <TableCell className="font-medium">
                        {DAY_LABELS[day.day_of_week]}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={day.is_working_day}
                          onCheckedChange={(v) => updateDay(idx, { is_working_day: v })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={day.start_time}
                          onChange={(e) => updateDay(idx, { start_time: e.target.value })}
                          disabled={!day.is_working_day}
                          className="w-[100px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="time"
                          value={day.end_time}
                          onChange={(e) => updateDay(idx, { end_time: e.target.value })}
                          disabled={!day.is_working_day}
                          className="w-[100px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          max={120}
                          value={day.break_minutes}
                          onChange={(e) =>
                            updateDay(idx, { break_minutes: parseInt(e.target.value) || 0 })
                          }
                          disabled={!day.is_working_day}
                          className="w-[70px]"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button onClick={handleSave} disabled={upsert.isPending} className="gap-2">
              {upsert.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Opslaan
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
