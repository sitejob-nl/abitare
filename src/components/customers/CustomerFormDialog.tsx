import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import { useCreateCustomer } from "@/hooks/useCustomers";
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
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  };
}

export function CustomerFormDialog({ open, onOpenChange, customer }: CustomerFormDialogProps) {
  const { user, profile } = useAuth();
  const createCustomer = useCreateCustomer();
  const isEditMode = !!customer;

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
    },
  });

  const customerType = watch("customer_type");

  const onSubmit = async (data: CustomerFormData) => {
    try {
      await createCustomer.mutateAsync({
        customer_type: data.customer_type,
        salutation: data.salutation || null,
        first_name: data.first_name || null,
        last_name: data.last_name, // Required field
        company_name: data.company_name || null,
        email: data.email || null,
        phone: data.phone || null,
        mobile: data.mobile || null,
        street_address: data.street_address || null,
        postal_code: data.postal_code || null,
        city: data.city || null,
        salesperson_id: user?.id || null,
        division_id: profile?.division_id || null,
      });

      toast({
        title: "Klant aangemaakt",
        description: `${data.first_name || ""} ${data.last_name} is toegevoegd.`,
      });

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Klant bewerken" : "Nieuwe klant"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Customer Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <RadioGroup
              defaultValue="particulier"
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
              <Select onValueChange={(value) => setValue("salutation", value)}>
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

          {/* Address Fields */}
          <div className="space-y-2">
            <Label htmlFor="street_address">Straat + huisnummer</Label>
            <Input id="street_address" {...register("street_address")} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postcode</Label>
              <Input id="postal_code" {...register("postal_code")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Plaats</Label>
              <Input id="city" {...register("city")} />
            </div>
          </div>

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
