import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ConvertQuoteToOrderResult {
  orderId: string;
  orderNumber: number;
}

export function useConvertQuoteToOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quoteId: string): Promise<ConvertQuoteToOrderResult> => {
      // 1. Fetch the quote with all related data
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", quoteId)
        .single();

      if (quoteError) throw quoteError;
      if (!quote) throw new Error("Offerte niet gevonden");

      // 2. Fetch all quote sections with their lines
      const { data: quoteSections, error: sectionsError } = await supabase
        .from("quote_sections")
        .select(`
          *,
          quote_lines(*)
        `)
        .eq("quote_id", quoteId)
        .order("sort_order");

      if (sectionsError) throw sectionsError;

      // 3. Create the order
      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: quote.customer_id,
          division_id: quote.division_id,
          quote_id: quote.id,
          order_date: new Date().toISOString().split("T")[0],
          status: "nieuw",
          payment_status: "open",
          salesperson_id: quote.salesperson_id,
          subtotal_products: quote.subtotal_products,
          subtotal_montage: quote.subtotal_montage,
          discount_amount: quote.discount_amount,
          total_excl_vat: quote.total_excl_vat,
          total_vat: quote.total_vat,
          total_incl_vat: quote.total_incl_vat,
          payment_condition: quote.payment_condition,
          internal_notes: [
            quote.internal_notes,
            quote.reference ? `Ref: ${quote.reference}` : null,
            quote.category ? `Categorie: ${quote.category}` : null,
          ].filter(Boolean).join(' | ') || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;
      if (!newOrder) throw new Error("Kon order niet aanmaken");

      // 4. Create order sections from quote sections
      const orderSectionMap = new Map<string, string>(); // quote_section_id -> order_section_id

      if (quoteSections && quoteSections.length > 0) {
        for (const quoteSection of quoteSections) {
          const lines = (quoteSection as any).quote_lines || [];
          const sectionSubtotal = lines.reduce(
            (sum: number, line: any) => sum + (line.line_total || 0),
            0
          );

          const { data: orderSection, error: orderSectionError } = await supabase
            .from("order_sections")
            .insert({
              order_id: newOrder.id,
              quote_section_id: quoteSection.id,
              section_type: quoteSection.section_type,
              title: quoteSection.title,
              sort_order: quoteSection.sort_order,
              subtotal: sectionSubtotal,
              discount_percentage: quoteSection.discount_percentage,
              discount_amount: quoteSection.discount_amount,
              discount_description: quoteSection.discount_description,
              range_id: quoteSection.range_id,
              color_id: quoteSection.color_id,
              front_number: quoteSection.front_number,
              front_color: quoteSection.front_color,
              corpus_color: quoteSection.corpus_color,
              plinth_color: quoteSection.plinth_color,
              hinge_color: quoteSection.hinge_color,
              drawer_color: quoteSection.drawer_color,
              handle_number: quoteSection.handle_number,
              column_height_mm: quoteSection.column_height_mm,
              countertop_height_mm: quoteSection.countertop_height_mm,
              countertop_thickness_mm: quoteSection.countertop_thickness_mm,
              workbench_material: quoteSection.workbench_material,
              workbench_edge: quoteSection.workbench_edge,
              workbench_color: quoteSection.workbench_color,
              configuration: quoteSection.configuration,
              description: quoteSection.description,
            })
            .select()
            .single();

          if (orderSectionError) throw orderSectionError;
          if (orderSection) {
            orderSectionMap.set(quoteSection.id, orderSection.id);
          }
        }
      }

      // 5. Create order lines from quote lines with section references
      const allQuoteLines: any[] = [];
      quoteSections?.forEach((section) => {
        const lines = (section as any).quote_lines || [];
        lines.forEach((line: any) => {
          allQuoteLines.push({
            ...line,
            _section: section,
          });
        });
      });

      if (allQuoteLines.length > 0) {
        const orderLines = allQuoteLines.map((line) => {
          const orderSectionId = line.section_id 
            ? orderSectionMap.get(line.section_id) 
            : null;

          return {
            order_id: newOrder.id,
            quote_line_id: line.id,
            product_id: line.product_id,
            article_code: line.article_code,
            description: line.description,
            quantity: line.quantity,
            unit: line.unit,
            unit_price: line.unit_price,
            discount_percentage: line.discount_percentage,
            vat_rate: line.vat_rate,
            line_total: line.line_total,
            configuration: {
              ...(typeof line.configuration === 'object' && line.configuration !== null ? line.configuration : {}),
              range_override_id: line.range_override_id || null,
              color_override: line.color_override || null,
            },
            section_type: line._section?.section_type || null,
            section_id: orderSectionId,
            group_title: line.group_title || line._section?.title || null,
            is_group_header: line.is_group_header,
            sort_order: line.sort_order,
          };
        });

        const { error: orderLinesError } = await supabase
          .from("order_lines")
          .insert(orderLines);

        if (orderLinesError) throw orderLinesError;
      }

      // 6. Update quote status to "geaccepteerd"
      const { error: updateQuoteError } = await supabase
        .from("quotes")
        .update({
          status: "geaccepteerd",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", quoteId);

      if (updateQuoteError) throw updateQuoteError;

      // 7. Create initial status history entry
      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({
          order_id: newOrder.id,
          to_status: "nieuw",
          notes: `Order aangemaakt vanuit offerte #${quote.quote_number}`,
        });

      if (historyError) {
        console.warn("Could not create status history:", historyError);
      }

      return {
        orderId: newOrder.id,
        orderNumber: newOrder.order_number,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}
