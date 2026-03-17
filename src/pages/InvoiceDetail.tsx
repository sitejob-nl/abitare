import { useParams, Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { useInvoice } from "@/hooks/useInvoices";
import { supabase } from "@/integrations/supabase/client";
import { PaymentCard } from "@/components/orders/PaymentCard";
import { OrderLinesTable } from "@/components/orders/OrderLinesTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  User,
  MapPin,
  Mail,
  Phone,
  ExternalLink,
  FileText,
  ArrowLeft,
  Building2,
  Download,
} from "lucide-react";
import { generateInvoicePdf } from "@/lib/pdf/invoicePdfGenerator";
import type { InvoiceData, InvoiceLine, InvoiceSection } from "@/lib/pdf/invoicePdfGenerator";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";
import { formatCurrency } from "@/lib/utils";

type PaymentStatus = Database["public"]["Enums"]["payment_status"];

const paymentStatusConfig = {
  open: { label: "Open", variant: "destructive" as const },
  deels_betaald: { label: "Deels betaald", variant: "warning" as const },
  betaald: { label: "Betaald", variant: "success" as const },
};


function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, amountPaid, paymentStatus }: { 
      orderId: string; 
      amountPaid: number; 
      paymentStatus: PaymentStatus;
    }) => {
      const { error } = await supabase
        .from("orders")
        .update({
          amount_paid: amountPaid,
          payment_status: paymentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;
      return { orderId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoice", data.orderId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

const InvoiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: invoice, isLoading } = useInvoice(id);
  const updatePayment = useUpdatePayment();

  const handleRegisterPayment = (amount: number) => {
    if (!invoice) return;
    const newAmountPaid = (invoice.amount_paid || 0) + amount;
    const total = invoice.total_incl_vat || 0;
    let newStatus: "open" | "deels_betaald" | "betaald" = "open";
    
    if (newAmountPaid >= total) {
      newStatus = "betaald";
    } else if (newAmountPaid > 0) {
      newStatus = "deels_betaald";
    }

    updatePayment.mutate({
      orderId: invoice.id,
      amountPaid: newAmountPaid,
      paymentStatus: newStatus,
    });
  };

  if (isLoading) {
    return (
      <AppLayout title="Factuur laden..." breadcrumb="Facturen / ...">
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Skeleton className="h-64 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!invoice) {
    return (
      <AppLayout title="Factuur niet gevonden" breadcrumb="Facturen">
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Factuur niet gevonden</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/invoices">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Terug naar facturen
              </Link>
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const customer = invoice.customers;
  const status = invoice.payment_status || "open";
  const statusConfig = paymentStatusConfig[status];
  const customerName = customer?.company_name || 
    [customer?.first_name, customer?.last_name].filter(Boolean).join(" ");

  const breadcrumb = `Facturen / Order #${invoice.order_number}`;

  const handleExportPdf = () => {
    const invoiceData: InvoiceData = {
      order_number: invoice.order_number,
      order_date: invoice.order_date,
      payment_condition: (invoice as any).payment_condition || null,
      invoice_type: (invoice as any).invoice_type || null,
      parent_order_number: null, // Could be fetched if needed
      total_excl_vat: invoice.total_excl_vat,
      total_vat: invoice.total_vat,
      total_incl_vat: invoice.total_incl_vat,
      amount_paid: invoice.amount_paid,
      payment_status: invoice.payment_status,
      customer: customer ? {
        salutation: null,
        first_name: customer.first_name,
        last_name: customer.last_name,
        company_name: customer.company_name,
        street_address: customer.street_address,
        postal_code: customer.postal_code,
        city: customer.city,
        email: customer.email,
        phone: customer.phone,
      } : null,
      division: invoice.divisions ? { name: invoice.divisions.name } : null,
    };

    const pdfLines: InvoiceLine[] = (invoice.order_lines || [])
      .filter((l: any) => !l.is_group_header)
      .map((l: any) => ({
        description: l.description,
        article_code: l.article_code,
        quantity: l.quantity,
        unit: l.unit,
        unit_price: l.unit_price,
        discount_percentage: l.discount_percentage,
        line_total: l.line_total,
        vat_rate: l.vat_rate,
        is_group_header: l.is_group_header,
        group_title: l.group_title,
        section_type: l.section_type,
      }));

    const pdfSections: InvoiceSection[] = (invoice.order_sections || []).map((s: any) => ({
      title: s.title,
      section_type: s.section_type,
      sort_order: s.sort_order,
      subtotal: s.subtotal,
      discount_percentage: s.discount_percentage,
      discount_amount: s.discount_amount,
      discount_description: s.discount_description,
    }));

    generateInvoicePdf(invoiceData, pdfLines, pdfSections);
  };
  const orderLines = (invoice.order_lines || []).map((line: any) => ({
    id: line.id,
    description: line.description,
    article_code: line.article_code,
    quantity: line.quantity,
    unit: line.unit,
    unit_price: line.unit_price,
    discount_percentage: line.discount_percentage,
    line_total: line.line_total,
    is_group_header: line.is_group_header,
    group_title: line.group_title,
    section_type: line.section_type,
    section_id: line.section_id,
  }));

  const orderSections = (invoice.order_sections || []).map((section: any) => ({
    id: section.id,
    section_type: section.section_type,
    title: section.title,
    sort_order: section.sort_order,
    subtotal: section.subtotal,
    discount_percentage: section.discount_percentage,
    discount_amount: section.discount_amount,
    discount_description: section.discount_description,
  }));

  return (
    <AppLayout 
      title={`Factuur #${invoice.order_number}`} 
      breadcrumb={breadcrumb}
    >
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link to="/invoices">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">
                Order #{invoice.order_number}
              </h1>
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {customerName}
              {invoice.order_date && (
                <span className="ml-2">
                  • {format(new Date(invoice.order_date), "d MMMM yyyy", { locale: nl })}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPdf}>
            <Download className="mr-2 h-4 w-4" />
            PDF Exporteren
          </Button>
          <Button asChild variant="outline">
            <Link to={`/orders/${invoice.id}`}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Bekijk order
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Invoice Lines */}
        <div className="lg:col-span-2 space-y-6">
          <OrderLinesTable lines={orderLines} sections={orderSections} />
          
          {/* Totals Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotaal excl. BTW</span>
                  <span>{formatCurrency(invoice.total_excl_vat)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">BTW</span>
                  <span>{formatCurrency(invoice.total_vat)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-semibold">
                  <span>Totaal incl. BTW</span>
                  <span>{formatCurrency(invoice.total_incl_vat)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Payment & Customer Info */}
        <div className="space-y-6">
          {/* Payment Card */}
          <PaymentCard
            totalInclVat={invoice.total_incl_vat || 0}
            amountPaid={invoice.amount_paid || 0}
            paymentStatus={status}
            onRegisterPayment={handleRegisterPayment}
            isUpdating={updatePayment.isPending}
          />

          {/* Customer Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <User className="h-4 w-4" />
                Klantgegevens
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-medium">{customerName}</p>
                  {customer?.company_name && customer.first_name && (
                    <p className="text-muted-foreground">
                      {customer.first_name} {customer.last_name}
                    </p>
                  )}
                </div>
              </div>

              {(customer?.street_address || customer?.city) && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    {customer.street_address && <p>{customer.street_address}</p>}
                    {(customer.postal_code || customer.city) && (
                      <p>{[customer.postal_code, customer.city].filter(Boolean).join(" ")}</p>
                    )}
                  </div>
                </div>
              )}

              {customer?.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`mailto:${customer.email}`} className="text-primary hover:underline">
                    {customer.email}
                  </a>
                </div>
              )}

              {customer?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`tel:${customer.phone}`} className="text-primary hover:underline">
                    {customer.phone}
                  </a>
                </div>
              )}

              <div className="pt-2 border-t">
                <Link 
                  to={`/customers/${customer?.id}`}
                  className="text-primary hover:underline text-sm"
                >
                  Bekijk klantprofiel →
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Exact Online Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4" />
                Exact Online
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice ID</span>
                <span className="font-mono">
                  {invoice.exact_invoice_id || (
                    <span className="text-muted-foreground italic">Niet gesynchroniseerd</span>
                  )}
                </span>
              </div>
              {invoice.divisions && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Divisie</span>
                  <span>{invoice.divisions.name}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default InvoiceDetail;
