import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUpdateEventDate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      field,
      date,
    }: {
      orderId: string;
      field: "expected_delivery_date" | "expected_installation_date";
      date: string;
    }) => {
      const { error } = await supabase
        .from("orders")
        .update({ [field]: date })
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-conflicts"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
