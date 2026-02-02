import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Division = Tables<"divisions">;

export function useDivisions() {
  return useQuery({
    queryKey: ["divisions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("divisions")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data;
    },
  });
}

export function useDivision(id: string | undefined) {
  return useQuery({
    queryKey: ["division", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("divisions")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
