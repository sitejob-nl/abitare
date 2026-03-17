import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ConvertQuoteToOrderResult {
  orderId: string;
  orderNumber: number;
  depositOrderId?: string;
  depositOrderNumber?: number;
}

interface ConvertQuoteToOrderParams {
  quoteId: string;
  depositRequired: boolean;
  depositInvoiceSent: boolean;
  depositReminderDate: string | null;
  depositPercentage?: number;
}

export function useConvertQuoteToOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quoteId,
      depositRequired,
      depositInvoiceSent,
      depositReminderDate,
      depositPercentage = 30,
    }: ConvertQuoteToOrderParams): Promise<ConvertQuoteToOrderResult> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Niet ingelogd");
      }

      const response = await supabase.functions.invoke(
        "convert-quote-to-order",
        {
          body: {
            quoteId,
            depositRequired,
            depositInvoiceSent,
            depositReminderDate,
            depositPercentage,
          },
        }
      );

      if (response.error) {
        throw new Error(
          response.error.message || "Fout bij omzetten naar order"
        );
      }

      const data = response.data;

      if (!data?.success) {
        throw new Error(data?.error || "Fout bij omzetten naar order");
      }

      return {
        orderId: data.order_id,
        orderNumber: data.order_number,
        depositOrderId: data.deposit_order_id || undefined,
        depositOrderNumber: data.deposit_order_number || undefined,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
    },
  });
}
