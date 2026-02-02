import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type QuoteLine = Tables<"quote_lines">;
export type QuoteLineInsert = TablesInsert<"quote_lines">;
export type QuoteLineUpdate = TablesUpdate<"quote_lines">;

export function useQuoteLines(quoteId: string | undefined, sectionId?: string) {
  return useQuery({
    queryKey: ["quote-lines", quoteId, sectionId],
    queryFn: async () => {
      if (!quoteId) return [];

      let query = supabase
        .from("quote_lines")
        .select(`
          *,
          product:products(id, name, article_code, base_price, unit, vat_rate)
        `)
        .eq("quote_id", quoteId)
        .order("sort_order", { ascending: true });

      if (sectionId) {
        query = query.eq("section_id", sectionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!quoteId,
  });
}

export function useCreateQuoteLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (line: QuoteLineInsert) => {
      // Calculate line_total if not provided
      const lineTotal = line.line_total ?? calculateLineTotal(
        line.quantity ?? 1,
        line.unit_price,
        line.discount_percentage ?? 0
      );

      const { data, error } = await supabase
        .from("quote_lines")
        .insert({ ...line, line_total: lineTotal })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quote-lines", data.quote_id] });
      queryClient.invalidateQueries({ queryKey: ["quote-sections", data.quote_id] });
      queryClient.invalidateQueries({ queryKey: ["quote", data.quote_id] });
    },
  });
}

export function useUpdateQuoteLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quoteId, ...updates }: QuoteLineUpdate & { id: string; quoteId: string }) => {
      // Recalculate line_total if relevant fields changed
      let lineTotal = updates.line_total;
      if (updates.quantity !== undefined || updates.unit_price !== undefined || updates.discount_percentage !== undefined) {
        // We need the current values to calculate, so we fetch first
        const { data: current } = await supabase
          .from("quote_lines")
          .select("quantity, unit_price, discount_percentage")
          .eq("id", id)
          .single();

        if (current) {
          lineTotal = calculateLineTotal(
            updates.quantity ?? current.quantity ?? 1,
            updates.unit_price ?? current.unit_price,
            updates.discount_percentage ?? current.discount_percentage ?? 0
          );
        }
      }

      const { data, error } = await supabase
        .from("quote_lines")
        .update({ ...updates, line_total: lineTotal })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, quoteId };
    },
    onSuccess: ({ quoteId }) => {
      queryClient.invalidateQueries({ queryKey: ["quote-lines", quoteId] });
      queryClient.invalidateQueries({ queryKey: ["quote-sections", quoteId] });
      queryClient.invalidateQueries({ queryKey: ["quote", quoteId] });
    },
  });
}

export function useDeleteQuoteLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quoteId }: { id: string; quoteId: string }) => {
      const { error } = await supabase
        .from("quote_lines")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { quoteId };
    },
    onSuccess: ({ quoteId }) => {
      queryClient.invalidateQueries({ queryKey: ["quote-lines", quoteId] });
      queryClient.invalidateQueries({ queryKey: ["quote-sections", quoteId] });
      queryClient.invalidateQueries({ queryKey: ["quote", quoteId] });
    },
  });
}

// Helper function to calculate line total
export function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  discountPercentage: number
): number {
  return quantity * unitPrice * (1 - discountPercentage / 100);
}
