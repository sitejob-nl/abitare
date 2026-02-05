import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type InstallationRate = Tables<"installation_rates">;
export type InstallationRateInsert = TablesInsert<"installation_rates">;
export type InstallationRateUpdate = TablesUpdate<"installation_rates">;

export function useInstallationRates(onlyActive = true) {
  return useQuery({
    queryKey: ["installation-rates", onlyActive],
    queryFn: async () => {
      let query = supabase
        .from("installation_rates")
        .select("*")
        .order("code", { ascending: true });

      if (onlyActive) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as InstallationRate[];
    },
  });
}

export function useCreateInstallationRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rate: InstallationRateInsert) => {
      const { data, error } = await supabase
        .from("installation_rates")
        .insert(rate)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installation-rates"] });
    },
  });
}

export function useUpdateInstallationRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: InstallationRateUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("installation_rates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installation-rates"] });
    },
  });
}

export function useDeleteInstallationRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("installation_rates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installation-rates"] });
    },
  });
}
