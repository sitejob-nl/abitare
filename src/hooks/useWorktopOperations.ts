import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type WorktopOperation = Tables<"worktop_operations">;
export type WorktopOperationInsert = TablesInsert<"worktop_operations">;
export type WorktopOperationUpdate = TablesUpdate<"worktop_operations">;

export function useWorktopOperations(supplierId?: string | null, onlyActive = true) {
  return useQuery({
    queryKey: ["worktop-operations", supplierId, onlyActive],
    queryFn: async () => {
      let query = supabase
        .from("worktop_operations")
        .select("*")
        .order("code", { ascending: true });

      if (supplierId) {
        query = query.eq("supplier_id", supplierId);
      }

      if (onlyActive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as WorktopOperation[];
    },
  });
}

export function useCreateWorktopOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (operation: WorktopOperationInsert) => {
      const { data, error } = await supabase
        .from("worktop_operations")
        .insert(operation)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worktop-operations"] });
    },
  });
}

export function useUpdateWorktopOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: WorktopOperationUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("worktop_operations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worktop-operations"] });
    },
  });
}

export function useDeleteWorktopOperation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("worktop_operations")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worktop-operations"] });
    },
  });
}
