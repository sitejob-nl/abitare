import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type CustomerQuote = Tables<"quotes"> & {
  orders?: { id: string; order_number: number }[];
};

export function useCustomerQuotes(customerId: string | undefined) {
  return useQuery({
    queryKey: ["customer-quotes", customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from("quotes")
        .select(`
          *,
          orders(id, order_number)
        `)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as CustomerQuote[];
    },
    enabled: !!customerId,
  });
}
