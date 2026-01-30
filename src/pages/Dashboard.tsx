import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { ActionList } from "@/components/dashboard/ActionList";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { QuickAccess } from "@/components/dashboard/QuickAccess";
import { AgendaToday } from "@/components/dashboard/AgendaToday";
import { ServiceBudget } from "@/components/dashboard/ServiceBudget";
import { Euro, FileText, Package, Target } from "lucide-react";

const Dashboard = () => {
  return (
    <AppLayout title="Dashboard" breadcrumb="Dashboard">
      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Euro className="h-5 w-5" />}
          iconVariant="primary"
          value="€ 284.500"
          label="Omzet deze maand"
          trend={{ value: "12%", direction: "up" }}
          animationDelay={0}
        />
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          iconVariant="accent"
          value="€ 156.200"
          label="Openstaande offertes (12)"
          trend={{ value: "3", direction: "up" }}
          animationDelay={1}
        />
        <StatCard
          icon={<Package className="h-5 w-5" />}
          iconVariant="success"
          value="8"
          label="Orders in behandeling"
          animationDelay={2}
        />
        <StatCard
          icon={<Target className="h-5 w-5" />}
          iconVariant="warning"
          value="68%"
          label="Conversieratio"
          animationDelay={3}
        />
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
