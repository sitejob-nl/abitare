import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type OrderSection = Tables<"order_sections">;
export type OrderSectionInsert = TablesInsert<"order_sections">;
export type OrderSectionUpdate = TablesUpdate<"order_sections">;

export function useOrderSections(orderId: string | undefined) {
  return useQuery({
    queryKey: ["order-sections", orderId],
    queryFn: async () => {
      if (!orderId) return [];

      const { data, error } = await supabase
        .from("order_sections")
        .select(`
          *,
          range:product_ranges(id, code, name, price_group),
          color:product_colors(id, code, name, hex_color)
        `)
        .eq("order_id", orderId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });
}

export function useCreateOrderSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (section: OrderSectionInsert) => {
      const { data, error } = await supabase
        .from("order_sections")
        .insert(section)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["order-sections", data.order_id] });
      queryClient.invalidateQueries({ queryKey: ["order", data.order_id] });
    },
  });
}

export function useUpdateOrderSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: OrderSectionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("order_sections")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["order-sections", data.order_id] });
      queryClient.invalidateQueries({ queryKey: ["order", data.order_id] });
    },
  });
}

export function useDeleteOrderSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, orderId }: { id: string; orderId: string }) => {
      const { error } = await supabase
        .from("order_sections")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { orderId };
    },
    onSuccess: ({ orderId }) => {
      queryClient.invalidateQueries({ queryKey: ["order-sections", orderId] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
    },
  });
}
