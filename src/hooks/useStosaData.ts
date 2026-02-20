import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StosaModel, StosaFrontType, StosaColor } from "@/types/quote-sections";

const STALE_TIME = 1000 * 60 * 30; // 30 min cache

export function useStosaModels() {
  return useQuery({
    queryKey: ["stosa-models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stosa_models")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data as StosaModel[];
    },
    staleTime: STALE_TIME,
  });
}

export function useStosaFrontTypes(modelCode: string | null) {
  return useQuery({
    queryKey: ["stosa-front-types", modelCode],
    queryFn: async () => {
      if (!modelCode) return [];

      const { data, error } = await supabase
        .from("stosa_front_types")
        .select("*")
        .eq("model_code", modelCode)
        .eq("is_active", true);

      if (error) throw error;
      return data as StosaFrontType[];
    },
    enabled: !!modelCode,
    staleTime: STALE_TIME,
  });
}

export function useStosaColors(colorType?: "front" | "corpus" | "handle" | "plinth") {
  return useQuery({
    queryKey: ["stosa-colors", colorType],
    queryFn: async () => {
      let query = supabase
        .from("stosa_colors")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");

      if (colorType) {
        query = query.eq("color_type", colorType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as StosaColor[];
    },
    staleTime: STALE_TIME,
  });
}

/**
 * Check of een leverancier STOSA is
 */
export function isStosaSupplier(supplierCode: string | undefined | null): boolean {
  return supplierCode?.toLowerCase() === "stosa";
}
