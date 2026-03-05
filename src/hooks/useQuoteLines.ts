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

async function recalculateQuoteTotals(quoteId: string) {
  // Fetch all sections with lines
  const { data: sections } = await supabase
    .from("quote_sections")
    .select("*, quote_lines(*)")
    .eq("quote_id", quoteId)
    .order("sort_order", { ascending: true });

  if (!sections) return;

  let subtotalProducts = 0;
  let subtotalMontage = 0;
  const vatByRate = new Map<number, number>();

  sections.forEach((section) => {
    const sectionTotal = section.quote_lines?.reduce(
      (sum: number, line: any) => sum + (line.line_total || 0),
      0
    ) || 0;

    const discountAmt = section.discount_percentage
      ? (sectionTotal * (section.discount_percentage || 0)) / 100
      : (section.discount_amount || 0);
    const sectionNet = sectionTotal - discountAmt;
    const discFraction = sectionTotal > 0 ? sectionNet / sectionTotal : 1;

    section.quote_lines?.forEach((line: any) => {
      const rate = line.vat_rate ?? 21;
      const lineNet = (line.line_total || 0) * discFraction;
      vatByRate.set(rate, (vatByRate.get(rate) || 0) + lineNet);
    });

    // Update section subtotal
    supabase
      .from("quote_sections")
      .update({ subtotal: sectionNet })
      .eq("id", section.id)
      .then(() => {});

    if (section.section_type === "montage") {
      subtotalMontage += sectionNet;
    } else {
      subtotalProducts += sectionNet;
    }
  });

  // Fetch quote-level discount
  const { data: quote } = await supabase
    .from("quotes")
    .select("discount_amount")
    .eq("id", quoteId)
    .single();

  const discountAmount = quote?.discount_amount || 0;
  const totalExclVat = subtotalProducts + subtotalMontage - discountAmount;
  const subBefore = subtotalProducts + subtotalMontage;
  const qFraction = subBefore > 0 ? totalExclVat / subBefore : 1;
  let totalVat = 0;
  vatByRate.forEach((base, rate) => {
    totalVat += base * qFraction * (rate / 100);
  });
  const totalInclVat = totalExclVat + totalVat;

  await supabase.from("quotes").update({
    subtotal_products: subtotalProducts,
    subtotal_montage: subtotalMontage,
    total_excl_vat: totalExclVat,
    total_vat: totalVat,
    total_incl_vat: totalInclVat,
  }).eq("id", quoteId);
}

export function useCreateQuoteLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (line: QuoteLineInsert) => {
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
    onSuccess: async (data) => {
      await recalculateQuoteTotals(data.quote_id);
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
    onSuccess: async ({ quoteId }) => {
      await recalculateQuoteTotals(quoteId);
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
    onSuccess: async ({ quoteId }) => {
      await recalculateQuoteTotals(quoteId);
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
