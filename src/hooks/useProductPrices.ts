import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type ProductPrice = Tables<"product_prices">;
export type ProductPriceInsert = TablesInsert<"product_prices">;
export type ProductPriceUpdate = TablesUpdate<"product_prices">;

export interface ProductPriceWithRelations extends ProductPrice {
  product?: {
    id: string;
    article_code: string;
    name: string;
    base_price: number | null;
  } | null;
  range?: {
    id: string;
    code: string;
    name: string | null;
    price_group: number | null;
  } | null;
}

export function useProductPrices(productId?: string, rangeId?: string) {
  return useQuery({
    queryKey: ["product-prices", productId, rangeId],
    queryFn: async () => {
      let query = supabase
        .from("product_prices")
        .select(`
          *,
          product:products(id, article_code, name, base_price),
          range:product_ranges(id, code, name, price_group)
        `)
        .order("created_at", { ascending: false });

      if (productId) {
        query = query.eq("product_id", productId);
      }
      if (rangeId) {
        query = query.eq("range_id", rangeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ProductPriceWithRelations[];
    },
  });
}

/**
 * Get the price for a specific product in a specific range.
 * Falls back to base_price if no range-specific price is found.
 */
export function useProductPrice(productId: string | null | undefined, rangeId: string | null | undefined) {
  return useQuery({
    queryKey: ["product-price", productId, rangeId],
    queryFn: async () => {
      if (!productId) return null;

      // If no rangeId, get the base price from the product
      if (!rangeId) {
        const { data: product, error } = await supabase
          .from("products")
          .select("base_price")
          .eq("id", productId)
          .single();

        if (error) throw error;
        return {
          price: product?.base_price ?? null,
          source: "base_price" as const,
        };
      }

      // Try to find a range-specific price
      const { data: rangePrice, error: rangePriceError } = await supabase
        .from("product_prices")
        .select("price")
        .eq("product_id", productId)
        .eq("range_id", rangeId)
        .maybeSingle();

      if (rangePriceError) throw rangePriceError;

      if (rangePrice?.price != null) {
        return {
          price: rangePrice.price,
          source: "range_price" as const,
        };
      }

      // Fall back to base price
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("base_price")
        .eq("id", productId)
        .single();

      if (productError) throw productError;

      return {
        price: product?.base_price ?? null,
        source: "base_price" as const,
      };
    },
    enabled: !!productId,
  });
}

/**
 * Fetch price synchronously for immediate use (e.g., in form handlers)
 */
export async function fetchProductPrice(
  productId: string,
  rangeId: string | null,
  overrideRangeId?: string | null,
  quoteDefaultRangeId?: string | null
): Promise<{ price: number | null; source: "override_price" | "range_price" | "quote_default_price" | "base_price" }> {
  // 1. Try override range first
  if (overrideRangeId) {
    const { data: overridePrice, error: overrideError } = await supabase
      .from("product_prices")
      .select("price")
      .eq("product_id", productId)
      .eq("range_id", overrideRangeId)
      .maybeSingle();

    if (overrideError) throw overrideError;

    if (overridePrice?.price != null) {
      return {
        price: overridePrice.price,
        source: "override_price",
      };
    }
  }

  // 2. Try section default range
  if (rangeId) {
    const { data: rangePrice, error: rangePriceError } = await supabase
      .from("product_prices")
      .select("price")
      .eq("product_id", productId)
      .eq("range_id", rangeId)
      .maybeSingle();

    if (rangePriceError) throw rangePriceError;

    if (rangePrice?.price != null) {
      return {
        price: rangePrice.price,
        source: "range_price",
      };
    }
  }

  // 3. Try quote default range (NEW)
  if (quoteDefaultRangeId && quoteDefaultRangeId !== rangeId) {
    const { data: quotePrice, error: quotePriceError } = await supabase
      .from("product_prices")
      .select("price")
      .eq("product_id", productId)
      .eq("range_id", quoteDefaultRangeId)
      .maybeSingle();

    if (quotePriceError) throw quotePriceError;

    if (quotePrice?.price != null) {
      return {
        price: quotePrice.price,
        source: "quote_default_price",
      };
    }
  }

  // 4. Fall back to base price
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("base_price")
    .eq("id", productId)
    .single();

  if (productError) throw productError;

  return {
    price: product?.base_price ?? null,
    source: "base_price",
  };
}

export function useCreateProductPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (price: ProductPriceInsert) => {
      const { data, error } = await supabase
        .from("product_prices")
        .insert(price)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-prices"] });
      queryClient.invalidateQueries({ queryKey: ["product-price"] });
    },
  });
}

export function useUpdateProductPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ProductPriceUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("product_prices")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-prices"] });
      queryClient.invalidateQueries({ queryKey: ["product-price"] });
    },
  });
}

export function useDeleteProductPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_prices")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-prices"] });
      queryClient.invalidateQueries({ queryKey: ["product-price"] });
    },
  });
}

export function useUpsertProductPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      product_id: string;
      range_id: string;
      price: number;
    }) => {
      // Check if price already exists
      const { data: existing } = await supabase
        .from("product_prices")
        .select("id")
        .eq("product_id", data.product_id)
        .eq("range_id", data.range_id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { data: updated, error } = await supabase
          .from("product_prices")
          .update({ price: data.price })
          .eq("id", existing.id)
          .select()
          .single();

        if (error) throw error;
        return { ...updated, action: "updated" as const };
      } else {
        // Insert new
        const { data: inserted, error } = await supabase
          .from("product_prices")
          .insert({
            product_id: data.product_id,
            range_id: data.range_id,
            price: data.price,
          })
          .select()
          .single();

        if (error) throw error;
        return { ...inserted, action: "inserted" as const };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-prices"] });
      queryClient.invalidateQueries({ queryKey: ["product-price"] });
    },
  });
}
