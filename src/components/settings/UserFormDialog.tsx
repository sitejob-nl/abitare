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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useDivisions } from "@/hooks/useDivisions";
import { useInviteUser, useUpdateUser, type ProfileWithRoles } from "@/hooks/useUsers";
import { toast } from "@/hooks/use-toast";

const AVAILABLE_ROLES = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "verkoper", label: "Verkoper" },
  { value: "assistent", label: "Assistent" },
  { value: "monteur", label: "Monteur" },
  { value: "werkvoorbereiding", label: "Werkvoorbereiding" },
  { value: "administratie", label: "Administratie" },
] as const;

const userSchema = z.object({
  email: z.string().email("Ongeldig emailadres"),
  full_name: z.string().min(1, "Naam is verplicht"),
  phone: z.string().optional(),
  division_id: z.string().optional(),
  roles: z.array(z.string()).min(1, "Selecteer minimaal één rol"),
  is_active: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: ProfileWithRoles | null;
}

export function UserFormDialog({ open, onOpenChange, user }: UserFormDialogProps) {
  const isEditing = !!user;
  const { data: divisions } = useDivisions();
  const inviteUser = useInviteUser();
  const updateUser = useUpdateUser();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      full_name: "",
      phone: "",
      division_id: "",
      roles: ["verkoper"],
      is_active: true,
    },
  });

  const isActive = watch("is_active");
  const selectedRoles = watch("roles");
  const divisionId = watch("division_id");

  useEffect(() => {
    if (user) {
      reset({
        email: user.email,
        full_name: user.full_name || "",
        phone: user.phone || "",
        division_id: user.division_id || "",
        roles: user.roles?.map((r) => r.role) || [],
        is_active: user.is_active ?? true,
      });
    } else {
      reset({
        email: "",
        full_name: "",
        phone: "",
        division_id: "",
        roles: ["verkoper"],
        is_active: true,
      });
    }
  }, [user, reset]);

  const toggleRole = (role: string) => {
    const current = selectedRoles || [];
    if (current.includes(role)) {
      setValue("roles", current.filter((r) => r !== role));
    } else {
      setValue("roles", [...current, role]);
    }
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      if (isEditing && user) {
        await updateUser.mutateAsync({
          userId: user.id,
          full_name: data.full_name,
          phone: data.phone || null,
          division_id: data.division_id || null,
          roles: data.roles,
          is_active: data.is_active,
        });
        toast({
          title: "Gebruiker bijgewerkt",
          description: `${data.full_name} is succesvol bijgewerkt.`,
        });
      } else {
        await inviteUser.mutateAsync({
          email: data.email,
          full_name: data.full_name,
          phone: data.phone || undefined,
          division_id: data.division_id || undefined,
          roles: data.roles,
        });
        toast({
          title: "Gebruiker uitgenodigd",
          description: `Een uitnodiging is verzonden naar ${data.email}.`,
        });
      }
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Fout",
        description: error.message || (isEditing ? "Kon gebruiker niet bijwerken." : "Kon gebruiker niet uitnodigen."),
        variant: "destructive",
      });
    }
  };

  const isPending = inviteUser.isPending || updateUser.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Gebruiker bewerken" : "Nieuwe gebruiker uitnodigen"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Pas de gegevens van deze gebruiker aan."
              : "Nodig een nieuwe gebruiker uit. Ze ontvangen een email met een link om hun wachtwoord in te stellen."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="gebruiker@bedrijf.nl"
                disabled={isEditing}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Naam *</Label>
                <Input
                  id="full_name"
                  {...register("full_name")}
                  placeholder="Volledige naam"
                />
                {errors.full_name && (
                  <p className="text-xs text-destructive">{errors.full_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefoon</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="+31 6 12345678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="division_id">Vestiging</Label>
              <Select
                value={divisionId || ""}
                onValueChange={(value) => setValue("division_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer vestiging" />
                </SelectTrigger>
                <SelectContent>
                  {divisions?.map((division) => (
                    <SelectItem key={division.id} value={division.id}>
                      {division.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rollen *</Label>
              <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                {AVAILABLE_ROLES.map((role) => (
                  <div key={role.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role.value}`}
                      checked={selectedRoles?.includes(role.value)}
                      onCheckedChange={() => toggleRole(role.value)}
                    />
                    <Label
                      htmlFor={`role-${role.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {role.label}
                    </Label>
                  </div>
                ))}
              </div>
              {errors.roles && (
                <p className="text-xs text-destructive">{errors.roles.message}</p>
              )}
            </div>

            {isEditing && (
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Actief</Label>
                  <p className="text-xs text-muted-foreground">
                    Inactieve gebruikers kunnen niet inloggen
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={isActive}
                  onCheckedChange={(checked) => setValue("is_active", checked)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Opslaan" : "Uitnodigen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
