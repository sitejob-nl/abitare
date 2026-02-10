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
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Check, ChevronsUpDown, Loader2, Plus, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomers, type Customer } from "@/hooks/useCustomers";
import { useCreateQuote } from "@/hooks/useQuotes";
import { useCreateQuoteSection, SECTION_TYPES } from "@/hooks/useQuoteSections";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProductRanges } from "@/hooks/useProductRanges";
import { useProductColors } from "@/hooks/useProductColors";
import { usePriceGroups } from "@/hooks/usePriceGroups";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { CustomerFormDialog } from "@/components/customers/CustomerFormDialog";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  { value: "keuken", label: "Keuken" },
  { value: "sanitair", label: "Sanitair" },
  { value: "meubels", label: "Meubels" },
  { value: "tegels", label: "Tegels" },
];

const quoteSchema = z.object({
  customer_id: z.string().min(1, "Selecteer een klant"),
  valid_until: z.date(),
  internal_notes: z.string().max(1000).optional(),
  category: z.string().default("keuken"),
  reference: z.string().optional(),
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
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [step, setStep] = useState(1);

  const { data: customers, isLoading: customersLoading, refetch: refetchCustomers } = useCustomers({
    search: customerSearch || undefined,
    enabled: open,
  });

  const { data: suppliers = [] } = useSuppliers();
  const { data: ranges = [] } = useProductRanges(selectedSupplierId || undefined);
  const [colorRangeId, setColorRangeId] = useState<string>("");
  const { data: colors = [] } = useProductColors(colorRangeId || undefined);

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
  const hasPriceGroups = selectedSupplier?.has_price_groups === true;
  const { data: priceGroups = [] } = usePriceGroups(hasPriceGroups ? selectedSupplierId : undefined);

  // Distinct collections from price_groups (not product_ranges)
  const collections = useMemo(() => {
    const cols = new Set<string>();
    priceGroups.forEach(pg => { if (pg.collection) cols.add(pg.collection); });
    return Array.from(cols).sort();
  }, [priceGroups]);

  const filteredRanges = useMemo(() => {
    if (!selectedCollection) return ranges;
    return ranges.filter(r => r.collection === selectedCollection);
  }, [ranges, selectedCollection]);

  const filteredPriceGroups = useMemo(() => {
    if (!selectedCollection) return priceGroups;
    return priceGroups.filter(pg => pg.collection === selectedCollection);
  }, [priceGroups, selectedCollection]);

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
      category: "keuken",
      reference: "",
      supplier_id: "",
      range_id: "",
      section_type: "meubelen",
    },
  });

  const isCustomerPrefilled = !!prefillCustomerId;
  const selectedCustomerId = watch("customer_id");
  const validUntil = watch("valid_until");
  const selectedRangeId = watch("range_id");
  const selectedSectionType = watch("section_type");
  const watchedCategory = watch("category");

  // Sync colorRangeId with form's range_id for the color query
  useEffect(() => {
    setColorRangeId(selectedRangeId || "");
  }, [selectedRangeId]);

  const selectedCustomer = useMemo(() => {
    return customers?.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Auto-generate reference when customer or category changes
  useEffect(() => {
    if (selectedCustomer && watchedCategory) {
      const name = selectedCustomer.company_name || 
        [selectedCustomer.first_name, selectedCustomer.last_name].filter(Boolean).join(" ");
      const catLabel = CATEGORIES.find(c => c.value === watchedCategory)?.label || watchedCategory;
      const year = new Date().getFullYear();
      setValue("reference", `${name} - ${catLabel} - ${year}`);
    }
  }, [selectedCustomer?.id, watchedCategory]);

  const getCustomerDisplayName = (customer: { first_name?: string | null; last_name?: string | null; company_name?: string | null }) => {
    if (customer.company_name) return customer.company_name;
    return [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Onbekend";
  };

  const handleCustomerCreated = async (newCustomer: Customer) => {
    await refetchCustomers();
    setValue("customer_id", newCustomer.id);
    setNewCustomerDialogOpen(false);
  };

  const handleSupplierChange = (supplierId: string) => {
    const value = supplierId === "none" ? "" : supplierId;
    setSelectedSupplierId(value);
    setValue("supplier_id", value);
    setValue("range_id", "");
    setSelectedCollection("");
  };

  const handleCollectionChange = (value: string) => {
    setSelectedCollection(value === "all" ? "" : value);
    setValue("range_id", "");
  };

  const onSubmit = async (data: QuoteFormData) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      
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
        // New fields
        category: data.category || "keuken",
        reference: data.reference || null,
        default_supplier_id: selectedSupplierId || null,
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
      setSelectedCollection("");
      setStep(1);
      onOpenChange(false);
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
    setSelectedCollection("");
    setStep(1);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Nieuwe offerte
              <span className="ml-2 text-xs text-muted-foreground font-normal">
                Stap {step} van 2
              </span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 && (
              <>
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
                                          selectedCustomerId === customer.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span>{getCustomerDisplayName(customer)}</span>
                                        {customer.email && (
                                          <span className="text-xs text-muted-foreground">{customer.email}</span>
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

                {/* Category */}
                <div className="space-y-2">
                  <Label>Categorie</Label>
                  <div className="flex gap-2">
                    {CATEGORIES.map(cat => (
                      <Button
                        key={cat.value}
                        type="button"
                        variant={watchedCategory === cat.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setValue("category", cat.value)}
                      >
                        {cat.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Reference */}
                <div className="space-y-2">
                  <Label>Referentie</Label>
                  <Input
                    value={watch("reference") || ""}
                    onChange={(e) => setValue("reference", e.target.value)}
                    placeholder="Wordt automatisch gegenereerd..."
                  />
                  <p className="text-xs text-muted-foreground">Automatisch op basis van klant + categorie</p>
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
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-sm text-muted-foreground">
                  Stel de standaard leverancier en configuratie in. Deze gelden als default voor alle secties.
                </p>

                {/* Supplier Selection */}
                <div className="space-y-2">
                  <Label>Leverancier</Label>
                  <Select value={selectedSupplierId || "none"} onValueChange={handleSupplierChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer leverancier..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Overslaan</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Collection filter (from price_groups) */}
                {selectedSupplierId && collections.length > 0 && (
                  <div className="space-y-2">
                    <Label>Collectie</Label>
                    <Select value={selectedCollection || "all"} onValueChange={handleCollectionChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Alle collecties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle collecties</SelectItem>
                        {collections.map(c => (
                          <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Range/Model -- hidden for has_price_groups suppliers */}
                {selectedSupplierId && !hasPriceGroups && (
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Select
                      value={selectedRangeId || "none"}
                      onValueChange={(value) => setValue("range_id", value === "none" ? "" : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer model..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Geen</SelectItem>
                        {filteredRanges.map((range) => (
                          <SelectItem key={range.id} value={range.id}>
                            {range.code} - {range.name || range.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Price Group (filtered by collection) */}
                {hasPriceGroups && (
                  <div className="space-y-2">
                    <Label>Prijsgroep</Label>
                    <Select defaultValue="">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer prijsgroep..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredPriceGroups.map((pg) => (
                          <SelectItem key={pg.id} value={pg.id}>
                            {pg.code} - {pg.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Section Type */}
                {selectedSupplierId && (
                  <div className="space-y-2">
                    <Label>Sectietype eerste sectie</Label>
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
              </>
            )}

            <DialogFooter className="pt-4">
              {step === 1 ? (
                <>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Annuleren
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      if (!selectedCustomerId) {
                        toast({ title: "Selecteer een klant", variant: "destructive" });
                        return;
                      }
                      setStep(2);
                    }}
                    className="gap-1"
                  >
                    Volgende
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="gap-1">
                    <ArrowLeft className="h-4 w-4" />
                    Terug
                  </Button>
                  <Button type="submit" disabled={isSubmitting || createQuote.isPending || createSection.isPending}>
                    {(isSubmitting || createQuote.isPending || createSection.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Aanmaken
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CustomerFormDialog
        open={newCustomerDialogOpen}
        onOpenChange={setNewCustomerDialogOpen}
        onCustomerCreated={handleCustomerCreated}
      />
    </>
  );
}
