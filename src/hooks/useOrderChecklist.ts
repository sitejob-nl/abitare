import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_CHECKLIST_LABELS = [
  "Tekeningen aanwezig",
  "Inmeting gedaan",
  "Kleur/materiaal bevestigd",
  "Apparatuur gespecificeerd",
  "Blad/werkblad bevestigd",
  "Bijzonderheden genoteerd",
];

export interface ChecklistItem {
  id: string;
  order_id: string;
  label: string;
  checked: boolean;
  checked_by: string | null;
  checked_at: string | null;
  sort_order: number;
}

export function useOrderChecklist(orderId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["order-checklist", orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from("order_checklist_items")
        .select("*")
        .eq("order_id", orderId)
        .order("sort_order");

      if (error) throw error;
      return data as ChecklistItem[];
    },
    enabled: !!orderId,
  });

  const initChecklist = useMutation({
    mutationFn: async (oId: string) => {
      const items = DEFAULT_CHECKLIST_LABELS.map((label, i) => ({
        order_id: oId,
        label,
        sort_order: i,
        checked: false,
      }));
      const { error } = await supabase
        .from("order_checklist_items")
        .insert(items);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-checklist", orderId] });
    },
  });

  const toggleItem = useMutation({
    mutationFn: async ({ itemId, checked }: { itemId: string; checked: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("order_checklist_items")
        .update({
          checked,
          checked_by: checked ? user?.id ?? null : null,
          checked_at: checked ? new Date().toISOString() : null,
        })
        .eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-checklist", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const allChecked = (query.data?.length ?? 0) > 0 && query.data?.every((item) => item.checked);

  return { ...query, initChecklist, toggleItem, allChecked };
}
