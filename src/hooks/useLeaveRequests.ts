import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  leave_type: string;
  status: string;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  division_id: string | null;
  start_time: string | null;
  end_time: string | null;
  is_partial_day: boolean;
  profile?: { full_name: string; email: string } | null;
  approver?: { full_name: string } | null;
}

const LEAVE_TYPES = [
  { value: "vakantie", label: "Vakantie" },
  { value: "ziekte", label: "Ziekte" },
  { value: "bijzonder", label: "Bijzonder verlof" },
  { value: "onbetaald", label: "Onbetaald verlof" },
] as const;

export { LEAVE_TYPES };

export function useLeaveRequests() {
  const { user, roles } = useAuth();
  const isManager = roles.includes("admin") || roles.includes("manager");

  return useQuery({
    queryKey: ["leave-requests", user?.id, isManager],
    queryFn: async () => {
      let query = supabase
        .from("leave_requests")
        .select("*")
        .order("start_date", { ascending: false });

      // Non-managers only see their own requests
      if (!isManager && user) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch profile names for all unique user_ids and approved_by
      const userIds = new Set<string>();
      (data || []).forEach((r) => {
        userIds.add(r.user_id);
        if (r.approved_by) userIds.add(r.approved_by);
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", Array.from(userIds));

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p])
      );

      return (data || []).map((r) => ({
        ...r,
        profile: profileMap.get(r.user_id) || null,
        approver: r.approved_by ? profileMap.get(r.approved_by) || null : null,
      })) as LeaveRequest[];
    },
  });
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient();
  const { user, activeDivisionId } = useAuth();

  return useMutation({
    mutationFn: async (req: {
      start_date: string;
      end_date: string;
      leave_type: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("leave_requests")
        .insert({
          user_id: user!.id,
          start_date: req.start_date,
          end_date: req.end_date,
          leave_type: req.leave_type,
          notes: req.notes || null,
          division_id: activeDivisionId || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
    },
  });
}

export function useUpdateLeaveStatus() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, any> = { status };
      if (status === "goedgekeurd" || status === "afgekeurd") {
        updates.approved_by = user!.id;
        updates.approved_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from("leave_requests")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
    },
  });
}

export function useDeleteLeaveRequest() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("leave_requests")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave-requests"] });
    },
  });
}
