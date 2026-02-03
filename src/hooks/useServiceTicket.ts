import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ServiceTicketDetail {
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
    assigned_at: string;
    profile: { id: string; full_name: string | null; email: string } | null;
  }>;
  notes?: Array<{
    id: string;
    content: string;
    note_type: string;
    created_at: string;
    created_by: string | null;
    profile: { id: string; full_name: string | null } | null;
  }>;
  attachments?: Array<{
    id: string;
    file_path: string;
    file_name: string;
    file_size: number | null;
    mime_type: string | null;
    created_at: string;
  }>;
  status_history?: Array<{
    id: string;
    from_status: string | null;
    to_status: string;
    notes: string | null;
    created_at: string;
    changed_by: string | null;
    profile: { id: string; full_name: string | null } | null;
  }>;
}

export function useServiceTicket(id: string | undefined) {
  return useQuery({
    queryKey: ["service-ticket", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("service_tickets")
        .select(`
          *,
          division:divisions(id, name),
          order:orders(id, order_number),
          customer:customers(id, first_name, last_name),
          assignees:service_ticket_assignees(
            id,
            user_id,
            assigned_at,
            profile:profiles!service_ticket_assignees_user_id_fkey(id, full_name, email)
          ),
          notes:service_ticket_notes(
            id,
            content,
            note_type,
            created_at,
            created_by,
            profile:profiles!service_ticket_notes_created_by_fkey(id, full_name)
          ),
          attachments:service_ticket_attachments(
            id,
            file_path,
            file_name,
            file_size,
            mime_type,
            created_at
          ),
          status_history:service_ticket_status_history(
            id,
            from_status,
            to_status,
            notes,
            created_at,
            changed_by,
            profile:profiles!service_ticket_status_history_changed_by_fkey(id, full_name)
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as ServiceTicketDetail | null;
    },
    enabled: !!id,
  });
}
