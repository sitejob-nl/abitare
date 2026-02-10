import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PortalData {
  token: {
    id: string;
    token: string;
    customer_id: string;
    is_active: boolean;
    expires_at: string | null;
  };
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
    total_incl_vat: number | null;
    amount_paid: number | null;
    payment_status: string | null;
  }>;
}

async function callPortalApi(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portal-data`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Portal API error");
  }

  return response.json();
}

// Validate token and fetch portal data
export function usePortalData(token: string | undefined) {
  return useQuery({
    queryKey: ["portal", token],
    queryFn: async (): Promise<PortalData | null> => {
      if (!token) return null;
      try {
        return await callPortalApi({ action: "get-portal-data", token });
      } catch {
        return null;
      }
    },
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

// Fetch order detail (lines + status history)
export function usePortalOrderDetail(token: string | undefined, orderId: string | undefined) {
  return useQuery({
    queryKey: ["portal-order-detail", token, orderId],
    queryFn: async () => {
      return callPortalApi({ action: "get-order-detail", token, orderId });
    },
    enabled: !!token && !!orderId,
  });
}

// Fetch documents
export function usePortalDocuments(token: string | undefined) {
  return useQuery({
    queryKey: ["portal-documents", token],
    queryFn: async () => {
      return callPortalApi({ action: "get-documents", token });
    },
    enabled: !!token,
  });
}

// Get signed URL for document download
export function usePortalDocumentUrl() {
  return useMutation({
    mutationFn: async ({ token, filePath }: { token: string; filePath: string }) => {
      return callPortalApi({
        action: "get-document-url",
        token,
        data: { filePath },
      });
    },
  });
}

// Submit planning preferences
export function usePortalSubmitPlanning() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      token,
      orderId,
      preferredDate1,
      preferredDate2,
      preferredDate3,
      timePreference,
      remarks,
    }: {
      token: string;
      orderId: string;
      preferredDate1?: string;
      preferredDate2?: string;
      preferredDate3?: string;
      timePreference?: string;
      remarks?: string;
    }) => {
      return callPortalApi({
        action: "submit-planning",
        token,
        data: { orderId, preferredDate1, preferredDate2, preferredDate3, timePreference, remarks },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["portal-has-submitted", variables.token, variables.orderId] });
    },
  });
}

// Check if planning already submitted
export function usePortalHasSubmitted(token: string | undefined, orderId: string | undefined) {
  return useQuery({
    queryKey: ["portal-has-submitted", token, orderId],
    queryFn: async () => {
      const result = await callPortalApi({
        action: "has-submitted-planning",
        token,
        orderId,
      });
      return result.hasSubmitted as boolean;
    },
    enabled: !!token && !!orderId,
  });
}
