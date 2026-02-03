import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCreateDivision, useUpdateDivision, type Division } from "@/hooks/useDivisions";
import { toast } from "@/hooks/use-toast";

const divisionSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  code: z.string().optional(),
  address: z.string().optional(),
  postal_code: z.string().optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Ongeldig emailadres").optional().or(z.literal("")),
  is_active: z.boolean(),
});

type DivisionFormData = z.infer<typeof divisionSchema>;

interface DivisionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  division?: Division | null;
}

export function DivisionFormDialog({ open, onOpenChange, division }: DivisionFormDialogProps) {
  const isEditing = !!division;
  const createDivision = useCreateDivision();
  const updateDivision = useUpdateDivision();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DivisionFormData>({
    resolver: zodResolver(divisionSchema),
    defaultValues: {
      name: "",
      code: "",
      address: "",
      postal_code: "",
      city: "",
      phone: "",
      email: "",
      is_active: true,
    },
  });

  const isActive = watch("is_active");

  useEffect(() => {
    if (division) {
      reset({
        name: division.name,
        code: division.code || "",
        address: division.address || "",
        postal_code: division.postal_code || "",
        city: division.city || "",
        phone: division.phone || "",
        email: division.email || "",
        is_active: division.is_active ?? true,
      });
    } else {
      reset({
        name: "",
        code: "",
        address: "",
        postal_code: "",
        city: "",
        phone: "",
        email: "",
        is_active: true,
      });
    }
  }, [division, reset]);

  const onSubmit = async (data: DivisionFormData) => {
    try {
      if (isEditing && division) {
        await updateDivision.mutateAsync({
          id: division.id,
          name: data.name,
          is_active: data.is_active,
          email: data.email || null,
          code: data.code || null,
          address: data.address || null,
          postal_code: data.postal_code || null,
          city: data.city || null,
          phone: data.phone || null,
        });
        toast({
          title: "Vestiging bijgewerkt",
          description: `${data.name} is succesvol bijgewerkt.`,
        });
      } else {
        await createDivision.mutateAsync({
          name: data.name,
          is_active: data.is_active,
          email: data.email || null,
          code: data.code || null,
          address: data.address || null,
          postal_code: data.postal_code || null,
          city: data.city || null,
          phone: data.phone || null,
        });
        toast({
          title: "Vestiging aangemaakt",
          description: `${data.name} is succesvol aangemaakt.`,
        });
      }
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Fout",
        description: isEditing ? "Kon vestiging niet bijwerken." : "Kon vestiging niet aanmaken.",
        variant: "destructive",
      });
    }
  };

  const isPending = createDivision.isPending || updateDivision.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Vestiging bewerken" : "Nieuwe vestiging"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Pas de gegevens van deze vestiging aan."
              : "Voeg een nieuwe vestiging toe aan het systeem."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Naam *</Label>
                <Input
                  id="name"
                  {...register("name")}
                  placeholder="Vestiging naam"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  {...register("code")}
                  placeholder="bv. ROE"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Input
                id="address"
                {...register("address")}
                placeholder="Straat en huisnummer"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code">Postcode</Label>
                <Input
                  id="postal_code"
                  {...register("postal_code")}
                  placeholder="1234 AB"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Plaats</Label>
                <Input
                  id="city"
                  {...register("city")}
                  placeholder="Plaatsnaam"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefoon</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="+31 6 12345678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="info@vestiging.nl"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Actief</Label>
                <p className="text-xs text-muted-foreground">
                  Inactieve vestigingen zijn niet zichtbaar voor gebruikers
                </p>
              </div>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={(checked) => setValue("is_active", checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Opslaan" : "Aanmaken"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
