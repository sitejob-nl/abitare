import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type SupplierDiscount = Tables<"supplier_discounts">;
export type SupplierDiscountInsert = TablesInsert<"supplier_discounts">;
export type SupplierDiscountUpdate = TablesUpdate<"supplier_discounts">;

export function useSupplierDiscounts(supplierId?: string | null) {
  return useQuery({
    queryKey: ["supplier-discounts", supplierId],
    queryFn: async () => {
      let query = supabase
        .from("supplier_discounts")
        .select("*")
        .order("discount_group", { ascending: true });

      if (supplierId) {
        query = query.eq("supplier_id", supplierId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SupplierDiscount[];
    },
  });
}

export function useUpsertSupplierDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (discount: SupplierDiscountInsert) => {
      const { data, error } = await supabase
        .from("supplier_discounts")
        .upsert(discount, { onConflict: "supplier_id,discount_group" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-discounts"] });
    },
  });
}

export function useDeleteSupplierDiscount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("supplier_discounts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-discounts"] });
    },
  });
}
