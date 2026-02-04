import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAssignInstaller() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      installerId,
    }: {
      orderId: string;
      installerId: string | null;
    }) => {
      const { error } = await supabase
        .from("orders")
        .update({ installer_id: installerId })
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
