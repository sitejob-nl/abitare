import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useUpdateSupplierTradeplace } from "@/hooks/useTradeplace";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import type { Supplier } from "@/hooks/useSuppliers";

const formSchema = z.object({
  tradeplace_enabled: z.boolean(),
  tradeplace_gln: z.string().optional().nullable(),
  tradeplace_endpoint: z.string().url().optional().nullable().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

interface SupplierTradeplaceDialogProps {
  supplier: Supplier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplierTradeplaceDialog({
  supplier,
  open,
  onOpenChange,
}: SupplierTradeplaceDialogProps) {
  const { toast } = useToast();
  const { mutate: updateSupplier, isPending } = useUpdateSupplierTradeplace();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tradeplace_enabled: supplier.tradeplace_enabled ?? false,
      tradeplace_gln: supplier.tradeplace_gln ?? "",
      tradeplace_endpoint: supplier.tradeplace_endpoint ?? "",
    },
  });

  const onSubmit = (values: FormValues) => {
    updateSupplier(
      {
        id: supplier.id,
        tradeplace_enabled: values.tradeplace_enabled,
        tradeplace_gln: values.tradeplace_gln || null,
        tradeplace_endpoint: values.tradeplace_endpoint || null,
      },
      {
        onSuccess: () => {
          toast({
            title: "Opgeslagen",
            description: "Tradeplace instellingen zijn bijgewerkt",
          });
          onOpenChange(false);
        },
        onError: (error) => {
          toast({
            title: "Fout",
            description: error instanceof Error ? error.message : "Kon niet opslaan",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{supplier.name} - Tradeplace</DialogTitle>
          <DialogDescription>
            Configureer de Tradeplace koppeling voor deze leverancier
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tradeplace_enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Tradeplace koppeling</FormLabel>
                    <FormDescription>
                      Schakel in om bestellingen via Tradeplace te plaatsen
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tradeplace_gln"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GLN-nummer fabrikant</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="bijv. 4012345678901"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Het Global Location Number van de fabrikant
                  </FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tradeplace_endpoint"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Endpoint (optioneel)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://api.tradeplace.com/..."
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Alleen invullen als fabrikant een specifiek endpoint heeft
                  </FormDescription>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuleren
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Opslaan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
