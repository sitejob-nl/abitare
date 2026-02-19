import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppTemplate {
  name: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  category: string;
  language: string;
  components: any[];
}

export function useWhatsAppTemplates(enabled = true) {
  return useQuery<WhatsAppTemplate[]>({
    queryKey: ["whatsapp-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("whatsapp-send", {
        body: { action: "templates" },
      });
      if (error) throw error;
      return data.templates ?? [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
