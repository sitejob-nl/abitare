import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Database } from "@/integrations/supabase/types";

export type Order = Tables<"orders">;
export type OrderStatus = Database["public"]["Enums"]["order_status"];

interface UseOrdersOptions {
  divisionId?: string | null;
  status?: OrderStatus | "all" | null;
  limit?: number;
  enabled?: boolean;
}

export function useOrders(options: UseOrdersOptions = {}) {
  const { divisionId, status, limit, enabled = true } = options;

  return useQuery({
    queryKey: ["orders", { divisionId, status, limit }],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select(`
          *,
          customer:customers(id, first_name, last_name, company_name),
          division:divisions(id, name)
        `)
        .order("created_at", { ascending: false });

      if (divisionId && divisionId !== "all") {
        query = query.eq("division_id", divisionId);
      }

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled,
  });
}

export function useRecentOrders(limit = 5) {
  return useOrders({ limit });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          customer:customers(*),
          division:divisions(*),
          quote:quotes(id, quote_number),
          order_lines(*),
          order_documents(*),
          order_notes(*),
          order_status_history(
            id,
            from_status,
            to_status,
            created_at,
            notes,
            changed_by
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
