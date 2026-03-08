import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2, ExternalLink, Calendar } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { useOrder } from "@/hooks/useOrders";
import { formatCurrency } from "@/lib/utils";
import { useUpdateOrderStatus, useRegisterPayment, useUploadOrderDocument, useDeleteOrderDocument, useAddOrderNote, useDeleteOrderNote, useUpdateOrderDates, useUpdateOrderAddresses } from "@/hooks/useOrderMutations";
import { useInstallers } from "@/hooks/useInstallers";
import { useAssignInstaller } from "@/hooks/useAssignInstaller";
import { OrderStatusSelect } from "@/components/orders/OrderStatusSelect";
import { PaymentCard } from "@/components/orders/PaymentCard";
import { DocumentsCard } from "@/components/orders/DocumentsCard";
import { OrderInfoCard } from "@/components/orders/OrderInfoCard";
import { OrderAddressesCard, type OrderAddresses } from "@/components/orders/OrderAddressesCard";
import { OrderLinesTable } from "@/components/orders/OrderLinesTable";
import { NotesCard } from "@/components/orders/NotesCard";
import { StatusHistoryCard } from "@/components/orders/StatusHistoryCard";
import { SupplierOrdersCard } from "@/components/orders/SupplierOrdersCard";
import { SupplierLineGroups } from "@/components/orders/SupplierLineGroups";
import { PortalTokenGenerator } from "@/components/orders/PortalTokenGenerator";
import { ChecklistCard } from "@/components/orders/ChecklistCard";
import { OrderCommunicationTab } from "@/components/orders/OrderCommunicationTab";
import { ScheduleOutlookEvent } from "@/components/orders/ScheduleOutlookEvent";
import { useOrderChecklist } from "@/hooks/useOrderChecklist";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];


