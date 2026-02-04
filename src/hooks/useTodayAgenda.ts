import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface AgendaItem {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  type: "showroom" | "inmeet" | "montage" | "levering";
  sourceType: "order";
  sourceId: string;
}

export function useTodayAgenda() {
  return useQuery({
    queryKey: ["today-agenda"],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const items: AgendaItem[] = [];

      // Run both queries in parallel
      const [deliveriesResult, installationsResult] = await Promise.all([
        supabase
          .from("orders")
          .select(`
            id, order_number, expected_delivery_date,
            customer:customers(first_name, last_name, company_name, city)
          `)
          .eq("expected_delivery_date", today)
          .in("status", ["levering_gepland", "besteld", "in_productie"])
          .order("order_number", { ascending: true }),
        
        supabase
          .from("orders")
          .select(`
            id, order_number, expected_installation_date,
            customer:customers(first_name, last_name, company_name, city)
          `)
          .eq("expected_installation_date", today)
          .in("status", ["montage_gepland", "geleverd"])
          .order("order_number", { ascending: true }),
      ]);

      const deliveries = deliveriesResult.data;
      const installations = installationsResult.data;

      if (deliveries) {
        deliveries.forEach((order, index) => {
          const customer = order.customer as { first_name?: string; last_name?: string; company_name?: string; city?: string } | null;
          const customerName = customer?.company_name || 
            [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Onbekend";
          
          const hour = 9 + Math.floor(index * 2);
          const time = `${hour.toString().padStart(2, '0')}:00`;

          items.push({
            id: `delivery-${order.id}`,
            time,
            title: "Levering",
            subtitle: `${customerName}${customer?.city ? ` - ${customer.city}` : ""}`,
            type: "levering",
            sourceType: "order",
            sourceId: order.id,
          });
        });
      }

      if (installations) {
        installations.forEach((order, index) => {
          const customer = order.customer as { first_name?: string; last_name?: string; company_name?: string; city?: string } | null;
          const customerName = customer?.company_name || 
            [customer?.first_name, customer?.last_name].filter(Boolean).join(" ") || "Onbekend";
          
          const hour = 8 + Math.floor(index * 4);
          const time = `${hour.toString().padStart(2, '0')}:00`;

          items.push({
            id: `installation-${order.id}`,
            time,
            title: "Montage",
            subtitle: `${customerName}${customer?.city ? ` - ${customer.city}` : ""}`,
            type: "montage",
            sourceType: "order",
            sourceId: order.id,
          });
        });
      }

      return items.sort((a, b) => a.time.localeCompare(b.time));
    },
    staleTime: 60000, // 1 minute
  });
}
