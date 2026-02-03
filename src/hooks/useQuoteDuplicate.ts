import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Quote = Tables<"quotes">;

export function useDuplicateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quoteId: string): Promise<Quote> => {
      // 1. Fetch the original quote with all related data
      const { data: original, error: fetchError } = await supabase
        .from("quotes")
        .select(`
          *,
          quote_sections(*),
          quote_lines(*)
        `)
        .eq("id", quoteId)
        .single();

      if (fetchError) throw fetchError;
      if (!original) throw new Error("Quote not found");

      // 2. Create the new quote (without id, quote_number - auto-generated)
      const { data: newQuote, error: quoteError } = await supabase
        .from("quotes")
        .insert({
          customer_id: original.customer_id,
          division_id: original.division_id,
          status: "concept" as const,
          quote_date: new Date().toISOString().split("T")[0],
          valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          introduction_text: original.introduction_text,
          closing_text: original.closing_text,
          internal_notes: original.internal_notes ? `[Kopie van #${original.quote_number}] ${original.internal_notes}` : `Kopie van offerte #${original.quote_number}`,
          payment_condition: original.payment_condition,
          payment_terms_description: original.payment_terms_description,
          discount_amount: original.discount_amount,
          discount_percentage: original.discount_percentage,
          discount_description: original.discount_description,
          default_range_id: original.default_range_id,
          default_color_id: original.default_color_id,
          subtotal_products: original.subtotal_products,
          subtotal_montage: original.subtotal_montage,
          total_excl_vat: original.total_excl_vat,
          total_vat: original.total_vat,
          total_incl_vat: original.total_incl_vat,
          salesperson_id: original.salesperson_id,
          created_by: original.created_by,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // 3. Copy sections with mapping old -> new ids
      const sections = original.quote_sections || [];
      const sectionIdMap = new Map<string, string>();

      if (sections.length > 0) {
        const sectionsToInsert = sections.map((s) => ({
          quote_id: newQuote.id,
          section_type: s.section_type,
          title: s.title,
          description: s.description,
          sort_order: s.sort_order,
          range_id: s.range_id,
          color_id: s.color_id,
          front_number: s.front_number,
          front_color: s.front_color,
          corpus_color: s.corpus_color,
          handle_number: s.handle_number,
          hinge_color: s.hinge_color,
          drawer_color: s.drawer_color,
          plinth_color: s.plinth_color,
          workbench_material: s.workbench_material,
          workbench_color: s.workbench_color,
          workbench_edge: s.workbench_edge,
          countertop_height_mm: s.countertop_height_mm,
          countertop_thickness_mm: s.countertop_thickness_mm,
          column_height_mm: s.column_height_mm,
          configuration: s.configuration,
          subtotal: s.subtotal,
        }));

        const { data: newSections, error: sectionsError } = await supabase
          .from("quote_sections")
          .insert(sectionsToInsert)
          .select();

        if (sectionsError) throw sectionsError;

        // Map old section ids to new section ids (by sort_order)
        sections.forEach((oldSection, index) => {
          if (newSections && newSections[index]) {
            sectionIdMap.set(oldSection.id, newSections[index].id);
          }
        });
      }

      // 4. Copy lines with parent-child relationships
      const lines = original.quote_lines || [];
      
      if (lines.length > 0) {
        // First, insert main lines (without parent_line_id)
        const mainLines = lines.filter((l) => !l.parent_line_id);
        const lineIdMap = new Map<string, string>();

        if (mainLines.length > 0) {
          const mainLinesToInsert = mainLines.map((l) => ({
            quote_id: newQuote.id,
            section_id: l.section_id ? sectionIdMap.get(l.section_id) || null : null,
            product_id: l.product_id,
            article_code: l.article_code,
            description: l.description,
            extra_description: l.extra_description,
            quantity: l.quantity,
            unit: l.unit,
            unit_price: l.unit_price,
            discount_percentage: l.discount_percentage,
            line_total: l.line_total,
            vat_rate: l.vat_rate,
            sort_order: l.sort_order,
            is_group_header: l.is_group_header,
            group_title: l.group_title,
            height_mm: l.height_mm,
            width_mm: l.width_mm,
            configuration: l.configuration,
          }));

          const { data: newMainLines, error: mainLinesError } = await supabase
            .from("quote_lines")
            .insert(mainLinesToInsert)
            .select();

          if (mainLinesError) throw mainLinesError;

          // Map old line ids to new line ids
          mainLines.forEach((oldLine, index) => {
            if (newMainLines && newMainLines[index]) {
              lineIdMap.set(oldLine.id, newMainLines[index].id);
            }
          });
        }

        // Then, insert sub-lines with updated parent_line_id
        const subLines = lines.filter((l) => l.parent_line_id);
        
        if (subLines.length > 0) {
          const subLinesToInsert = subLines.map((l) => ({
            quote_id: newQuote.id,
            section_id: l.section_id ? sectionIdMap.get(l.section_id) || null : null,
            parent_line_id: l.parent_line_id ? lineIdMap.get(l.parent_line_id) || null : null,
            product_id: l.product_id,
            article_code: l.article_code,
            description: l.description,
            extra_description: l.extra_description,
            quantity: l.quantity,
            unit: l.unit,
            unit_price: l.unit_price,
            discount_percentage: l.discount_percentage,
            line_total: l.line_total,
            vat_rate: l.vat_rate,
            sort_order: l.sort_order,
            sub_line_number: l.sub_line_number,
            height_mm: l.height_mm,
            width_mm: l.width_mm,
            configuration: l.configuration,
          }));

          const { error: subLinesError } = await supabase
            .from("quote_lines")
            .insert(subLinesToInsert);

          if (subLinesError) throw subLinesError;
        }
      }

      return newQuote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });
}
