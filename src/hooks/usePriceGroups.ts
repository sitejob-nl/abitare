import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type PriceGroup = Tables<"price_groups">;
export type PriceGroupInsert = TablesInsert<"price_groups">;
export type PriceGroupUpdate = TablesUpdate<"price_groups">;

export function usePriceGroups(supplierId?: string, collection?: string) {
  return useQuery({
    queryKey: ["price-groups", supplierId, collection],
    queryFn: async () => {
      let query = supabase
        .from("price_groups")
        .select("*")
        .order("collection", { ascending: true })
        .order("sort_order", { ascending: true });

      if (supplierId) query = query.eq("supplier_id", supplierId);
      if (collection) query = query.eq("collection", collection);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function usePriceGroup(id: string | null | undefined) {
  return useQuery({
    queryKey: ["price-group", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("price_groups")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePriceGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pg: PriceGroupInsert) => {
      const { data, error } = await supabase.from("price_groups").insert(pg).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["price-groups"] }),
  });
}

export function useUpdatePriceGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: PriceGroupUpdate & { id: string }) => {
      const { data, error } = await supabase.from("price_groups").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["price-groups"] }),
  });
}

export function useDeletePriceGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("price_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["price-groups"] }),
  });
}
