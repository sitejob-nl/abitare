import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ServiceBudget = Tables<"service_budgets">;

export function useCurrentServiceBudget() {
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ["service-budget", currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_budgets")
        .select("*")
        .eq("year", currentYear)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useServiceBudgets() {
  return useQuery({
    queryKey: ["service-budgets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_budgets")
        .select("*")
        .order("year", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
