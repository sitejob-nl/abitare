import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

export interface ActionItem {
  id: string;
  title: string;
  meta: string[];
  type: string;
  priority: "high" | "medium" | "low";
  sourceType: "quote" | "order" | "customer";
  sourceId: string;
}

export function useActionItems(limit = 10) {
  return useQuery({
    queryKey: ["action-items", limit],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const actions: ActionItem[] = [];

      // 1. Expired quotes (high priority)
      const { data: expiredQuotes } = await supabase
        .from("quotes")
        .select(`
          id, quote_number, valid_until,
          customer:customers(first_name, last_name, company_name)
        `)
        .eq("status", "verstuurd")
        .lt("valid_until", today)
        .order("valid_until", { ascending: true })
        .limit(5);

      if (expiredQuotes) {
        expiredQuotes.forEach((quote) => {
          const customer = quote.customer as { first_name?: string; last_name?: string; company_name?: string } | null;
          const customerName = customer?.company_name || 
            [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Onbekend";
          const daysExpired = quote.valid_until 
            ? differenceInDays(new Date(), new Date(quote.valid_until))
            : 0;

          actions.push({
            id: `quote-${quote.id}`,
            title: `Offerte opvolgen - ${customerName}`,
            meta: ["📞 Terugbellen", `Verlopen: ${daysExpired} dagen`],
            type: "Offerte",
            priority: daysExpired > 7 ? "high" : "medium",
            sourceType: "quote",
            sourceId: quote.id,
          });
        });
      }

      // 2. Orders needing attention (status = nieuw or controle)
      const { data: pendingOrders } = await supabase
        .from("orders")
        .select(`
          id, order_number, status,
          customer:customers(first_name, last_name, company_name)
        `)
        .in("status", ["nieuw", "controle"])
        .order("created_at", { ascending: true })
        .limit(5);

      if (pendingOrders) {
        pendingOrders.forEach((order) => {
          const customer = order.customer as { first_name?: string; last_name?: string; company_name?: string } | null;
          const customerName = customer?.company_name || 
            [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Onbekend";

          const actionTitle = order.status === "nieuw" 
            ? "Nieuwe order verwerken"
            : "Order controleren";

          actions.push({
            id: `order-${order.id}`,
            title: `${actionTitle} - ${customerName}`,
            meta: [`Order #${order.order_number}`, customerName],
            type: order.status === "nieuw" ? "Order" : "Controle",
            priority: order.status === "controle" ? "high" : "medium",
            sourceType: "order",
            sourceId: order.id,
          });
        });
      }

      // 3. Orders awaiting confirmation (bestel_klaar)
      const { data: readyOrders } = await supabase
        .from("orders")
        .select(`
          id, order_number,
          customer:customers(first_name, last_name, company_name)
        `)
        .eq("status", "bestel_klaar")
        .order("created_at", { ascending: true })
        .limit(3);

      if (readyOrders) {
        readyOrders.forEach((order) => {
          const customer = order.customer as { first_name?: string; last_name?: string; company_name?: string } | null;
          const customerName = customer?.company_name || 
            [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Onbekend";

          actions.push({
            id: `ready-${order.id}`,
            title: `Bestelling plaatsen`,
            meta: [`Order #${order.order_number}`, customerName],
            type: "Bestelling",
            priority: "medium",
            sourceType: "order",
            sourceId: order.id,
          });
        });
      }

      // Sort by priority and limit
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return actions
        .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
        .slice(0, limit);
    },
  });
}
