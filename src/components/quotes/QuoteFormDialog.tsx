import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addDays } from "date-fns";
import { nl } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { CalendarIcon, Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomers, type Customer } from "@/hooks/useCustomers";
import { useCreateQuote } from "@/hooks/useQuotes";
import { useCreateQuoteSection, SECTION_TYPES } from "@/hooks/useQuoteSections";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProductRanges } from "@/hooks/useProductRanges";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { useNavigate } from "react-router-dom";

const quoteSchema = z.object({
  customer_id: z.string().min(1, "Selecteer een klant"),
  valid_until: z.date(),
  internal_notes: z.string().max(1000).optional(),
  // Optional: first section configuration
  supplier_id: z.string().optional(),
  range_id: z.string().optional(),
  section_type: z.string().optional(),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

interface QuoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId?: string;
}

export function QuoteFormDialog({ open, onOpenChange, customerId: prefillCustomerId }: QuoteFormDialogProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const createQuote = useCreateQuote();
  const createSection = useCreateQuoteSection();
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [newCustomerDialogOpen, setNewCustomerDialogOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");

  const { data: customers, isLoading: customersLoading, refetch: refetchCustomers } = useCustomers({
    search: customerSearch || undefined,
    enabled: open,
  });

  const { data: suppliers = [] } = useSuppliers();
  const { data: ranges = [] } = useProductRanges(selectedSupplierId || undefined);

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      customer_id: prefillCustomerId || "",
      valid_until: addDays(new Date(), 30),
      internal_notes: "",
      supplier_id: "",
      range_id: "",
      section_type: "meubelen",
    },
  });

  // Pre-fill customer when dialog opens with customerId
  const isCustomerPrefilled = !!prefillCustomerId;

  const selectedCustomerId = watch("customer_id");
  const validUntil = watch("valid_until");
  const selectedRangeId = watch("range_id");
  const selectedSectionType = watch("section_type");

  const selectedCustomer = useMemo(() => {
    return customers?.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const getCustomerDisplayName = (customer: { first_name?: string | null; last_name?: string | null; company_name?: string | null }) => {
    if (customer.company_name) return customer.company_name;
    return [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Onbekend";
  };

  const handleCustomerCreated = async (newCustomer: Customer) => {
    // Refetch customers to include the new one
    await refetchCustomers();
    // Select the newly created customer
    setValue("customer_id", newCustomer.id);
    setNewCustomerDialogOpen(false);
  };

  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setValue("supplier_id", supplierId);
    // Reset range when supplier changes
    setValue("range_id", "");
  };

  const onSubmit = async (data: QuoteFormData) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      
      // Create the quote
      const quote = await createQuote.mutateAsync({
        customer_id: data.customer_id,
        valid_until: format(data.valid_until, "yyyy-MM-dd"),
        quote_date: today,
        internal_notes: data.internal_notes || null,
        status: "concept",
        salesperson_id: user?.id || null,
        division_id: profile?.division_id || null,
        created_by: user?.id || null,
        default_range_id: data.range_id || null,
      });

      // If supplier/range selected, create first section automatically
      if (data.supplier_id || data.range_id) {
        const selectedRange = ranges.find(r => r.id === data.range_id);
        const sectionTitle = selectedRange 
          ? `${selectedRange.name || selectedRange.code}` 
          : SECTION_TYPES.find(t => t.value === data.section_type)?.label || "Keukenmeubelen";

        await createSection.mutateAsync({
          quote_id: quote.id,
          section_type: data.section_type || "meubelen",
          title: sectionTitle,
          range_id: data.range_id || null,
          sort_order: 0,
        });
      }

      toast({
        title: "Offerte aangemaakt",
        description: data.supplier_id || data.range_id 
          ? "De offerte is aangemaakt met een eerste sectie."
          : "De nieuwe offerte is opgeslagen als concept.",
      });

      reset();
      setSelectedSupplierId("");
      onOpenChange(false);
      
      // Navigate to the new quote
      navigate(`/quotes/${quote.id}`);
    } catch (error) {
      console.error("Error creating quote:", error);
      toast({
        title: "Fout bij aanmaken",
        description: "Er is iets misgegaan. Probeer het opnieuw.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    reset();
    setCustomerSearch("");
    setSelectedSupplierId("");
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nieuwe offerte</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label>Klant *</Label>
              <div className="flex gap-2">
                <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerOpen}
                      className="flex-1 justify-between font-normal"
                      disabled={isCustomerPrefilled}
                    >
                      {selectedCustomer
                        ? getCustomerDisplayName(selectedCustomer)
                        : "Zoek een klant..."}
                      {!isCustomerPrefilled && <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Zoek op naam, email..."
                        value={customerSearch}
                        onValueChange={setCustomerSearch}
                      />
                      <CommandList>
                        {customersLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <>
                            <CommandEmpty>Geen klanten gevonden.</CommandEmpty>
                            <CommandGroup>
                              {customers?.slice(0, 20).map((customer) => (
                                <CommandItem
                                  key={customer.id}
                                  value={customer.id}
                                  onSelect={() => {
                                    setValue("customer_id", customer.id);
                                    setCustomerOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedCustomerId === customer.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{getCustomerDisplayName(customer)}</span>
                                    {customer.email && (
                                      <span className="text-xs text-muted-foreground">
                                        {customer.email}
                                      </span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {!isCustomerPrefilled && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setNewCustomerDialogOpen(true)}
                    title="Nieuwe klant toevoegen"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {errors.customer_id && (
                <p className="text-xs text-destructive">{errors.customer_id.message}</p>
              )}
            </div>

            {/* Valid Until Date */}
            <div className="space-y-2">
              <Label>Geldig tot</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !validUntil && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {validUntil ? format(validUntil, "d MMMM yyyy", { locale: nl }) : "Selecteer datum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={validUntil}
                    onSelect={(date) => {
                      if (date) {
                        setValue("valid_until", date);
                        setCalendarOpen(false);
                      }
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Separator className="my-4" />

            {/* First Section Configuration - Optional */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Eerste sectie (optioneel)</Label>
                <span className="text-xs text-muted-foreground">Sla over om later in te stellen</span>
              </div>

              {/* Supplier Selection */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Leverancier</Label>
                <Select
                  value={selectedSupplierId}
                  onValueChange={handleSupplierChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer leverancier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Range/Price Group Selection - only show when supplier selected */}
              {selectedSupplierId && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Prijsgroep / Model</Label>
                  <Select
                    value={selectedRangeId}
                    onValueChange={(value) => setValue("range_id", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer prijsgroep..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ranges.map((range) => (
                        <SelectItem key={range.id} value={range.id}>
                          {range.code} - {range.name || range.description || `Prijsgroep ${range.price_group}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Section Type */}
              {selectedSupplierId && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Sectietype</Label>
                  <Select
                    value={selectedSectionType}
                    onValueChange={(value) => setValue("section_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Internal Notes */}
            <div className="space-y-2">
              <Label htmlFor="internal_notes">Interne notities</Label>
              <Textarea
                id="internal_notes"
                placeholder="Optionele notities voor intern gebruik..."
                className="resize-none"
                rows={2}
                onChange={(e) => setValue("internal_notes", e.target.value)}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Annuleren
              </Button>
              <Button type="submit" disabled={isSubmitting || createQuote.isPending || createSection.isPending}>
                {(isSubmitting || createQuote.isPending || createSection.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Aanmaken
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Customer Dialog */}
      <CustomerFormDialog
        open={newCustomerDialogOpen}
        onOpenChange={setNewCustomerDialogOpen}
        onCustomerCreated={handleCustomerCreated}
      />
    </>
  );
}
