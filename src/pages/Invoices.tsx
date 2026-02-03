import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useInvoices, useInvoiceStats } from "@/hooks/useInvoices";
import { useSyncInvoices, useExactOnlineConnections } from "@/hooks/useExactOnline";
import { useDivisions } from "@/hooks/useDivisions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Euro, AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw, Upload, Download, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Link } from "react-router-dom";

function formatCurrency(amount: number | null): string {
  if (amount === null) return "€ 0";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
}

const paymentStatusConfig = {
  open: { label: "Open", variant: "destructive" as const, icon: AlertCircle },
  deels_betaald: { label: "Deels betaald", variant: "warning" as const, icon: Clock },
  betaald: { label: "Betaald", variant: "success" as const, icon: CheckCircle2 },
};

const Invoices = () => {
  const { data: invoices, isLoading } = useInvoices();
  const { data: stats } = useInvoiceStats();
  const { data: connections } = useExactOnlineConnections();
  const { data: divisions } = useDivisions();
  const syncInvoices = useSyncInvoices();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Get active connection's division
  const activeConnection = connections?.find(c => c.is_active);
  const connectedDivision = divisions?.find(d => d.id === activeConnection?.division_id);
  const hasExactConnection = !!activeConnection;

  const handlePushInvoices = () => {
    if (!activeConnection?.division_id) return;
    syncInvoices.mutate({
      action: "push",
      divisionId: activeConnection.division_id,
    });
  };

  const handlePullStatus = () => {
    if (!activeConnection?.division_id) return;
    syncInvoices.mutate({
      action: "pull_status",
      divisionId: activeConnection.division_id,
    });
  };

  const handleFullSync = () => {
    if (!activeConnection?.division_id) return;
    syncInvoices.mutate({
      action: "sync",
      divisionId: activeConnection.division_id,
    });
  };

  const filteredInvoices = invoices?.filter((invoice) => {
    const matchesSearch =
      invoice.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.order_number.toString().includes(searchQuery) ||
      invoice.exact_invoice_id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || invoice.payment_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout title="Facturen" breadcrumb="Facturen">
      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Openstaand
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(stats?.totalOutstanding || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {(stats?.countOpen || 0) + (stats?.countPartial || 0)} facturen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open
            </CardTitle>
            <Euro className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalOpen || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.countOpen || 0} facturen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deels betaald
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalPartial || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.countPartial || 0} facturen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Betaald
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(stats?.totalPaid || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.countPaid || 0} facturen
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Zoek op klant, ordernummer of factuurnummer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Alle statussen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statussen</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="deels_betaald">Deels betaald</SelectItem>
              <SelectItem value="betaald">Betaald</SelectItem>
            </SelectContent>
          </Select>

          {hasExactConnection && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={syncInvoices.isPending}>
                  {syncInvoices.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Exact Online
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleFullSync}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Volledige synchronisatie
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePushInvoices}>
                  <Upload className="mr-2 h-4 w-4" />
                  Facturen naar Exact
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePullStatus}>
                  <Download className="mr-2 h-4 w-4" />
                  Betalingen ophalen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredInvoices?.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
              <Euro className="mb-2 h-10 w-10" />
              <p>Geen facturen gevonden</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Klant</TableHead>
                  <TableHead>Vestiging</TableHead>
                  <TableHead className="text-right">Bedrag</TableHead>
                  <TableHead className="text-right">Betaald</TableHead>
                  <TableHead className="text-right">Openstaand</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Exact ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices?.map((invoice) => {
                  const status = invoice.payment_status || "open";
                  const config = paymentStatusConfig[status];
                  const StatusIcon = config.icon;
                  const outstanding = (invoice.total_incl_vat || 0) - (invoice.amount_paid || 0);

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Link
                          to={`/orders`}
                          className="font-medium text-primary hover:underline"
                        >
                          #{invoice.order_number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {invoice.order_date
                          ? format(new Date(invoice.order_date), "d MMM yyyy", {
                              locale: nl,
                            })
                          : "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {invoice.customer_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invoice.division_name || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.total_incl_vat)}
                      </TableCell>
                      <TableCell className="text-right text-success">
                        {formatCurrency(invoice.amount_paid)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            outstanding > 0 ? "font-medium text-destructive" : ""
                          }
                        >
                          {formatCurrency(outstanding)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {invoice.exact_invoice_id || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Invoices;
