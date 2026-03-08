import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Maps Supabase table names to the React Query keys that should be
 * invalidated when a row in that table changes.
 */
const TABLE_QUERY_MAP: Record<string, string[]> = {
  orders: ["orders", "order", "dashboard-stats", "recent-orders", "customer-orders", "installer-orders", "action-items"],
  order_lines: ["order-lines", "order-sections", "order"],
  order_status_history: ["order-status-history", "order"],
  order_notes: ["order-notes"],
  order_checklist_items: ["order-checklist"],
  order_documents: ["order-documents"],
  order_sections: ["order-sections"],
  service_tickets: ["service-tickets", "service-ticket", "dashboard-stats", "action-items", "service-budget"],
  service_ticket_notes: ["service-ticket-notes", "service-ticket"],
  quotes: ["quotes", "quote", "customer-quotes", "dashboard-stats"],
  quote_lines: ["quote-lines", "quote"],
  quote_sections: ["quote-sections", "quote"],
  customers: ["customers", "customer"],
  calendar_subscriptions: ["calendar-subscriptions"],
  user_mentions: ["user-mentions", "action-items", "notifications"],
  communication_log: ["communication-log", "customer-emails"],
  work_reports: ["work-reports", "work-report", "installer-orders"],
};

const SUBSCRIBED_TABLES = Object.keys(TABLE_QUERY_MAP);

export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel("realtime-sync");

    // Subscribe per table instead of schema-wide to reduce traffic
    SUBSCRIBED_TABLES.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          const queryKeys = TABLE_QUERY_MAP[payload.table];
          if (queryKeys) {
            queryKeys.forEach((key) => {
              queryClient.invalidateQueries({ queryKey: [key] });
            });
          }
        }
      );
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
