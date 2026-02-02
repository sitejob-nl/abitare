import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type QuoteSection = Tables<"quote_sections">;
export type QuoteSectionInsert = TablesInsert<"quote_sections">;
export type QuoteSectionUpdate = TablesUpdate<"quote_sections">;

export const SECTION_TYPES = [
  { value: "meubelen", label: "Keukenmeubelen" },
  { value: "apparatuur", label: "Apparatuur" },
  { value: "werkbladen", label: "Werkbladen" },
  { value: "montage", label: "Montage" },
  { value: "transport", label: "Transport" },
  { value: "overig", label: "Overig" },
] as const;

export type SectionType = (typeof SECTION_TYPES)[number]["value"];

export function useQuoteSections(quoteId: string | undefined) {
  return useQuery({
    queryKey: ["quote-sections", quoteId],
    queryFn: async () => {
      if (!quoteId) return [];

      const { data, error } = await supabase
        .from("quote_sections")
        .select(`
          *,
          quote_lines(*)
        `)
        .eq("quote_id", quoteId)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!quoteId,
  });
}

export function useCreateQuoteSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (section: QuoteSectionInsert) => {
      const { data, error } = await supabase
        .from("quote_sections")
        .insert(section)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quote-sections", data.quote_id] });
      queryClient.invalidateQueries({ queryKey: ["quote", data.quote_id] });
    },
  });
}

export function useUpdateQuoteSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: QuoteSectionUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("quote_sections")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quote-sections", data.quote_id] });
      queryClient.invalidateQueries({ queryKey: ["quote", data.quote_id] });
    },
  });
}

export function useDeleteQuoteSection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quoteId }: { id: string; quoteId: string }) => {
      const { error } = await supabase
        .from("quote_sections")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { quoteId };
    },
    onSuccess: ({ quoteId }) => {
      queryClient.invalidateQueries({ queryKey: ["quote-sections", quoteId] });
      queryClient.invalidateQueries({ queryKey: ["quote", quoteId] });
    },
  });
}
