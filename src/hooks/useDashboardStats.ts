import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStats {
  monthlyRevenue: number;
  monthlyRevenueChange: number;
  openQuotesValue: number;
  openQuotesCount: number;
  ordersInProgress: number;
  conversionRate: number;
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async (): Promise<DashboardStats> => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // Run all queries in parallel for better performance
      const [
        thisMonthOrdersResult,
        lastMonthOrdersResult,
        openQuotesResult,
        inProgressOrdersResult,
        recentQuotesResult,
      ] = await Promise.all([
        // This month's orders revenue
        supabase
          .from("orders")
          .select("total_incl_vat")
          .gte("order_date", startOfMonth.toISOString().split("T")[0]),
        
        // Last month's orders revenue for comparison
        supabase
          .from("orders")
          .select("total_incl_vat")
          .gte("order_date", startOfLastMonth.toISOString().split("T")[0])
          .lte("order_date", endOfLastMonth.toISOString().split("T")[0]),
        
        // Open quotes (concept + verstuurd + bekeken)
        supabase
          .from("quotes")
          .select("total_incl_vat")
          .in("status", ["concept", "verstuurd", "bekeken"]),
        
        // Orders in progress (not afgerond)
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .not("status", "eq", "afgerond"),
        
        // Recent quotes for conversion rate (last 90 days, excluding concept)
        supabase
          .from("quotes")
          .select("status")
          .gte("quote_date", ninetyDaysAgo.toISOString().split("T")[0])
          .not("status", "eq", "concept"),
      ]);

      const monthlyRevenue = thisMonthOrdersResult.data?.reduce(
        (sum, order) => sum + (order.total_incl_vat || 0),
        0
      ) || 0;

      const lastMonthRevenue = lastMonthOrdersResult.data?.reduce(
        (sum, order) => sum + (order.total_incl_vat || 0),
        0
      ) || 0;

      const monthlyRevenueChange = lastMonthRevenue > 0
        ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : 0;

      const openQuotesValue = openQuotesResult.data?.reduce(
        (sum, quote) => sum + (quote.total_incl_vat || 0),
        0
      ) || 0;
      const openQuotesCount = openQuotesResult.data?.length || 0;

      const ordersInProgress = inProgressOrdersResult.count || 0;

      const totalQuotes = recentQuotesResult.data?.length || 0;
      const acceptedQuotes = recentQuotesResult.data?.filter(q => q.status === "geaccepteerd").length || 0;
      const conversionRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;

      return {
        monthlyRevenue,
        monthlyRevenueChange,
        openQuotesValue,
        openQuotesCount,
        ordersInProgress,
        conversionRate,
      };
    },
    staleTime: 30000, // 30 seconds - dashboard stats don't need to refresh too often
  });
}
