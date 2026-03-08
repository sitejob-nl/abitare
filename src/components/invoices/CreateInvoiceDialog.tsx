import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCustomers } from "@/hooks/useCustomers";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Trash2, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

type InvoiceType = "standaard" | "aanbetaling" | "restbetaling" | "meerwerk" | "creditnota";

const invoiceTypeLabels: Record<InvoiceType, string> = {
  standaard: "Standaard factuur",
  aanbetaling: "Aanbetalingsfactuur",
  restbetaling: "Restbetaling",
  meerwerk: "Meerwerk",
  creditnota: "Creditnota",
};

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentOrderId?: string;
  defaultInvoiceType?: InvoiceType;
  defaultCustomerId?: string;
}

export function CreateInvoiceDialog({ open, onOpenChange, parentOrderId, defaultInvoiceType, defaultCustomerId }: CreateInvoiceDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { activeDivisionId, user } = useAuth();
  const { data: customers } = useCustomers();
  
  const [customerId, setCustomerId] = useState<string>(defaultCustomerId || "");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentCondition, setPaymentCondition] = useState("14 dagen");
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(defaultInvoiceType || "standaard");
  const [internalNotes, setInternalNotes] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([
    { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0, vatRate: 21 },
  ]);

  const selectedCustomer = customers?.find(c => c.id === customerId);

  const createInvoice = useMutation({
    mutationFn: async () => {
      if (!customerId) throw new Error("Selecteer een klant");
      if (lines.length === 0 || lines.every(l => !l.description)) {
        throw new Error("Voeg minimaal één regel toe");
      }

      // Calculate totals
      let totalExclVat = 0;
      let totalVat = 0;

      const validLines = lines.filter(l => l.description.trim());
      validLines.forEach(line => {
        const lineTotal = line.quantity * line.unitPrice;
        const lineVat = lineTotal * (line.vatRate / 100);
        totalExclVat += lineTotal;
        totalVat += lineVat;
      });

      const totalInclVat = totalExclVat + totalVat;

      // Create standalone invoice (as an order)
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: customerId,
          division_id: activeDivisionId || null,
          order_date: invoiceDate,
          status: "afgerond",
          payment_status: "open",
          payment_condition: paymentCondition,
          internal_notes: internalNotes || null,
          total_excl_vat: totalExclVat,
          total_vat: totalVat,
          total_incl_vat: totalInclVat,
          amount_paid: 0,
          is_standalone_invoice: true,
          invoice_type: invoiceType as any,
          parent_order_id: parentOrderId || null,
          created_by: user?.id,
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      // Create order lines
      const orderLines = validLines.map((line, index) => ({
        order_id: order.id,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        vat_rate: line.vatRate,
        line_total: line.quantity * line.unitPrice,
        sort_order: index,
      }));

      const { error: linesError } = await supabase
        .from("order_lines")
        .insert(orderLines);

      if (linesError) throw linesError;

      return order.id;
    },
    onSuccess: (invoiceId) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
      toast.success("Factuur aangemaakt");
      onOpenChange(false);
      resetForm();
      navigate(`/invoices/${invoiceId}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Fout bij aanmaken");
    },
  });

  const resetForm = () => {
    setCustomerId("");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setPaymentCondition("14 dagen");
    setInternalNotes("");
    setLines([{ id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0, vatRate: 21 }]);
  };

  const addLine = () => {
    setLines([...lines, { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0, vatRate: 21 }]);
  };

  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(lines.filter(l => l.id !== id));
    }
  };

  const updateLine = (id: string, field: keyof InvoiceLine, value: string | number) => {
    setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const calculateTotal = () => {
    return lines.reduce((sum, line) => {
      const lineTotal = line.quantity * line.unitPrice;
      const lineVat = lineTotal * (line.vatRate / 100);
      return sum + lineTotal + lineVat;
    }, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("nl-NL", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuwe factuur aanmaken</DialogTitle>
          <DialogDescription>
            Maak een losse factuur aan zonder gekoppelde order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label>Klant *</Label>
            <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={customerOpen}
                  className="w-full justify-between"
                >
                  {selectedCustomer
                    ? selectedCustomer.company_name || 
                      `${selectedCustomer.first_name || ""} ${selectedCustomer.last_name}`.trim()
                    : "Selecteer klant..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Zoek klant..." />
                  <CommandList>
                    <CommandEmpty>Geen klanten gevonden</CommandEmpty>
                    <CommandGroup>
                      {customers?.map((customer) => {
                        const name = customer.company_name || 
                          `${customer.first_name || ""} ${customer.last_name}`.trim();
                        return (
                          <CommandItem
                            key={customer.id}
                            value={name}
                            onSelect={() => {
                              setCustomerId(customer.id);
                              setCustomerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                customerId === customer.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {name}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Invoice Type */}
          <div className="space-y-2">
            <Label>Factuurtype</Label>
            <Select value={invoiceType} onValueChange={(v) => setInvoiceType(v as InvoiceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(invoiceTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date and Payment Condition */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Factuurdatum</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentCondition">Betaalvoorwaarde</Label>
              <Select value={paymentCondition} onValueChange={setPaymentCondition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="7 dagen">7 dagen</SelectItem>
                  <SelectItem value="14 dagen">14 dagen</SelectItem>
                  <SelectItem value="30 dagen">30 dagen</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Invoice Lines */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Factuurregels</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="h-4 w-4 mr-1" />
                Regel
              </Button>
            </div>

            <div className="space-y-2">
              {lines.map((line, index) => (
                <div key={line.id} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5">
                    {index === 0 && <Label className="text-xs text-muted-foreground mb-1 block">Omschrijving</Label>}
                    <Input
                      placeholder="Omschrijving"
                      value={line.description}
                      onChange={(e) => updateLine(line.id, "description", e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <Label className="text-xs text-muted-foreground mb-1 block">Aantal</Label>}
                    <Input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, "quantity", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <Label className="text-xs text-muted-foreground mb-1 block">Prijs</Label>}
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(line.id, "unitPrice", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    {index === 0 && <Label className="text-xs text-muted-foreground mb-1 block">BTW %</Label>}
                    <Select
                      value={line.vatRate.toString()}
                      onValueChange={(v) => updateLine(line.id, "vatRate", parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="9">9%</SelectItem>
                        <SelectItem value="21">21%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1 flex items-end">
                    {index === 0 && <div className="h-5" />}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length === 1}
                      className="h-9 w-9"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="flex justify-end pt-2 border-t">
              <div className="text-right">
                <span className="text-sm text-muted-foreground mr-4">Totaal incl. BTW:</span>
                <span className="text-lg font-semibold">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Interne notities</Label>
            <Textarea
              id="notes"
              placeholder="Optionele interne notities..."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={() => createInvoice.mutate()} disabled={createInvoice.isPending}>
            {createInvoice.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Aanmaken...
              </>
            ) : (
              "Factuur aanmaken"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
