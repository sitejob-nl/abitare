import { useState, useMemo } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCustomers } from "@/hooks/useCustomers";
import { useCreateQuote } from "@/hooks/useQuotes";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const quoteSchema = z.object({
  customer_id: z.string().min(1, "Selecteer een klant"),
  valid_until: z.date(),
  internal_notes: z.string().max(1000).optional(),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

interface QuoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuoteFormDialog({ open, onOpenChange }: QuoteFormDialogProps) {
  const { user, profile } = useAuth();
  const createQuote = useCreateQuote();
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { data: customers, isLoading: customersLoading } = useCustomers({
    search: customerSearch || undefined,
    enabled: open,
  });

  const {
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      customer_id: "",
      valid_until: addDays(new Date(), 30),
      internal_notes: "",
    },
  });

  const selectedCustomerId = watch("customer_id");
  const validUntil = watch("valid_until");

  const selectedCustomer = useMemo(() => {
    return customers?.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  const getCustomerDisplayName = (customer: { first_name?: string | null; last_name?: string | null; company_name?: string | null }) => {
    if (customer.company_name) return customer.company_name;
    return [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Onbekend";
  };

  const onSubmit = async (data: QuoteFormData) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      
      await createQuote.mutateAsync({
        customer_id: data.customer_id,
        valid_until: format(data.valid_until, "yyyy-MM-dd"),
        quote_date: today,
        internal_notes: data.internal_notes || null,
        status: "concept",
        salesperson_id: user?.id || null,
        division_id: profile?.division_id || null,
        created_by: user?.id || null,
      });

      toast({
        title: "Offerte aangemaakt",
        description: "De nieuwe offerte is opgeslagen als concept.",
      });

      reset();
      onOpenChange(false);
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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Nieuwe offerte</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label>Klant *</Label>
            <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={customerOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedCustomer
                    ? getCustomerDisplayName(selectedCustomer)
                    : "Zoek een klant..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
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

          {/* Internal Notes */}
          <div className="space-y-2">
            <Label htmlFor="internal_notes">Interne notities</Label>
            <Textarea
              id="internal_notes"
              placeholder="Optionele notities voor intern gebruik..."
              className="resize-none"
              rows={3}
              onChange={(e) => setValue("internal_notes", e.target.value)}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuleren
            </Button>
            <Button type="submit" disabled={isSubmitting || createQuote.isPending}>
              {(isSubmitting || createQuote.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Aanmaken
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
