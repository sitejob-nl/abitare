import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PortalToken {
  id: string;
  token: string;
  customer_id: string;
  order_id: string | null;
  quote_id: string | null;
  expires_at: string | null;
  created_at: string;
  last_accessed_at: string | null;
  is_active: boolean;
  customer?: {
    id: string;
    first_name: string | null;
    last_name: string;
    company_name: string | null;
    email: string | null;
  };
}

export interface PortalData {
  token: PortalToken;
  customer: {
    id: string;
    first_name: string | null;
    last_name: string;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    mobile: string | null;
  };
  orders: Array<{
    id: string;
    order_number: number;
    status: string | null;
    order_date: string | null;
    expected_delivery_date: string | null;
    expected_installation_date: string | null;
    actual_delivery_date: string | null;
    actual_installation_date: string | null;
    customer_notes: string | null;
    delivery_notes: string | null;
  }>;
  quotes: Array<{
    id: string;
    quote_number: number;
    status: string | null;
    quote_date: string | null;
    valid_until: string | null;
    total_incl_vat: number | null;
  }>;
}

// Validate token and fetch portal data (used in portal pages)
export function usePortalData(token: string | undefined) {
  return useQuery({
    queryKey: ["portal", token],
    queryFn: async (): Promise<PortalData | null> => {
      if (!token) return null;

      // Fetch token with customer data
      const { data: tokenData, error: tokenError } = await supabase
        .from("customer_portal_tokens")
        .select(`
          *,
          customer:customers(id, first_name, last_name, company_name, email, phone, mobile)
        `)
        .eq("token", token)
        .eq("is_active", true)
        .single();

      if (tokenError || !tokenData) {
        console.error("Token validation failed:", tokenError);
        return null;
      }

      // Check expiration
      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        return null;
      }

      const customer = tokenData.customer as PortalData["customer"];

      // Update last_accessed_at (fire and forget)
      supabase
        .from("customer_portal_tokens")
        .update({ last_accessed_at: new Date().toISOString() })
        .eq("id", tokenData.id)
        .then();

      // Fetch orders for customer (read-only fields only)
      const { data: orders } = await supabase
        .from("orders")
        .select(`
          id, order_number, status, order_date,
          expected_delivery_date, expected_installation_date,
          actual_delivery_date, actual_installation_date,
          customer_notes, delivery_notes
        `)
        .eq("customer_id", customer.id)
        .order("order_date", { ascending: false });

      // Fetch quotes for customer
      const { data: quotes } = await supabase
        .from("quotes")
        .select(`
          id, quote_number, status, quote_date, valid_until, total_incl_vat
        `)
        .eq("customer_id", customer.id)
        .order("quote_date", { ascending: false });

      return {
        token: tokenData as PortalToken,
        customer,
        orders: orders || [],
        quotes: quotes || [],
      };
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

// Generate a new portal token (used in admin panel)
export function useCreatePortalToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      orderId,
      quoteId,
      expiresInDays = 30,
    }: {
      customerId: string;
      orderId?: string;
      quoteId?: string;
      expiresInDays?: number;
    }) => {
      // Generate cryptographically strong token
      const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const { data, error } = await supabase
        .from("customer_portal_tokens")
        .insert({
          token,
          customer_id: customerId,
          order_id: orderId || null,
          quote_id: quoteId || null,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["portal-tokens", variables.customerId] });
    },
  });
}

// Fetch all tokens for a customer (admin view)
export function useCustomerPortalTokens(customerId: string | undefined) {
  return useQuery({
    queryKey: ["portal-tokens", customerId],
    queryFn: async () => {
      if (!customerId) return [];

      const { data, error } = await supabase
        .from("customer_portal_tokens")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PortalToken[];
    },
    enabled: !!customerId,
  });
}

// Deactivate a token
export function useDeactivatePortalToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from("customer_portal_tokens")
        .update({ is_active: false })
        .eq("id", tokenId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portal-tokens"] });
    },
  });
}
