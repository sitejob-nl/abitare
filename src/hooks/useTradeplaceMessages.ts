import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TradeplaceMessageFilters {
  messageType?: string;
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useTradeplaceMessages(filters: TradeplaceMessageFilters = {}) {
  return useQuery({
    queryKey: ["tradeplace-messages", filters],
    queryFn: async () => {
      let query = supabase
        .from("tradeplace_messages")
        .select("*, supplier:suppliers(name)")
        .order("created_at", { ascending: false })
        .limit(200);

      if (filters.messageType) {
        query = query.eq("message_type", filters.messageType);
      }
      if (filters.supplierId) {
        query = query.eq("supplier_id", filters.supplierId);
      }
      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("created_at", filters.dateTo + "T23:59:59");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useTradeplaceMessageTypes() {
  return useQuery({
    queryKey: ["tradeplace-message-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tradeplace_messages")
        .select("message_type")
        .limit(1000);
      if (error) throw error;
      const types = [...new Set(data.map((d) => d.message_type))].sort();
      return types;
    },
    staleTime: 60 * 1000,
  });
}
