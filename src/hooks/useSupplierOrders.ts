import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SupplierOrder {
  id: string;
  order_id: string | null;
  supplier_id: string | null;
  external_order_id: string | null;
  status: string;
  total_amount: number | null;
  sent_at: string | null;
  confirmed_at: string | null;
  expected_delivery_date: string | null;
  notes: string | null;
  created_at: string | null;
  supplier?: {
    id: string;
    name: string;
    code: string;
    tradeplace_enabled: boolean | null;
    tradeplace_gln: string | null;
  };
  lines?: SupplierOrderLine[];
}

export interface SupplierOrderLine {
  id: string;
  supplier_order_id: string | null;
  order_line_id: string | null;
  product_id: string | null;
  ean_code: string | null;
  quantity: number;
  unit_price: number | null;
  status: string;
  availability_status: string | null;
  availability_qty: number | null;
  availability_checked_at: string | null;
  lead_time_days: number | null;
  created_at: string | null;
  product?: {
    id: string;
    name: string;
    article_code: string;
    ean_code: string | null;
  };
}

export function useSupplierOrders(orderId?: string) {
  return useQuery({
    queryKey: ["supplier-orders", orderId],
    queryFn: async () => {
      let query = supabase
        .from("supplier_orders")
        .select(`
          *,
          supplier:suppliers(id, name, code, tradeplace_enabled, tradeplace_gln),
          lines:supplier_order_lines(
            *,
            product:products(id, name, article_code, ean_code)
          )
        `)
        .order("created_at", { ascending: false });

      if (orderId) {
        query = query.eq("order_id", orderId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SupplierOrder[];
    },
    enabled: !!orderId || orderId === undefined
  });
}

export function useSupplierOrder(id: string | null | undefined) {
  return useQuery({
    queryKey: ["supplier-order", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("supplier_orders")
        .select(`
          *,
          supplier:suppliers(id, name, code, tradeplace_enabled, tradeplace_gln),
          lines:supplier_order_lines(
            *,
            product:products(id, name, article_code, ean_code)
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as SupplierOrder;
    },
    enabled: !!id
  });
}

export interface CreateSupplierOrderInput {
  order_id: string;
  supplier_id: string;
  lines: {
    order_line_id?: string;
    product_id?: string;
    ean_code?: string;
    quantity: number;
    unit_price?: number;
  }[];
  notes?: string;
}

export function useCreateSupplierOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSupplierOrderInput) => {
      // Calculate total
      const totalAmount = input.lines.reduce(
        (sum, line) => sum + (line.quantity * (line.unit_price || 0)),
        0
      );

      // Create supplier order
      const { data: supplierOrder, error: orderError } = await supabase
        .from("supplier_orders")
        .insert({
          order_id: input.order_id,
          supplier_id: input.supplier_id,
          status: "pending",
          total_amount: totalAmount,
          notes: input.notes
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create lines
      const linesToInsert = input.lines.map(line => ({
        supplier_order_id: supplierOrder.id,
        order_line_id: line.order_line_id,
        product_id: line.product_id,
        ean_code: line.ean_code,
        quantity: line.quantity,
        unit_price: line.unit_price,
        status: "pending"
      }));

      const { error: linesError } = await supabase
        .from("supplier_order_lines")
        .insert(linesToInsert);

      if (linesError) throw linesError;

      return supplierOrder;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["supplier-orders"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-orders", variables.order_id] });
    }
  });
}

export function useUpdateSupplierOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes
    }: {
      id: string;
      status: string;
      notes?: string;
    }) => {
      const updates: Record<string, any> = { status };
      
      if (notes) updates.notes = notes;
      if (status === 'sent') updates.sent_at = new Date().toISOString();
      if (status === 'confirmed') updates.confirmed_at = new Date().toISOString();

      const { data, error } = await supabase
        .from("supplier_orders")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-orders"] });
    }
  });
}

export function useDeleteSupplierOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("supplier_orders")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-orders"] });
    }
  });
}
