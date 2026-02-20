import { useState } from "react";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { nl } from "date-fns/locale";
import { ClipboardList, Calendar } from "lucide-react";
import { InstallerLayout } from "@/components/installer/InstallerLayout";
import { InstallerOrderCard } from "@/components/installer/InstallerOrderCard";
import { useInstallerOrders } from "@/hooks/useInstallerOrders";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function InstallerDashboard() {
  const { data: orders, isLoading } = useInstallerOrders();
  const [activeTab, setActiveTab] = useState("all");

  // Group orders by date (7-day window is enforced by the database view)
  const groupOrders = () => {
    if (!orders) return { today: [], tomorrow: [], thisWeek: [] };

    const grouped = {
      today: [] as typeof orders,
      tomorrow: [] as typeof orders,
      thisWeek: [] as typeof orders,
    };

    orders.forEach((order) => {
      const date = order.expected_installation_date
        ? parseISO(order.expected_installation_date)
        : null;

      if (!date) {
        grouped.thisWeek.push(order);
      } else if (isToday(date)) {
        grouped.today.push(order);
      } else if (isTomorrow(date)) {
        grouped.tomorrow.push(order);
      } else {
        grouped.thisWeek.push(order);
      }
    });

    return grouped;
  };

  const grouped = groupOrders();

  const filteredOrders =
    activeTab === "all"
      ? orders
      : activeTab === "today"
      ? grouped.today
      : activeTab === "tomorrow"
      ? grouped.tomorrow
      : grouped.thisWeek;

  return (
    <InstallerLayout>
      <div className="mx-auto max-w-2xl px-4 py-4 sm:px-6 sm:py-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold">Mijn Opdrachten</h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: nl })}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="mb-4 sm:mb-6 grid grid-cols-3 gap-2 sm:gap-3">
          <Card className="p-3 sm:p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {grouped.today.length}
            </div>
            <div className="text-xs text-muted-foreground">Vandaag</div>
          </Card>
          <Card className="p-3 sm:p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">
              {grouped.tomorrow.length}
            </div>
            <div className="text-xs text-muted-foreground">Morgen</div>
          </Card>
          <Card className="p-3 sm:p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {grouped.thisWeek.length}
            </div>
            <div className="text-xs text-muted-foreground">Deze week</div>
          </Card>
        </div>

        {/* Info text */}
        <p className="mb-4 text-xs text-muted-foreground">
          Je ziet alleen opdrachten voor de komende 7 dagen.
        </p>

        {/* Filter Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              Alles ({orders?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="today" className="text-xs sm:text-sm">
              Vandaag
            </TabsTrigger>
            <TabsTrigger value="tomorrow" className="text-xs sm:text-sm">
              Morgen
            </TabsTrigger>
            <TabsTrigger value="week" className="text-xs sm:text-sm">
              Week
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Order List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="mb-2 h-5 w-24" />
                <Skeleton className="mb-3 h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </Card>
            ))}
          </div>
        ) : filteredOrders && filteredOrders.length > 0 ? (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <InstallerOrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center justify-center p-12 text-center">
            <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 font-semibold">Geen opdrachten</h3>
            <p className="text-sm text-muted-foreground">
              {activeTab === "all"
                ? "Je hebt momenteel geen toegewezen opdrachten"
                : `Geen opdrachten voor ${
                    activeTab === "today"
                      ? "vandaag"
                      : activeTab === "tomorrow"
                      ? "morgen"
                      : "deze week"
                  }`}
            </p>
          </Card>
        )}
      </div>
    </InstallerLayout>
  );
}
