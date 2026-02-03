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

      // 2. Fetch all quote lines
      const { data: quoteLines, error: linesError } = await supabase
        .from("quote_lines")
        .select("*")
        .eq("quote_id", quoteId)
        .order("sort_order");

      if (linesError) throw linesError;

      // 3. Fetch all quote sections for section_type mapping
      const { data: quoteSections, error: sectionsError } = await supabase
        .from("quote_sections")
        .select("id, section_type, title")
        .eq("quote_id", quoteId);

      if (sectionsError) throw sectionsError;

      // Create section lookup map
      const sectionMap = new Map(
        quoteSections?.map((s) => [s.id, { section_type: s.section_type, title: s.title }])
      );

      // 4. Create the order
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
          internal_notes: quote.internal_notes,
        })
        .select()
        .single();

      if (orderError) throw orderError;
      if (!newOrder) throw new Error("Kon order niet aanmaken");

      // 5. Create order lines from quote lines
      if (quoteLines && quoteLines.length > 0) {
        const orderLines = quoteLines.map((line) => {
          const section = line.section_id ? sectionMap.get(line.section_id) : null;

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
            configuration: line.configuration,
            section_type: section?.section_type || null,
            group_title: line.group_title || section?.title || null,
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
