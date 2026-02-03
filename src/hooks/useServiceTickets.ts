import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ServiceTicket {
  id: string;
  ticket_number: number;
  division_id: string | null;
  order_id: string | null;
  customer_id: string | null;
  status: "nieuw" | "in_behandeling" | "wacht_op_klant" | "wacht_op_onderdelen" | "ingepland" | "afgerond" | "geannuleerd";
  priority: "laag" | "normaal" | "hoog" | "urgent";
  category: string;
  subject: string;
  description: string | null;
  submitter_name: string;
  submitter_email: string;
  submitter_phone: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  created_by: string | null;
  division?: { id: string; name: string } | null;
  order?: { id: string; order_number: number } | null;
  customer?: { id: string; first_name: string | null; last_name: string } | null;
  assignees?: Array<{
    id: string;
    user_id: string;
    profile: { id: string; full_name: string | null; email: string } | null;
  }>;
}

export function useServiceTickets() {
  const { activeDivisionId } = useAuth();

  return useQuery({
    queryKey: ["service-tickets", activeDivisionId],
    queryFn: async () => {
      let query = supabase
        .from("service_tickets")
        .select(`
          *,
          division:divisions(id, name),
          order:orders(id, order_number),
          customer:customers(id, first_name, last_name),
          assignees:service_ticket_assignees(
            id,
            user_id,
            profile:profiles!service_ticket_assignees_user_id_fkey(id, full_name, email)
          )
        `)
        .order("created_at", { ascending: false });

      if (activeDivisionId) {
        // Show tickets for selected division OR tickets without division (public submissions)
        query = query.or(`division_id.eq.${activeDivisionId},division_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ServiceTicket[];
    },
  });
}

export function useOpenTicketCount() {
  const { activeDivisionId } = useAuth();

  return useQuery({
    queryKey: ["service-tickets-count", activeDivisionId],
    queryFn: async () => {
      let query = supabase
        .from("service_tickets")
        .select("id", { count: "exact", head: true })
        .not("status", "in", '("afgerond","geannuleerd")');

      if (activeDivisionId) {
        query = query.or(`division_id.eq.${activeDivisionId},division_id.is.null`);
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    },
  });
}
