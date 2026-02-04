import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";

export interface ConflictInfo {
  installerId: string;
  installerName: string;
  date: string;
  orderCount: number;
  orderIds: string[];
}

// Detect conflicts: same installer assigned to multiple orders on the same day
export function useCalendarConflicts(month: Date) {
  // Fetch 3 months range for better UX
  const start = startOfMonth(subMonths(month, 1));
  const end = endOfMonth(addMonths(month, 1));

  return useQuery({
    queryKey: ["calendar-conflicts", format(start, "yyyy-MM"), format(end, "yyyy-MM")],
    queryFn: async () => {
      // Get all orders with installers in date range
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          installer_id,
          expected_installation_date,
          installer:profiles!orders_installer_id_fkey(id, full_name)
        `)
        .not("installer_id", "is", null)
        .not("expected_installation_date", "is", null)
        .gte("expected_installation_date", format(start, "yyyy-MM-dd"))
        .lte("expected_installation_date", format(end, "yyyy-MM-dd"));

      if (error) throw error;

      // Group by installer + date to find conflicts
      const groupedByInstallerDate = new Map<string, {
        installerId: string;
        installerName: string;
        date: string;
        orderIds: string[];
      }>();

      orders?.forEach((order) => {
        const installerData = order.installer as { id: string; full_name: string | null } | { id: string; full_name: string | null }[] | null;
        const installer = Array.isArray(installerData) ? installerData[0] : installerData;
        if (!installer || !order.expected_installation_date) return;

        const key = `${order.installer_id}-${order.expected_installation_date}`;
        
        if (!groupedByInstallerDate.has(key)) {
          groupedByInstallerDate.set(key, {
            installerId: order.installer_id!,
            installerName: installer.full_name || "Onbekend",
            date: order.expected_installation_date,
            orderIds: [],
          });
        }
        
        groupedByInstallerDate.get(key)!.orderIds.push(order.id);
      });

      // Filter to only conflicts (2+ orders)
      const conflicts: ConflictInfo[] = [];
      
      groupedByInstallerDate.forEach((value) => {
        if (value.orderIds.length > 1) {
          conflicts.push({
            ...value,
            orderCount: value.orderIds.length,
          });
        }
      });

      return conflicts;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Check if a specific date has conflicts for display purposes
export function useHasConflict(conflicts: ConflictInfo[] | undefined, date: string): ConflictInfo | undefined {
  return conflicts?.find((c) => c.date === date);
}
