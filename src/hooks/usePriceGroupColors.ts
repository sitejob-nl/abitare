import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";

export interface PriceGroupColor {
  id: string;
  price_group_id: string;
  color_code: string;
  color_name: string;
  material_type: string | null;
  finish: string | null;
  color_type: string;
  hex_color: string | null;
  sort_order: number;
  is_available: boolean;
}

/**
 * Fetch colors available for a specific price group.
 * Optionally filter by color_type (front, corpus, plinth).
 */
export function usePriceGroupColors(
  priceGroupId: string | undefined,
  colorType?: 'front' | 'corpus' | 'plinth'
) {
  return useQuery({
    queryKey: ['price-group-colors', priceGroupId, colorType],
    queryFn: async () => {
      if (!priceGroupId) return [];

      let query = supabase
        .from('price_group_colors')
        .select('*')
        .eq('price_group_id', priceGroupId)
        .eq('is_available', true)
        .order('sort_order', { ascending: true });

      if (colorType) {
        query = query.eq('color_type', colorType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PriceGroupColor[];
    },
    enabled: !!priceGroupId,
  });
}

/**
 * Fetch ALL colors for a supplier (across all price groups).
 * Useful for corpus colors that are shared across price groups.
 */
export function useSupplierColors(
  supplierId: string | undefined,
  colorType?: 'front' | 'corpus' | 'plinth'
) {
  return useQuery({
    queryKey: ['supplier-colors', supplierId, colorType],
    queryFn: async () => {
      if (!supplierId) return [];

      let query = supabase
        .from('price_group_colors')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('is_available', true)
        .order('sort_order', { ascending: true });

      if (colorType) {
        query = query.eq('color_type', colorType);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Deduplicate by color_code + color_type
      const seen = new Set<string>();
      return (data || []).filter((c: PriceGroupColor) => {
        const key = `${c.color_code}|${c.color_type}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    enabled: !!supplierId,
  });
}

// CRUD mutations for admin page (PriceGroups.tsx)
export type PriceGroupColorInsert = TablesInsert<"price_group_colors">;

export function useCreatePriceGroupColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (color: PriceGroupColorInsert) => {
      const { data, error } = await supabase.from("price_group_colors").insert(color).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-group-colors"] });
      qc.invalidateQueries({ queryKey: ["supplier-colors"] });
    },
  });
}

export function useDeletePriceGroupColor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("price_group_colors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["price-group-colors"] });
      qc.invalidateQueries({ queryKey: ["supplier-colors"] });
    },
  });
}
