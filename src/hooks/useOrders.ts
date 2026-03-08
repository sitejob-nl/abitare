import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Database } from "@/integrations/supabase/types";

export type Order = Tables<"orders">;
export type OrderStatus = Database["public"]["Enums"]["order_status"];

interface UseOrdersOptions {
  divisionId?: string | null;
  status?: OrderStatus | "all" | null;
  limit?: number;
  enabled?: boolean;
}

export function useOrders(options: UseOrdersOptions = {}) {
  const { divisionId, status, limit, enabled = true } = options;

  return useQuery({
    queryKey: ["orders", { divisionId, status, limit }],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select(`
          id, order_number, order_date, status, payment_status, total_excl_vat, total_incl_vat,
          customer_id, division_id, created_at, updated_at, installer_id, 
          expected_installation_date, expected_delivery_date, actual_delivery_date,
          forecast_week, deposit_required, deposit_invoice_sent, amount_paid,
          quote_id, salesperson_id, assistant_id, project_id, invoice_type,
          is_standalone_invoice, exact_sales_order_id, exact_invoice_id,
          total_vat, total_cost_price, margin_amount, margin_percentage,
          subtotal_products, subtotal_montage, discount_amount,
          customer:customers(id, first_name, last_name, company_name),
          division:divisions(id, name)
        `)
        .order("created_at", { ascending: false });

      if (divisionId && divisionId !== "all") {
        query = query.eq("division_id", divisionId);
      }

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      if (limit) {
        query = query.limit(limit);
      } else {
        query = query.limit(500);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecentOrders(limit = 5) {
  return useOrders({ limit });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          customer:customers(*),
          division:divisions(*),
          quote:quotes(id, quote_number),
          order_lines(
            *,
            supplier:suppliers(id, name, code)
          ),
          order_documents(*),
          order_notes(*),
          order_status_history(
            id,
            from_status,
            to_status,
            created_at,
            notes,
            changed_by
          ),
          order_sections(
            *,
            range:product_ranges(id, code, name, price_group),
            color:product_colors(id, code, name, hex_color)
          )
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}
