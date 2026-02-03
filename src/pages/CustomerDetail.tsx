import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Edit, Loader2 } from "lucide-react";
import { useCustomer } from "@/hooks/useCustomers";
import { useCustomerQuotes } from "@/hooks/useCustomerQuotes";
import { useCustomerOrders } from "@/hooks/useCustomerOrders";
import { CustomerInfoCard } from "@/components/customers/CustomerInfoCard";
import { CustomerQuotesTab } from "@/components/customers/CustomerQuotesTab";
import { CustomerOrdersTab } from "@/components/customers/CustomerOrdersTab";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { QuoteFormDialog } from "@/components/quotes/QuoteFormDialog";

function getDisplayName(
  firstName?: string | null,
  lastName?: string | null,
  companyName?: string | null
): string {
  if (companyName) return companyName;
  return [firstName, lastName].filter(Boolean).join(" ") || "Onbekend";
}

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showNewQuoteDialog, setShowNewQuoteDialog] = useState(false);

  const { data: customer, isLoading: customerLoading } = useCustomer(id);
  const { data: quotes } = useCustomerQuotes(id);
  const { data: orders } = useCustomerOrders(id);

  const quotesCount = quotes?.length || 0;
  const ordersCount = orders?.length || 0;

  if (customerLoading) {
    return (
      <AppLayout title="Klant" breadcrumb="Klant">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!customer) {
    return (
      <AppLayout title="Klant niet gevonden" breadcrumb="Klant">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Klant niet gevonden</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/customers")}>
            Terug naar klanten
          </Button>
        </div>
      </AppLayout>
    );
  }

  const displayName = getDisplayName(customer.first_name, customer.last_name, customer.company_name);

  return (
    <AppLayout title={displayName} breadcrumb={`Klanten / ${displayName}`}>
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 -ml-2 gap-1"
          onClick={() => navigate("/customers")}
        >
          <ArrowLeft className="h-4 w-4" />
          Terug
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-xl md:text-2xl font-semibold text-foreground">
              {displayName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Klantnummer #{customer.customer_number}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Bewerken
            </Button>
            <Button size="sm" onClick={() => setShowNewQuoteDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe offerte
            </Button>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Customer Info */}
        <div className="lg:col-span-1">
          <CustomerInfoCard customer={customer} />
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="quotes" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="quotes" className="gap-1.5">
                Offertes
                {quotesCount > 0 && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {quotesCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-1.5">
                Orders
                {ordersCount > 0 && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {ordersCount}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="quotes" className="mt-4">
              <CustomerQuotesTab customerId={customer.id} />
            </TabsContent>

            <TabsContent value="orders" className="mt-4">
              <CustomerOrdersTab customerId={customer.id} />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialogs */}
      <CustomerFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        customer={customer}
      />
      <QuoteFormDialog
        open={showNewQuoteDialog}
        onOpenChange={setShowNewQuoteDialog}
        customerId={customer.id}
      />
    </AppLayout>
  );
};

export default CustomerDetail;
