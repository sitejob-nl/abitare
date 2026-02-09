import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type WorktopMaterial = Tables<"worktop_materials">;
export type WorktopMaterialInsert = TablesInsert<"worktop_materials">;
export type WorktopMaterialUpdate = TablesUpdate<"worktop_materials">;

export function useWorktopMaterials(supplierId?: string) {
  return useQuery({
    queryKey: ["worktop-materials", supplierId],
    queryFn: async () => {
      let query = supabase
        .from("worktop_materials")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (supplierId) query = query.eq("supplier_id", supplierId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateWorktopMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mat: WorktopMaterialInsert) => {
      const { data, error } = await supabase.from("worktop_materials").insert(mat).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["worktop-materials"] }),
  });
}

export function useUpdateWorktopMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: WorktopMaterialUpdate & { id: string }) => {
      const { data, error } = await supabase.from("worktop_materials").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["worktop-materials"] }),
  });
}

export function useDeleteWorktopMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("worktop_materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["worktop-materials"] }),
  });
}
