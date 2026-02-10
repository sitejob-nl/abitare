import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type TicketStatus = "nieuw" | "in_behandeling" | "wacht_op_klant" | "wacht_op_onderdelen" | "klaar_voor_planning" | "ingepland" | "afgerond" | "geannuleerd";
type TicketPriority = "laag" | "normaal" | "hoog" | "urgent";

interface CreateTicketData {
  subject: string;
  description?: string;
  category: string;
  submitter_name: string;
  submitter_email: string;
  submitter_phone?: string;
  priority?: TicketPriority;
  division_id?: string;
  order_id?: string;
  customer_id?: string;
}

interface UpdateTicketData {
  id: string;
  subject?: string;
  description?: string;
  category?: string;
  priority?: TicketPriority;
  division_id?: string | null;
  order_id?: string | null;
  customer_id?: string | null;
  quote_id?: string | null;
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, activeDivisionId } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateTicketData) => {
      const { data: ticket, error } = await supabase
        .from("service_tickets")
        .insert({
          ...data,
          division_id: data.division_id || activeDivisionId,
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial status history entry
      if (user?.id) {
        await supabase.from("service_ticket_status_history").insert({
          ticket_id: ticket.id,
          to_status: "nieuw",
          changed_by: user.id,
        });
      }

      return ticket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["service-tickets-count"] });
      toast({ title: "Ticket aangemaakt" });
    },
    onError: (error) => {
      toast({
        title: "Fout bij aanmaken ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateTicketData) => {
      const { data: ticket, error } = await supabase
        .from("service_tickets")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return ticket;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["service-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["service-ticket", variables.id] });
      toast({ title: "Ticket bijgewerkt" });
    },
    onError: (error) => {
      toast({
        title: "Fout bij bijwerken ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      ticketId,
      fromStatus,
      toStatus,
      notes,
    }: {
      ticketId: string;
      fromStatus: TicketStatus | null;
      toStatus: TicketStatus;
      notes?: string;
    }) => {
      // Update ticket status
      const updateData: { status: TicketStatus; resolved_at?: string | null } = { status: toStatus };
      
      if (toStatus === "afgerond") {
        updateData.resolved_at = new Date().toISOString();
      } else if (fromStatus === "afgerond") {
        updateData.resolved_at = null;
      }

      const { error: updateError } = await supabase
        .from("service_tickets")
        .update(updateData)
        .eq("id", ticketId);

      if (updateError) throw updateError;

      // Create status history entry
      if (user?.id) {
        const { error: historyError } = await supabase
          .from("service_ticket_status_history")
          .insert({
            ticket_id: ticketId,
            from_status: fromStatus,
            to_status: toStatus,
            changed_by: user.id,
            notes,
          });

        if (historyError) throw historyError;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["service-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["service-ticket", variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["service-tickets-count"] });
      toast({ title: "Status bijgewerkt" });
    },
    onError: (error) => {
      toast({
        title: "Fout bij bijwerken status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useAssignUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ ticketId, userId }: { ticketId: string; userId: string }) => {
      const { error } = await supabase.from("service_ticket_assignees").insert({
        ticket_id: ticketId,
        user_id: userId,
        assigned_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["service-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["service-ticket", variables.ticketId] });
      toast({ title: "Medewerker toegewezen" });
    },
    onError: (error) => {
      toast({
        title: "Fout bij toewijzen",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUnassignUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ ticketId, userId }: { ticketId: string; userId: string }) => {
      const { error } = await supabase
        .from("service_ticket_assignees")
        .delete()
        .eq("ticket_id", ticketId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["service-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["service-ticket", variables.ticketId] });
      toast({ title: "Medewerker verwijderd" });
    },
    onError: (error) => {
      toast({
        title: "Fout bij verwijderen",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useAddTicketNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      ticketId,
      content,
      noteType = "intern",
    }: {
      ticketId: string;
      content: string;
      noteType?: string;
    }) => {
      const { error } = await supabase.from("service_ticket_notes").insert({
        ticket_id: ticketId,
        content,
        note_type: noteType,
        created_by: user?.id,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["service-ticket", variables.ticketId] });
      toast({ title: "Notitie toegevoegd" });
    },
    onError: (error) => {
      toast({
        title: "Fout bij toevoegen notitie",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useScheduleServiceTicket() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ ticketId, plannedDate, fromStatus }: { ticketId: string; plannedDate: string; fromStatus?: string }) => {
      const { error: updateError } = await supabase
        .from("service_tickets")
        .update({ status: "ingepland" as TicketStatus, planned_date: plannedDate })
        .eq("id", ticketId);

      if (updateError) throw updateError;

      // Create status history entry
      if (user?.id) {
        await supabase.from("service_ticket_status_history").insert({
          ticket_id: ticketId,
          from_status: (fromStatus || "klaar_voor_planning") as TicketStatus,
          to_status: "ingepland",
          changed_by: user.id,
          notes: `Ingepland op ${plannedDate}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["service-tickets-count"] });
      toast({ title: "Ticket ingepland" });
    },
    onError: (error) => {
      toast({
        title: "Fout bij inplannen ticket",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteTicketNote() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ noteId, ticketId }: { noteId: string; ticketId: string }) => {
      const { error } = await supabase
        .from("service_ticket_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;
      return ticketId;
    },
    onSuccess: (ticketId) => {
      queryClient.invalidateQueries({ queryKey: ["service-ticket", ticketId] });
      toast({ title: "Notitie verwijderd" });
    },
    onError: (error) => {
      toast({
        title: "Fout bij verwijderen notitie",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
