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
  return useQuery({
    queryKey: ["leave-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select(`
          *,
          profile:profiles!leave_requests_user_id_fkey(full_name, email),
          approver:profiles!leave_requests_approved_by_fkey(full_name)
        `)
        .order("start_date", { ascending: false });

      if (error) {
        // Fallback without joins if FK names don't match
        const { data: fallback, error: err2 } = await supabase
          .from("leave_requests")
          .select("*")
          .order("start_date", { ascending: false });
        if (err2) throw err2;
        return (fallback || []) as LeaveRequest[];
      }
      return (data || []) as LeaveRequest[];
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
