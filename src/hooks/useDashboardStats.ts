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

      // Get this month's orders revenue
      const { data: thisMonthOrders } = await supabase
        .from("orders")
        .select("total_incl_vat")
        .gte("order_date", startOfMonth.toISOString().split("T")[0]);

      const monthlyRevenue = thisMonthOrders?.reduce(
        (sum, order) => sum + (order.total_incl_vat || 0),
        0
      ) || 0;

      // Get last month's orders revenue for comparison
      const { data: lastMonthOrders } = await supabase
        .from("orders")
        .select("total_incl_vat")
        .gte("order_date", startOfLastMonth.toISOString().split("T")[0])
        .lte("order_date", endOfLastMonth.toISOString().split("T")[0]);

      const lastMonthRevenue = lastMonthOrders?.reduce(
        (sum, order) => sum + (order.total_incl_vat || 0),
        0
      ) || 0;

      const monthlyRevenueChange = lastMonthRevenue > 0
        ? Math.round(((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : 0;

      // Get open quotes (concept + verstuurd + bekeken)
      const { data: openQuotes } = await supabase
        .from("quotes")
        .select("total_incl_vat")
        .in("status", ["concept", "verstuurd", "bekeken"]);

      const openQuotesValue = openQuotes?.reduce(
        (sum, quote) => sum + (quote.total_incl_vat || 0),
        0
      ) || 0;
      const openQuotesCount = openQuotes?.length || 0;

      // Get orders in progress (not afgerond)
      const { data: inProgressOrders, count: ordersInProgress } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .not("status", "eq", "afgerond");

      // Calculate conversion rate (accepted quotes / total quotes in last 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { data: recentQuotes } = await supabase
        .from("quotes")
        .select("status")
        .gte("quote_date", ninetyDaysAgo.toISOString().split("T")[0])
        .not("status", "eq", "concept");

      const totalQuotes = recentQuotes?.length || 0;
      const acceptedQuotes = recentQuotes?.filter(q => q.status === "geaccepteerd").length || 0;
      const conversionRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;

      return {
        monthlyRevenue,
        monthlyRevenueChange,
        openQuotesValue,
        openQuotesCount,
        ordersInProgress: ordersInProgress || 0,
        conversionRate,
      };
    },
  });
}
