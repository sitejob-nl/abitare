import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TradeplaceConfig {
  configured: boolean;
  retailer_gln: string | null;
  environment: string | null;
  base_url: string | null;
  missing_secrets: string[];
  message: string;
}

interface AvailabilityRequest {
  supplier_id: string;
  products: { ean_code: string; quantity: number }[];
}

interface AvailabilityResult {
  ean_code: string;
  available: boolean;
  quantity_available: number | null;
  lead_time_days: number | null;
  status: 'in_stock' | 'limited' | 'out_of_stock' | 'backorder' | 'unknown';
  message?: string;
}

interface AvailabilityResponse {
  success: boolean;
  supplier_name: string;
  results: AvailabilityResult[];
  note?: string;
  error?: string;
  message?: string;
}

interface PriceResult {
  ean_code: string;
  net_price: number | null;
  gross_price: number | null;
  recommended_price: number | null;
  currency: string;
  message?: string;
}

interface PriceResponse {
  success: boolean;
  supplier_name: string;
  results: PriceResult[];
  error?: string;
  message?: string;
}

interface OrderStatusLine {
  ean_code: string;
  status: string;
  confirmed_qty: number | null;
  backorder_qty: number | null;
  rejected_qty: number | null;
  delivered_qty: number | null;
}

interface OrderStatusResponse {
  success: boolean;
  sales_document_number: string | null;
  delivery_date: string | null;
  lines: OrderStatusLine[];
  message?: string;
  error?: string;
}

interface CancelResponse {
  success: boolean;
  rejected?: boolean;
  error_code?: string;
  message?: string;
}

export function useTradeplaceConfig() {
  return useQuery({
    queryKey: ["tradeplace-config"],
    queryFn: async (): Promise<TradeplaceConfig> => {
      const { data, error } = await supabase.functions.invoke("tradeplace-config", {
        body: { action: "check" }
      });
      if (error) throw error;
      return data as TradeplaceConfig;
    },
    staleTime: 5 * 60 * 1000,
    retry: false
  });
}

export function useTestTradeplaceConnection() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("tradeplace-config", {
        body: { action: "test" }
      });
      if (error) throw error;
      return data;
    }
  });
}

export function useCheckAvailability() {
  return useMutation({
    mutationFn: async (request: AvailabilityRequest): Promise<AvailabilityResponse> => {
      const { data, error } = await supabase.functions.invoke("tradeplace-availability", {
        body: request
      });
      if (error) throw error;
      return data as AvailabilityResponse;
    }
  });
}

export function usePlaceSupplierOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (supplierOrderId: string) => {
      const { data, error } = await supabase.functions.invoke("tradeplace-order", {
        body: { supplier_order_id: supplierOrderId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-orders"] });
    }
  });
}

export function useRequestOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (supplierOrderId: string): Promise<OrderStatusResponse> => {
      const { data, error } = await supabase.functions.invoke("tradeplace-order-status", {
        body: { supplier_order_id: supplierOrderId }
      });
      if (error) throw error;
      return data as OrderStatusResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-orders"] });
    }
  });
}

export function useCancelSupplierOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ supplierOrderId, reason }: { supplierOrderId: string; reason?: string }): Promise<CancelResponse> => {
      const { data, error } = await supabase.functions.invoke("tradeplace-order-cancel", {
        body: { supplier_order_id: supplierOrderId, reason }
      });
      if (error) throw error;
      return data as CancelResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-orders"] });
    }
  });
}

export function useRequestProductPrices() {
  return useMutation({
    mutationFn: async (request: { supplier_id: string; products: { ean_code: string }[] }): Promise<PriceResponse> => {
      const { data, error } = await supabase.functions.invoke("tradeplace-product-price", {
        body: request
      });
      if (error) throw error;
      return data as PriceResponse;
    }
  });
}

export function useTradeplaceSuppliers() {
  return useQuery({
    queryKey: ["tradeplace-suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    }
  });
}

export function useUpdateSupplierTradeplace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id, tradeplace_enabled, tradeplace_gln, tradeplace_endpoint, tradeplace_tp_id
    }: {
      id: string;
      tradeplace_enabled: boolean;
      tradeplace_gln?: string | null;
      tradeplace_endpoint?: string | null;
      tradeplace_tp_id?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("suppliers")
        .update({ tradeplace_enabled, tradeplace_gln, tradeplace_endpoint, tradeplace_tp_id })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["tradeplace-suppliers"] });
    }
  });
}
