import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays } from "date-fns";

export interface ActionItem {
  id: string;
  title: string;
  meta: string[];
  type: string;
  priority: "high" | "medium" | "low";
  sourceType: "quote" | "order" | "customer" | "mention";
  sourceId: string;
}

function getCustomerName(customer: { first_name?: string; last_name?: string; company_name?: string } | null): string {
  if (!customer) return "Onbekend";
  return customer.company_name || [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Onbekend";
}

export function useActionItems(limit = 10) {
  const { activeDivisionId, user } = useAuth();

  return useQuery({
    queryKey: ["action-items", limit, activeDivisionId, user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const actions: ActionItem[] = [];

      // Build queries with optional division filter
      let expiredQuotesQuery = supabase
        .from("quotes")
        .select(`
          id, quote_number, valid_until,
          customer:customers(first_name, last_name, company_name)
        `)
        .eq("status", "verstuurd")
        .lt("valid_until", today)
        .order("valid_until", { ascending: true })
        .limit(5);

      let pendingOrdersQuery = supabase
        .from("orders")
        .select(`
          id, order_number, status,
          customer:customers(first_name, last_name, company_name)
        `)
        .in("status", ["nieuw", "controle"])
        .order("created_at", { ascending: true })
        .limit(5);

      let readyOrdersQuery = supabase
        .from("orders")
        .select(`
          id, order_number,
          customer:customers(first_name, last_name, company_name)
        `)
        .eq("status", "bestel_klaar")
        .order("created_at", { ascending: true })
        .limit(3);

      // Deposit: orders where deposit is required but invoice not yet sent
      let depositToSendQuery = supabase
        .from("orders")
        .select(`
          id, order_number,
          customer:customers(first_name, last_name, company_name)
        `)
        .eq("deposit_required", true)
        .eq("deposit_invoice_sent", false)
        .not("status", "eq", "afgerond")
        .order("created_at", { ascending: true })
        .limit(5);

      // Deposit: invoice sent but not yet paid
      let depositFollowUpQuery = supabase
        .from("orders")
        .select(`
          id, order_number,
          customer:customers(first_name, last_name, company_name)
        `)
        .eq("deposit_required", true)
        .eq("deposit_invoice_sent", true)
        .eq("payment_status", "open")
        .not("status", "eq", "afgerond")
        .order("created_at", { ascending: true })
        .limit(5);

      // Deposit reminder: reminder date <= today
      let depositReminderQuery = supabase
        .from("orders")
        .select(`
          id, order_number, deposit_reminder_date,
          customer:customers(first_name, last_name, company_name)
        `)
        .eq("deposit_required", true)
        .eq("deposit_invoice_sent", false)
        .lte("deposit_reminder_date", today)
        .not("status", "eq", "afgerond")
        .order("deposit_reminder_date", { ascending: true })
        .limit(5);

      // Apply division filter if set
      if (activeDivisionId) {
        expiredQuotesQuery = expiredQuotesQuery.eq("division_id", activeDivisionId);
        pendingOrdersQuery = pendingOrdersQuery.eq("division_id", activeDivisionId);
        readyOrdersQuery = readyOrdersQuery.eq("division_id", activeDivisionId);
        depositToSendQuery = depositToSendQuery.eq("division_id", activeDivisionId);
        depositFollowUpQuery = depositFollowUpQuery.eq("division_id", activeDivisionId);
        depositReminderQuery = depositReminderQuery.eq("division_id", activeDivisionId);
      }

      // Unread mentions for current user
      const mentionsQuery = user?.id
        ? supabase
            .from("user_mentions")
            .select(`
              id, content_preview, created_at,
              ticket:service_tickets(id, ticket_number, subject),
              mentioner:profiles!user_mentions_mentioned_by_fkey(full_name)
            `)
            .eq("user_id", user.id)
            .eq("is_read", false)
            .order("created_at", { ascending: false })
            .limit(5)
        : null;

      // Run all queries in parallel
      const [
        expiredQuotesResult,
        pendingOrdersResult,
        readyOrdersResult,
        depositToSendResult,
        depositFollowUpResult,
        depositReminderResult,
        mentionsResult,
      ] = await Promise.all([
        expiredQuotesQuery,
        pendingOrdersQuery,
        readyOrdersQuery,
        depositToSendQuery,
        depositFollowUpQuery,
        depositReminderQuery,
        mentionsQuery || Promise.resolve({ data: [] }),
      ]);

      // Unread mentions (highest priority - personal tasks)
      (mentionsResult.data as any[] || []).forEach((mention: any) => {
        const ticket = mention.ticket;
        const mentioner = mention.mentioner;
        actions.push({
          id: `mention-${mention.id}`,
          title: `${mentioner?.full_name || "Iemand"} heeft je getagd`,
          meta: [
            ticket ? `Ticket #${ticket.ticket_number}` : "Serviceticket",
            mention.content_preview ? mention.content_preview.slice(0, 60) : "",
          ].filter(Boolean),
          type: "Vermelding",
          priority: "high",
          sourceType: "mention",
          sourceId: ticket?.id || "",
        });
      });

      // Expired quotes
      expiredQuotesResult.data?.forEach((quote) => {
        const customerName = getCustomerName(quote.customer as any);
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

      // Pending orders (nieuw / controle)
      pendingOrdersResult.data?.forEach((order) => {
        const customerName = getCustomerName(order.customer as any);
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

      // Ready to order
      readyOrdersResult.data?.forEach((order) => {
        const customerName = getCustomerName(order.customer as any);
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

      // Deposit reminder (highest priority — date has passed)
      depositReminderResult.data?.forEach((order) => {
        const customerName = getCustomerName(order.customer as any);
        actions.push({
          id: `deposit-reminder-${order.id}`,
          title: `Herinnering aanbetaling`,
          meta: [`Order #${order.order_number}`, customerName],
          type: "Aanbetaling",
          priority: "high",
          sourceType: "order",
          sourceId: order.id,
        });
      });

      // Deposit to send
      const reminderIds = new Set(depositReminderResult.data?.map((o) => o.id) || []);
      depositToSendResult.data?.forEach((order) => {
        if (reminderIds.has(order.id)) return; // already shown as reminder
        const customerName = getCustomerName(order.customer as any);
        actions.push({
          id: `deposit-send-${order.id}`,
          title: `Aanbetaling versturen`,
          meta: [`Order #${order.order_number}`, customerName],
          type: "Aanbetaling",
          priority: "high",
          sourceType: "order",
          sourceId: order.id,
        });
      });

      // Deposit follow-up (sent but not paid)
      depositFollowUpResult.data?.forEach((order) => {
        const customerName = getCustomerName(order.customer as any);
        actions.push({
          id: `deposit-followup-${order.id}`,
          title: `Aanbetaling opvolgen`,
          meta: [`Order #${order.order_number}`, customerName],
          type: "Aanbetaling",
          priority: "medium",
          sourceType: "order",
          sourceId: order.id,
        });
      });

      // Sort by priority and limit
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return actions
        .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
        .slice(0, limit);
    },
    staleTime: 30000,
  });
}
