import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PlanningPreference {
  id: string;
  order_id: string;
  token_id: string;
  preferred_date_1: string | null;
  preferred_date_2: string | null;
  preferred_date_3: string | null;
  time_preference: "ochtend" | "middag" | "geen_voorkeur" | null;
  remarks: string | null;
  submitted_at: string;
  created_at: string;
}

// Fetch planning preferences for an order (admin view)
export function usePlanningPreferences(orderId: string | undefined) {
  return useQuery({
    queryKey: ["planning-preferences", orderId],
    queryFn: async () => {
      if (!orderId) return [];

      const { data, error } = await supabase
        .from("customer_planning_preferences")
        .select("*")
        .eq("order_id", orderId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      return data as PlanningPreference[];
    },
    enabled: !!orderId,
  });
}

// Submit planning preferences (portal view - using token)
export function useSubmitPlanningPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      tokenId,
      preferredDate1,
      preferredDate2,
      preferredDate3,
      timePreference,
      remarks,
    }: {
      orderId: string;
      tokenId: string;
      preferredDate1?: string;
      preferredDate2?: string;
      preferredDate3?: string;
      timePreference?: "ochtend" | "middag" | "geen_voorkeur";
      remarks?: string;
    }) => {
      const { data, error } = await supabase
        .from("customer_planning_preferences")
        .insert({
          order_id: orderId,
          token_id: tokenId,
          preferred_date_1: preferredDate1 || null,
          preferred_date_2: preferredDate2 || null,
          preferred_date_3: preferredDate3 || null,
          time_preference: timePreference || null,
          remarks: remarks || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["planning-preferences", variables.orderId] });
    },
  });
}

// Check if customer already submitted preferences for an order
export function useHasSubmittedPreferences(orderId: string | undefined, tokenId: string | undefined) {
  return useQuery({
    queryKey: ["has-submitted-preferences", orderId, tokenId],
    queryFn: async () => {
      if (!orderId || !tokenId) return false;

      const { count, error } = await supabase
        .from("customer_planning_preferences")
        .select("*", { count: "exact", head: true })
        .eq("order_id", orderId)
        .eq("token_id", tokenId);

      if (error) throw error;
      return (count || 0) > 0;
    },
    enabled: !!orderId && !!tokenId,
  });
}
