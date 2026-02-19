import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SendWhatsAppParams {
  to: string;
  message?: string;
  type?: "text" | "template";
  template?: {
    name: string;
    language: { code: string };
    components?: unknown[];
  };
  customer_id?: string;
  order_id?: string;
  ticket_id?: string;
}

export function useWhatsApp() {
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: async (params: SendWhatsAppParams) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: params,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_data, variables) => {
      toast({
        title: "WhatsApp verstuurd",
        description: `Bericht verzonden naar ${variables.to}`,
      });
      // Invalidate relevant queries
      if (variables.customer_id) {
        queryClient.invalidateQueries({ queryKey: ["customer-whatsapp-logs", variables.customer_id] });
      }
      if (variables.order_id) {
        queryClient.invalidateQueries({ queryKey: ["communication-log", variables.order_id] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Fout bij versturen",
        description: error.message || "WhatsApp-bericht kon niet worden verstuurd",
        variant: "destructive",
      });
    },
  });

  return { sendMessage };
}
