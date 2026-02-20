import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProductStats {
  totalActive: number;
  totalInactive: number;
  supplierCount: number;
  avgPrice: number | null;
}

export function useProductStats() {
  return useQuery({
    queryKey: ["product-stats"],
    queryFn: async (): Promise<ProductStats> => {
      const [activeRes, inactiveRes, supplierRes, avgRes] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", false),
        supabase.from("products").select("supplier_id").eq("is_active", true).not("supplier_id", "is", null),
        supabase.from("products").select("base_price").eq("is_active", true).not("base_price", "is", null).limit(5000),
      ]);

      const uniqueSuppliers = new Set((supplierRes.data ?? []).map((r: any) => r.supplier_id));
      const prices = (avgRes.data ?? []).map((r: any) => r.base_price as number);
      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null;

      return {
        totalActive: activeRes.count ?? 0,
        totalInactive: inactiveRes.count ?? 0,
        supplierCount: uniqueSuppliers.size,
        avgPrice,
      };
    },
    staleTime: 60_000,
  });
}
