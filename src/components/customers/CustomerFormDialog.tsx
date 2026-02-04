import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useCreateCustomer, type Customer } from "@/hooks/useCustomers";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const customerSchema = z.object({
  customer_type: z.enum(["particulier", "zakelijk"]),
  salutation: z.string().optional(),
  first_name: z.string().max(100).optional(),
  last_name: z.string().min(1, "Achternaam is verplicht").max(100),
  company_name: z.string().max(200).optional(),
  email: z.string().email("Ongeldig emailadres").max(255).optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
  mobile: z.string().max(20).optional(),
  street_address: z.string().max(255).optional(),
  postal_code: z.string().max(10).optional(),
  city: z.string().max(100).optional(),
  // Delivery address fields
  different_delivery_address: z.boolean().default(false),
  delivery_street_address: z.string().max(255).optional(),
  delivery_postal_code: z.string().max(10).optional(),
  delivery_city: z.string().max(100).optional(),
  delivery_floor: z.string().max(10).optional(),
  delivery_has_elevator: z.boolean().default(false),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated?: (customer: Customer) => void;
  customer?: {
    id: string;
    customer_type: "particulier" | "zakelijk";
    salutation?: string | null;
    first_name?: string | null;
    last_name: string;
    company_name?: string | null;
    email?: string | null;
    phone?: string | null;
    mobile?: string | null;
    street_address?: string | null;
    postal_code?: string | null;
    city?: string | null;
    delivery_street_address?: string | null;
    delivery_postal_code?: string | null;
    delivery_city?: string | null;
    delivery_floor?: string | null;
    delivery_has_elevator?: boolean | null;
  };
}

export function CustomerFormDialog({ open, onOpenChange, onCustomerCreated, customer }: CustomerFormDialogProps) {
  const { user, profile } = useAuth();
  const createCustomer = useCreateCustomer();
  const isEditMode = !!customer;

  // Check if customer has a different delivery address
  const hasDifferentDeliveryAddress = customer ? !!(
    customer.delivery_street_address ||
    customer.delivery_postal_code ||
    customer.delivery_city
  ) : false;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customer_type: customer?.customer_type || "particulier",
      salutation: customer?.salutation || "",
      first_name: customer?.first_name || "",
      last_name: customer?.last_name || "",
      company_name: customer?.company_name || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
      mobile: customer?.mobile || "",
      street_address: customer?.street_address || "",
      postal_code: customer?.postal_code || "",
      city: customer?.city || "",
      different_delivery_address: hasDifferentDeliveryAddress,
      delivery_street_address: customer?.delivery_street_address || "",
      delivery_postal_code: customer?.delivery_postal_code || "",
      delivery_city: customer?.delivery_city || "",
      delivery_floor: customer?.delivery_floor || "",
      delivery_has_elevator: customer?.delivery_has_elevator || false,
    },
  });

  const customerType = watch("customer_type");
  const differentDeliveryAddress = watch("different_delivery_address");

  const onSubmit = async (data: CustomerFormData) => {
    try {
      const newCustomer = await createCustomer.mutateAsync({
        customer_type: data.customer_type,
        salutation: data.salutation || null,
        first_name: data.first_name || null,
        last_name: data.last_name,
        company_name: data.company_name || null,
        email: data.email || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        street_address: data.street_address || null,
        postal_code: data.postal_code || null,
        city: data.city || null,
        // Delivery address fields - only save if different
        delivery_street_address: data.different_delivery_address ? data.delivery_street_address || null : null,
        delivery_postal_code: data.different_delivery_address ? data.delivery_postal_code || null : null,
        delivery_city: data.different_delivery_address ? data.delivery_city || null : null,
        delivery_floor: data.different_delivery_address ? data.delivery_floor || null : null,
        delivery_has_elevator: data.different_delivery_address ? data.delivery_has_elevator : null,
        salesperson_id: user?.id || null,
        division_id: profile?.division_id || null,
      });

      toast({
        title: "Klant aangemaakt",
        description: `${data.first_name || ""} ${data.last_name} is toegevoegd.`,
      });

      // Call callback with the new customer if provided
      if (onCustomerCreated && newCustomer) {
        onCustomerCreated(newCustomer);
      }

      reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating customer:", error);
      toast({
        title: "Fout bij aanmaken",
        description: "Er is iets misgegaan. Probeer het opnieuw.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Klant bewerken" : "Nieuwe klant"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Customer Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <RadioGroup
              defaultValue={customer?.customer_type || "particulier"}
              onValueChange={(value) => setValue("customer_type", value as "particulier" | "zakelijk")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="particulier" id="particulier" />
                <Label htmlFor="particulier" className="font-normal">Particulier</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="zakelijk" id="zakelijk" />
                <Label htmlFor="zakelijk" className="font-normal">Zakelijk</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="salutation">Aanhef</Label>
              <Select 
                defaultValue={customer?.salutation || undefined}
                onValueChange={(value) => setValue("salutation", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dhr.">Dhr.</SelectItem>
                  <SelectItem value="Mevr.">Mevr.</SelectItem>
                  <SelectItem value="Dhr./Mevr.">Dhr./Mevr.</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="first_name">Voornaam</Label>
              <Input id="first_name" {...register("first_name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Achternaam *</Label>
              <Input id="last_name" {...register("last_name")} />
              {errors.last_name && (
                <p className="text-xs text-destructive">{errors.last_name.message}</p>
              )}
            </div>
          </div>

          {/* Company (only for zakelijk) */}
          {customerType === "zakelijk" && (
            <div className="space-y-2">
              <Label htmlFor="company_name">Bedrijfsnaam</Label>
              <Input id="company_name" {...register("company_name")} />
            </div>
          )}

          {/* Contact Fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefoon</Label>
              <Input id="phone" type="tel" {...register("phone")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile">Mobiel</Label>
            <Input id="mobile" type="tel" {...register("mobile")} />
          </div>

          {/* Billing Address */}
          <div className="space-y-3 pt-2 border-t">
            <Label className="text-sm font-medium">Factuuradres</Label>
            <div className="space-y-2">
              <Label htmlFor="street_address" className="text-xs text-muted-foreground">Straat + huisnummer</Label>
              <Input id="street_address" {...register("street_address")} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="postal_code" className="text-xs text-muted-foreground">Postcode</Label>
                <Input id="postal_code" {...register("postal_code")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-xs text-muted-foreground">Plaats</Label>
                <Input id="city" {...register("city")} />
              </div>
            </div>
          </div>

          {/* Different Delivery Address Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="different_delivery_address"
              checked={differentDeliveryAddress}
              onCheckedChange={(checked) => setValue("different_delivery_address", !!checked)}
            />
            <Label htmlFor="different_delivery_address" className="font-normal cursor-pointer">
              Bezorgadres wijkt af van factuuradres
            </Label>
          </div>

          {/* Delivery Address (conditional) */}
          {differentDeliveryAddress && (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
              <Label className="text-sm font-medium">Bezorgadres</Label>
              <div className="space-y-2">
                <Label htmlFor="delivery_street_address" className="text-xs text-muted-foreground">Straat + huisnummer</Label>
                <Input id="delivery_street_address" {...register("delivery_street_address")} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="delivery_postal_code" className="text-xs text-muted-foreground">Postcode</Label>
                  <Input id="delivery_postal_code" {...register("delivery_postal_code")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery_city" className="text-xs text-muted-foreground">Plaats</Label>
                  <Input id="delivery_city" {...register("delivery_city")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="delivery_floor" className="text-xs text-muted-foreground">Verdieping</Label>
                  <Input id="delivery_floor" placeholder="bijv. 3" {...register("delivery_floor")} />
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="delivery_has_elevator"
                    checked={watch("delivery_has_elevator")}
                    onCheckedChange={(checked) => setValue("delivery_has_elevator", !!checked)}
                  />
                  <Label htmlFor="delivery_has_elevator" className="font-normal cursor-pointer text-sm">
                    Lift aanwezig
                  </Label>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuleren
            </Button>
            <Button type="submit" disabled={isSubmitting || createCustomer.isPending}>
              {(isSubmitting || createCustomer.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Opslaan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
