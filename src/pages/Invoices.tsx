import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useInvoices, useInvoiceStats } from "@/hooks/useInvoices";
import { useSyncInvoices, useExactOnlineConnections } from "@/hooks/useExactOnline";
import { useDivisions } from "@/hooks/useDivisions";
import { useAuth } from "@/contexts/AuthContext";
import { CreateInvoiceDialog } from "@/components/invoices/CreateInvoiceDialog";
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
import { Search, Euro, AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw, Upload, Download, ChevronDown, Plus } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Link, useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";

const invoiceTypeLabels: Record<string, string> = {
  standaard: "Standaard",
  aanbetaling: "Aanbetaling",
  restbetaling: "Restbetaling",
  meerwerk: "Meerwerk",
  creditnota: "Creditnota",
};

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
  const navigate = useNavigate();
  const { activeDivisionId, setActiveDivisionId, isAdmin } = useAuth();
  
  // Local division filter synced with global state
  const divisionFilter = activeDivisionId || "all";
  const setDivisionFilter = (value: string) => {
    setActiveDivisionId(value === "all" ? null : value);
  };

  const { data: invoices, isLoading } = useInvoices({ divisionId: divisionFilter === "all" ? null : divisionFilter });
  const { data: stats } = useInvoiceStats({ divisionId: divisionFilter === "all" ? null : divisionFilter });
  const { data: connections } = useExactOnlineConnections();
  const { data: divisions } = useDivisions();
  const syncInvoices = useSyncInvoices();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Get active connection's division
  const activeConnection = connections?.find(c => c.is_active);
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
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Openstaand
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-destructive">
              {formatCurrency(stats?.totalOutstanding || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {(stats?.countOpen || 0) + (stats?.countPartial || 0)} facturen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Open
            </CardTitle>
            <Euro className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">
              {formatCurrency(stats?.totalOpen || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.countOpen || 0} facturen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Deels betaald
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">
              {formatCurrency(stats?.totalPartial || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.countPartial || 0} facturen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Betaald
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold text-success">
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
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Zoek op klant, ordernummer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {isAdmin && (
            <Select value={divisionFilter} onValueChange={setDivisionFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Alle vestigingen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle vestigingen</SelectItem>
                {divisions?.map((division) => (
                  <SelectItem key={division.id} value={division.id}>
                    {division.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Alle statussen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle statussen</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="deels_betaald">Deels betaald</SelectItem>
              <SelectItem value="betaald">Betaald</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => setShowCreateDialog(true)} className="shrink-0">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Factuur</span>
          </Button>

          {hasExactConnection && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={syncInvoices.isPending} className="shrink-0">
                  {syncInvoices.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 sm:mr-2" />
                  )}
                  <span className="hidden sm:inline">Exact Online</span>
                  <ChevronDown className="ml-1 sm:ml-2 h-4 w-4" />
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

      <CreateInvoiceDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />

      {/* Content */}
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
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Type</TableHead>
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
                        <TableRow 
                          key={invoice.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                        >
                          <TableCell>
                            <Link
                              to={`/invoices/${invoice.id}`}
                              className="font-medium text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              #{invoice.order_number}
                            </Link>
                          </TableCell>
                          <TableCell>
                            {invoice.invoice_type ? (
                              <Badge variant="outline" className="text-xs">
                                {invoiceTypeLabels[invoice.invoice_type] || invoice.invoice_type}
                              </Badge>
                            ) : "-"}
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
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-border">
                {filteredInvoices?.map((invoice) => {
                  const status = invoice.payment_status || "open";
                  const config = paymentStatusConfig[status];
                  const StatusIcon = config.icon;
                  const outstanding = (invoice.total_incl_vat || 0) - (invoice.amount_paid || 0);

                  return (
                    <Link 
                      key={invoice.id} 
                      to={`/invoices/${invoice.id}`}
                      className="block p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="font-medium text-primary">
                            Order #{invoice.order_number}
                          </span>
                          <div className="text-sm font-medium text-foreground mt-0.5">
                            {invoice.customer_name}
                          </div>
                        </div>
                        <Badge variant={config.variant} className="gap-1 shrink-0">
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border-light text-xs">
                        <div>
                          <span className="text-muted-foreground">Bedrag</span>
                          <div className="font-medium">{formatCurrency(invoice.total_incl_vat)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Betaald</span>
                          <div className="font-medium text-success">{formatCurrency(invoice.amount_paid)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Open</span>
                          <div className={outstanding > 0 ? "font-medium text-destructive" : "font-medium"}>
                            {formatCurrency(outstanding)}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {invoice.order_date
                          ? format(new Date(invoice.order_date), "d MMM yyyy", { locale: nl })
                          : "-"}
                        {invoice.division_name && ` • ${invoice.division_name}`}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Invoices;
