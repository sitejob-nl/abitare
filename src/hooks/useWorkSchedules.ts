import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WorkScheduleDay {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working_day: boolean;
  break_minutes: number;
}

export interface WorkScheduleRow extends WorkScheduleDay {
  id: string;
  user_id: string;
  division_id: string | null;
  created_at: string;
  updated_at: string;
}

const DAY_LABELS = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];
export { DAY_LABELS };

const DEFAULT_SCHEDULE: WorkScheduleDay[] = Array.from({ length: 7 }, (_, i) => ({
  day_of_week: i,
  start_time: "08:00",
  end_time: "17:00",
  is_working_day: i < 5,
  break_minutes: 30,
}));
export { DEFAULT_SCHEDULE };

export function useWorkSchedules(userId?: string) {
  return useQuery({
    queryKey: ["work-schedules", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_schedules")
        .select("*")
        .eq("user_id", userId!)
        .order("day_of_week");

      if (error) throw error;
      return (data || []) as WorkScheduleRow[];
    },
  });
}

export function useUpsertWorkSchedule() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      days,
      divisionId,
    }: {
      userId: string;
      days: WorkScheduleDay[];
      divisionId?: string | null;
    }) => {
      // Delete existing rows then insert fresh set
      const { error: delErr } = await supabase
        .from("work_schedules")
        .delete()
        .eq("user_id", userId);
      if (delErr) throw delErr;

      const rows = days.map((d) => ({
        user_id: userId,
        day_of_week: d.day_of_week,
        start_time: d.start_time,
        end_time: d.end_time,
        is_working_day: d.is_working_day,
        break_minutes: d.break_minutes,
        division_id: divisionId || null,
      }));

      const { error } = await supabase.from("work_schedules").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["work-schedules", vars.userId] });
    },
  });
}
