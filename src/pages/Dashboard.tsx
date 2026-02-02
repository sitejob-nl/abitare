import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ActionList } from "@/components/dashboard/ActionList";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { QuickAccess } from "@/components/dashboard/QuickAccess";
import { AgendaToday } from "@/components/dashboard/AgendaToday";
import { ServiceBudget } from "@/components/dashboard/ServiceBudget";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Euro, FileText, Package, Target, Loader2 } from "lucide-react";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const Dashboard = () => {
  const { data: stats, isLoading } = useDashboardStats();

  return (
    <AppLayout title="Dashboard" breadcrumb="Dashboard">
      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          <>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex h-[140px] items-center justify-center rounded-xl border border-border bg-card"
              >
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ))}
          </>
        ) : (
          <>
            <StatCard
              icon={<Euro className="h-5 w-5" />}
              iconVariant="primary"
              value={formatCurrency(stats?.monthlyRevenue || 0)}
              label="Omzet deze maand"
              trend={
                stats?.monthlyRevenueChange !== 0
                  ? {
                      value: `${Math.abs(stats?.monthlyRevenueChange || 0)}%`,
                      direction: (stats?.monthlyRevenueChange || 0) >= 0 ? "up" : "down",
                    }
                  : undefined
              }
              animationDelay={0}
            />
            <StatCard
              icon={<FileText className="h-5 w-5" />}
              iconVariant="accent"
              value={formatCurrency(stats?.openQuotesValue || 0)}
              label={`Openstaande offertes (${stats?.openQuotesCount || 0})`}
              animationDelay={1}
            />
            <StatCard
              icon={<Package className="h-5 w-5" />}
              iconVariant="success"
              value={String(stats?.ordersInProgress || 0)}
              label="Orders in behandeling"
              animationDelay={2}
            />
            <StatCard
              icon={<Target className="h-5 w-5" />}
              iconVariant="warning"
              value={`${stats?.conversionRate || 0}%`}
              label="Conversieratio (90 dagen)"
              animationDelay={3}
            />
          </>
        )}
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px]">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          <ActionList />
          <RecentOrders />
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          <QuickAccess />
          <AgendaToday />
          <ServiceBudget />
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
