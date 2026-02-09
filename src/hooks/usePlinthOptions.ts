import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type PlinthOption = Tables<"plinth_options">;
export type PlinthOptionInsert = TablesInsert<"plinth_options">;
export type PlinthOptionUpdate = TablesUpdate<"plinth_options">;

export function usePlinthOptions(supplierId?: string) {
  return useQuery({
    queryKey: ["plinth-options", supplierId],
    queryFn: async () => {
      let query = supabase
        .from("plinth_options")
        .select("*")
        .eq("is_active", true)
        .order("height_mm", { ascending: true });

      if (supplierId) query = query.eq("supplier_id", supplierId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreatePlinthOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opt: PlinthOptionInsert) => {
      const { data, error } = await supabase.from("plinth_options").insert(opt).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plinth-options"] }),
  });
}

export function useUpdatePlinthOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: PlinthOptionUpdate & { id: string }) => {
      const { data, error } = await supabase.from("plinth_options").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plinth-options"] }),
  });
}

export function useDeletePlinthOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plinth_options").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["plinth-options"] }),
  });
}
