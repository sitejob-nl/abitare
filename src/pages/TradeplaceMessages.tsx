import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, ArrowUpRight, ArrowDownLeft, FileCode2, X } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useTradeplaceMessages, useTradeplaceMessageTypes } from "@/hooks/useTradeplaceMessages";
import { useTradeplaceSuppliers } from "@/hooks/useTradeplace";

const TradeplaceMessages = () => {
  const [messageType, setMessageType] = useState<string>("all");
  const [supplierId, setSupplierId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [selectedXml, setSelectedXml] = useState<string | null>(null);

  const { data: messages, isLoading } = useTradeplaceMessages({
    messageType: messageType !== "all" ? messageType : undefined,
    supplierId: supplierId !== "all" ? supplierId : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });
  const { data: messageTypes } = useTradeplaceMessageTypes();
  const { data: suppliers } = useTradeplaceSuppliers();

  const hasFilters = messageType !== "all" || supplierId !== "all" || dateFrom || dateTo;

  const clearFilters = () => {
    setMessageType("all");
    setSupplierId("all");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <AppLayout title="Tradeplace Berichten" breadcrumb="Instellingen / Tradeplace Berichten">
      <div className="space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1 min-w-[160px]">
                <label className="text-xs text-muted-foreground">Berichttype</label>
                <Select value={messageType} onValueChange={setMessageType}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Alle types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle types</SelectItem>
                    {messageTypes?.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 min-w-[160px]">
                <label className="text-xs text-muted-foreground">Leverancier</label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Alle leveranciers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle leveranciers</SelectItem>
                    {suppliers?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Vanaf</label>
                <Input
                  type="date"
                  className="h-9 w-[150px]"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Tot</label>
                <Input
                  type="date"
                  className="h-9 w-[150px]"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                  <X className="h-4 w-4 mr-1" /> Wis filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCode2 className="h-4 w-4" />
              Berichtenlog
              {messages && (
                <Badge variant="secondary" className="ml-2 font-normal">
                  {messages.length} berichten
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !messages?.length ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Geen berichten gevonden
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Datum</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Leverancier</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead className="w-[80px]">XML</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((msg) => {
                    const supplierName = (msg.supplier as any)?.name || "–";
                    const meta = msg.metadata as Record<string, any> | null;
                    const details = meta
                      ? Object.entries(meta)
                          .filter(([k]) => !["supplier_name"].includes(k))
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ")
                      : "";

                    return (
                      <TableRow key={msg.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {msg.created_at
                            ? format(new Date(msg.created_at), "dd MMM yyyy HH:mm", { locale: nl })
                            : "–"}
                        </TableCell>
                        <TableCell>
                          {msg.direction === "outbound" ? (
                            <ArrowUpRight className="h-4 w-4 text-primary" />
                          ) : (
                            <ArrowDownLeft className="h-4 w-4 text-accent" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {msg.message_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{supplierName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                          {details || "–"}
                        </TableCell>
                        <TableCell>
                          {msg.raw_xml && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setSelectedXml(msg.raw_xml)}
                            >
                              Bekijk
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* XML Detail Dialog */}
      <Dialog open={!!selectedXml} onOpenChange={() => setSelectedXml(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>XML Bericht</DialogTitle>
          </DialogHeader>
          <pre className="overflow-auto rounded-lg bg-muted p-4 text-xs font-mono max-h-[60vh] whitespace-pre-wrap">
            {selectedXml}
          </pre>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default TradeplaceMessages;