function getCustomerName(customer: { first_name?: string | null; last_name?: string | null; company_name?: string | null } | null): string {
  if (!customer) return "Onbekend";
  if (customer.company_name) return customer.company_name;
  return [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Onbekend";
}

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading, error } = useOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const registerPayment = useRegisterPayment();
  const uploadDocument = useUploadOrderDocument();
  const deleteDocument = useDeleteOrderDocument();
  const addNote = useAddOrderNote();
  const deleteNote = useDeleteOrderNote();
  const updateDates = useUpdateOrderDates();
  const updateAddresses = useUpdateOrderAddresses();
  const { allChecked: checklistComplete } = useOrderChecklist(id);
  const { data: installers } = useInstallers();
  const assignInstaller = useAssignInstaller();
  useEffect(() => {
    if (error) {
      toast({
        title: "Order niet gevonden",
        description: "De order bestaat niet of je hebt geen toegang.",
        variant: "destructive",
      });
      navigate("/orders");
    }
  }, [error, navigate]);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!id || !order) return;

    try {
      await updateStatus.mutateAsync({
        orderId: id,
        status: newStatus,
        gateContext: {
          currentStatus: order.status,
          paymentStatus: order.payment_status,
          depositRequired: (order as any).deposit_required !== false,
          depositInvoiceSent: !!(order as any).deposit_invoice_sent,
          checklistComplete: checklistComplete ?? undefined,
          hasInstallationAddress: !!(order as any).installation_street_address,
          hasDocuments: ((order as any).order_documents?.length || 0) > 0,
        },
      });
      toast({
        title: "Status bijgewerkt",
        description: `De status is gewijzigd.`,
      });
    } catch (error) {
      toast({
        title: "Fout bij bijwerken",
        description: "De status kon niet worden bijgewerkt.",
        variant: "destructive",
      });
    }
  };

  const handleRegisterPayment = async (amount: number) => {
    if (!id || !order) return;

    try {
      await registerPayment.mutateAsync({
        orderId: id,
        amount,
        currentAmountPaid: order.amount_paid || 0,
        totalInclVat: order.total_incl_vat || 0,
      });
      toast({
        title: "Betaling geregistreerd",
        description: `${formatCurrency(amount)} is toegevoegd.`,
      });
    } catch (error) {
      toast({
        title: "Fout bij registreren",
        description: "De betaling kon niet worden geregistreerd.",
        variant: "destructive",
      });
    }
  };

  const handleUploadDocument = async (
    file: File,
    documentType: string,
    title?: string,
    visibleToCustomer?: boolean,
    visibleToInstaller?: boolean
  ) => {
    if (!id) return;

    try {
      await uploadDocument.mutateAsync({
        orderId: id,
        file,
        documentType,
        title,
        visibleToCustomer,
        visibleToInstaller,
      });
      toast({
        title: "Document geüpload",
        description: `"${title || file.name}" is toegevoegd.`,
      });
    } catch (error) {
      toast({
        title: "Fout bij uploaden",
        description: "Het document kon niet worden geüpload.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDocument = async (documentId: string, filePath: string) => {
    if (!id) return;

    try {
      await deleteDocument.mutateAsync({ documentId, filePath, orderId: id });
      toast({
        title: "Document verwijderd",
        description: "Het document is verwijderd.",
      });
    } catch (error) {
      toast({
        title: "Fout bij verwijderen",
        description: "Het document kon niet worden verwijderd.",
        variant: "destructive",
      });
    }
  };

  const handleAddNote = async (content: string, noteType: string) => {
    if (!id) return;

    try {
      await addNote.mutateAsync({ orderId: id, content, noteType });
      toast({
        title: "Notitie toegevoegd",
        description: "De notitie is opgeslagen.",
      });
    } catch (error) {
      toast({
        title: "Fout bij toevoegen",
        description: "De notitie kon niet worden toegevoegd.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!id) return;

    try {
      await deleteNote.mutateAsync({ noteId, orderId: id });
      toast({
        title: "Notitie verwijderd",
        description: "De notitie is verwijderd.",
      });
    } catch (error) {
      toast({
        title: "Fout bij verwijderen",
        description: "De notitie kon niet worden verwijderd.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateDeliveryDate = async (date: Date | null) => {
    if (!id) return;

    try {
      await updateDates.mutateAsync({
        orderId: id,
        expectedDeliveryDate: date ? date.toISOString().split("T")[0] : null,
      });
      toast({
        title: "Leverdatum bijgewerkt",
        description: date ? `Leverdatum ingesteld op ${date.toLocaleDateString("nl-NL")}.` : "Leverdatum verwijderd.",
      });
    } catch (error) {
      toast({
        title: "Fout bij bijwerken",
        description: "De leverdatum kon niet worden bijgewerkt.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateInstallationDate = async (date: Date | null) => {
    if (!id) return;

    try {
      await updateDates.mutateAsync({
        orderId: id,
        expectedInstallationDate: date ? date.toISOString().split("T")[0] : null,
      });
      toast({
        title: "Montagedatum bijgewerkt",
        description: date ? `Montagedatum ingesteld op ${date.toLocaleDateString("nl-NL")}.` : "Montagedatum verwijderd.",
      });
    } catch (error) {
      toast({
        title: "Fout bij bijwerken",
        description: "De montagedatum kon niet worden bijgewerkt.",
        variant: "destructive",
      });
    }
  };

  const handleSaveAddresses = async (addressUpdate: Partial<OrderAddresses>) => {
    if (!id) return;
    try {
      await updateAddresses.mutateAsync({ orderId: id, addresses: addressUpdate });
      toast({ title: "Adres bijgewerkt", description: "Het adres is opgeslagen." });
    } catch {
      toast({ title: "Fout bij opslaan", description: "Het adres kon niet worden opgeslagen.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Order" breadcrumb="Order laden...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!order) {
    return null;
  }

  const customer = order.customer as any;
  const division = order.division as any;
  const orderLines = (order.order_lines || []) as any[];
  const documents = (order as any).order_documents || [];
  const notes = (order as any).order_notes || [];
  const statusHistory = (order as any).order_status_history || [];
  const quote = order.quote as { id: string; quote_number: number } | null;

  return (
    <AppLayout
      title={`Order #${order.order_number}`}
      breadcrumb={`Orders / #${order.order_number}`}
    >
      {/* Header */}
      <div className="mb-4 sm:mb-6 flex flex-col gap-4">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/orders")} className="flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="font-display text-xl sm:text-2xl font-semibold text-foreground">
                Order #{order.order_number}
              </h1>
              <OrderStatusSelect
                status={order.status as OrderStatus}
                onStatusChange={handleStatusChange}
                isUpdating={updateStatus.isPending}
                gateContext={{
                  currentStatus: order.status,
                  paymentStatus: order.payment_status,
                  depositRequired: (order as any).deposit_required !== false,
                  depositInvoiceSent: !!(order as any).deposit_invoice_sent,
                  checklistComplete: checklistComplete ?? undefined,
                  hasInstallationAddress: !!(order as any).installation_street_address,
                  hasDocuments: ((order as any).order_documents?.length || 0) > 0,
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {getCustomerName(customer)}
              {quote && (
                <>
                  {" • "}
                  <Link to={`/quotes/${quote.id}`} className="hover:underline">
                    Offerte #{quote.quote_number}
                    <ExternalLink className="ml-1 inline h-3 w-3" />
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pl-0 sm:pl-14">
          <div className="flex items-center gap-2 flex-wrap">
            <PortalTokenGenerator
              customerId={order.customer_id}
              orderId={order.id}
              customerName={getCustomerName(customer)}
            />
            <ScheduleOutlookEvent
              orderId={order.id}
              orderNumber={order.order_number}
              customerName={getCustomerName(customer)}
              installationAddress={
                [(order as any).installation_street_address, (order as any).installation_postal_code, (order as any).installation_city]
                  .filter(Boolean)
                  .join(", ") || undefined
              }
              outlookEventId={(order as any).outlook_event_id}
              expectedInstallationDate={order.expected_installation_date}
            />
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs text-muted-foreground">Totaal incl. BTW</p>
            <p className="text-xl font-semibold text-foreground">
              {formatCurrency(order.total_incl_vat)}
            </p>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3 overflow-hidden">
        {/* Main content - Order lines and Supplier orders */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <OrderLinesTable 
            lines={orderLines} 
            sections={(order as any).order_sections || []}
          />
          <SupplierLineGroups
            orderId={order.id}
            lines={orderLines}
          />
          <SupplierOrdersCard 
            orderId={order.id} 
            orderLines={orderLines.map(line => ({
              id: line.id,
              product_id: line.product_id,
              description: line.description,
              quantity: line.quantity,
              unit_price: line.unit_price,
              supplier_id: line.supplier_id
            }))}
          />
          <OrderCommunicationTab
            orderId={order.id}
            customerId={order.customer_id}
            customerEmail={customer?.email}
            customerName={getCustomerName(customer)}
            customerPhone={customer?.mobile || customer?.phone}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <OrderInfoCard
            customer={customer}
            division={division}
            orderDate={order.order_date}
            expectedDeliveryDate={order.expected_delivery_date}
            expectedInstallationDate={order.expected_installation_date}
            forecastWeek={(order as any).forecast_week}
            onUpdateDeliveryDate={handleUpdateDeliveryDate}
            onUpdateInstallationDate={handleUpdateInstallationDate}
            onUpdateForecastWeek={async (week) => {
              if (!id) return;
              try {
                await updateDates.mutateAsync({ orderId: id, forecastWeek: week });
                toast({ title: "Prognose bijgewerkt", description: week ? `Prognose ingesteld op ${week}.` : "Prognose verwijderd." });
              } catch {
                toast({ title: "Fout bij bijwerken", description: "De prognose kon niet worden bijgewerkt.", variant: "destructive" });
              }
            }}
            isUpdating={updateDates.isPending}
            installerId={(order as any).installer_id}
            installers={installers}
            onAssignInstaller={async (instId) => {
              if (!id) return;
              try {
                await assignInstaller.mutateAsync({ orderId: id, installerId: instId });
                toast({ title: "Monteur bijgewerkt", description: instId ? "Monteur toegewezen." : "Monteur verwijderd." });
              } catch {
                toast({ title: "Fout bij toewijzen", description: "De monteur kon niet worden bijgewerkt.", variant: "destructive" });
              }
            }}
          />

          <OrderAddressesCard
            addresses={{
              installation_street_address: (order as any).installation_street_address,
              installation_postal_code: (order as any).installation_postal_code,
              installation_city: (order as any).installation_city,
              delivery_street_address: (order as any).delivery_street_address,
              delivery_postal_code: (order as any).delivery_postal_code,
              delivery_city: (order as any).delivery_city,
              invoice_street_address: (order as any).invoice_street_address,
              invoice_postal_code: (order as any).invoice_postal_code,
              invoice_city: (order as any).invoice_city,
            }}
            customer={customer}
            onSave={handleSaveAddresses}
            isSaving={updateAddresses.isPending}
          />

          <PaymentCard
            totalInclVat={order.total_incl_vat || 0}
            amountPaid={order.amount_paid || 0}
            paymentStatus={(order.payment_status || "open") as PaymentStatus}
            onRegisterPayment={handleRegisterPayment}
            isUpdating={registerPayment.isPending}
          />

          <ChecklistCard orderId={order.id} />

          <DocumentsCard
            documents={documents}
            onUpload={handleUploadDocument}
            onDelete={handleDeleteDocument}
            isUploading={uploadDocument.isPending}
            isDeleting={deleteDocument.isPending}
          />

          <NotesCard
            notes={notes}
            onAdd={handleAddNote}
            onDelete={handleDeleteNote}
            isAdding={addNote.isPending}
            isDeleting={deleteNote.isPending}
          />

          <StatusHistoryCard history={statusHistory} />
        </div>
      </div>
    </AppLayout>
  );
};

export default OrderDetail;
