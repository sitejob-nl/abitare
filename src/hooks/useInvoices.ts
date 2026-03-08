import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Hook for fetching a single invoice by ID
export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          order_date,
          customer_id,
          division_id,
          total_incl_vat,
          total_excl_vat,
          total_vat,
          payment_status,
          amount_paid,
          exact_invoice_id,
          customers(
            id,
            first_name,
            last_name,
            company_name,
            email,
            phone,
            street_address,
            postal_code,
            city
          ),
          divisions(name),
          order_lines(
            id,
            description,
            article_code,
            quantity,
            unit,
            unit_price,
            discount_percentage,
            line_total,
            is_group_header,
            group_title,
            section_type,
            section_id,
            vat_rate
          ),
          order_sections(
            id,
            title,
            section_type,
            sort_order,
            subtotal,
            discount_percentage,
            discount_amount,
            discount_description
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

export interface Invoice {
  id: string;
  order_number: number;
  order_date: string | null;
  customer_id: string;
  customer_name: string;
  total_incl_vat: number | null;
  total_excl_vat: number | null;
  total_vat: number | null;
  payment_status: "open" | "deels_betaald" | "betaald" | null;
  amount_paid: number | null;
  exact_invoice_id: string | null;
  division_id: string | null;
  division_name: string | null;
  invoice_type: string | null;
  parent_order_id: string | null;
}

interface UseInvoicesOptions {
  divisionId?: string | null;
}

export function useInvoices(options: UseInvoicesOptions = {}) {
  const { divisionId } = options;

  return useQuery({
    queryKey: ["invoices", { divisionId }],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select(`
          id,
          order_number,
          order_date,
          customer_id,
          division_id,
          total_incl_vat,
          total_excl_vat,
          total_vat,
          payment_status,
          amount_paid,
          exact_invoice_id,
          customers!inner(first_name, last_name, company_name),
          divisions(name)
        `)
        .order("order_date", { ascending: false });

      if (divisionId && divisionId !== "all") {
        query = query.eq("division_id", divisionId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((order): Invoice => {
        const customer = order.customers as { first_name: string | null; last_name: string; company_name: string | null };
        const division = order.divisions as { name: string } | null;
        
        const customerName = customer.company_name 
          || [customer.first_name, customer.last_name].filter(Boolean).join(" ");

        return {
          id: order.id,
          order_number: order.order_number,
          order_date: order.order_date,
          customer_id: order.customer_id,
          customer_name: customerName,
          total_incl_vat: order.total_incl_vat,
          total_excl_vat: order.total_excl_vat,
          total_vat: order.total_vat,
          payment_status: order.payment_status,
          amount_paid: order.amount_paid,
          exact_invoice_id: order.exact_invoice_id,
          division_id: order.division_id,
          division_name: division?.name || null,
        };
      });
    },
  });
}

interface UseInvoiceStatsOptions {
  divisionId?: string | null;
}

export function useInvoiceStats(options: UseInvoiceStatsOptions = {}) {
  const { divisionId } = options;

  return useQuery({
    queryKey: ["invoice-stats", { divisionId }],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("total_incl_vat, amount_paid, payment_status, division_id");

      if (divisionId && divisionId !== "all") {
        query = query.eq("division_id", divisionId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const orders = data || [];
      
      const totalOpen = orders
        .filter(o => o.payment_status === "open")
        .reduce((sum, o) => sum + (o.total_incl_vat || 0), 0);
      
      const totalPartial = orders
        .filter(o => o.payment_status === "deels_betaald")
        .reduce((sum, o) => sum + ((o.total_incl_vat || 0) - (o.amount_paid || 0)), 0);
      
      const totalPaid = orders
        .filter(o => o.payment_status === "betaald")
        .reduce((sum, o) => sum + (o.total_incl_vat || 0), 0);

      const countOpen = orders.filter(o => o.payment_status === "open").length;
      const countPartial = orders.filter(o => o.payment_status === "deels_betaald").length;
      const countPaid = orders.filter(o => o.payment_status === "betaald").length;

      return {
        totalOpen,
        totalPartial,
        totalPaid,
        totalOutstanding: totalOpen + totalPartial,
        countOpen,
        countPartial,
        countPaid,
        countTotal: orders.length,
      };
    },
  });
}
