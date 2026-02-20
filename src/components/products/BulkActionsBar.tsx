import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, FolderEdit, Building2, DollarSign, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBulkUpdateProducts, useBulkDeactivateProducts } from "@/hooks/useProducts";

interface BulkActionsBarProps {
  selectedIds: string[];
  onClearSelection: () => void;
  suppliers: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}

type BulkAction = "category" | "supplier" | "deactivate" | "price" | null;

export function BulkActionsBar({
  selectedIds,
  onClearSelection,
  suppliers,
  categories,
}: BulkActionsBarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeDialog, setActiveDialog] = useState<BulkAction>(null);
  const [selectedValue, setSelectedValue] = useState("");
  const [priceMode, setPriceMode] = useState<"fixed" | "percentage">("percentage");
  const [priceValue, setPriceValue] = useState("");

  const bulkUpdate = useBulkUpdateProducts();
  const bulkDeactivate = useBulkDeactivateProducts();

  const count = selectedIds.length;
  if (count === 0) return null;

  const handleCategoryChange = async () => {
    if (!selectedValue) return;
    await bulkUpdate.mutateAsync({
      ids: selectedIds,
      updates: { category_id: selectedValue === "none" ? null : selectedValue },
    });
    toast({ title: `${count} producten bijgewerkt`, description: "Categorie gewijzigd." });
    closeDialog();
  };

  const handleSupplierChange = async () => {
    if (!selectedValue) return;
    await bulkUpdate.mutateAsync({
      ids: selectedIds,
      updates: { supplier_id: selectedValue },
    });
    toast({ title: `${count} producten bijgewerkt`, description: "Leverancier gewijzigd." });
    closeDialog();
  };

  const handleDeactivate = async () => {
    await bulkDeactivate.mutateAsync(selectedIds);
    toast({ title: `${count} producten gedeactiveerd` });
    closeDialog();
  };

  const handlePriceChange = async () => {
    const val = parseFloat(priceValue);
    if (isNaN(val)) return;
    if (priceMode === "fixed") {
      await bulkUpdate.mutateAsync({
        ids: selectedIds,
        updates: { base_price: val },
      });
    } else {
      // Single RPC call instead of N individual updates
      const factor = 1 + val / 100;
      const { error } = await supabase.rpc("bulk_adjust_price", {
        p_ids: selectedIds,
        p_factor: factor,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
    toast({ title: `${count} producten bijgewerkt`, description: "Prijs aangepast." });
    closeDialog();
  };

  const closeDialog = () => {
    setActiveDialog(null);
    setSelectedValue("");
    setPriceValue("");
    onClearSelection();
  };

  const isLoading = bulkUpdate.isPending || bulkDeactivate.isPending;

  return (
    <>
      <div className="sticky top-0 z-10 mb-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 animate-fade-in">
        <Badge variant="secondary" className="text-sm font-medium">
          {count} geselecteerd
        </Badge>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => setActiveDialog("category")}
          >
            <FolderEdit className="h-3.5 w-3.5" />
            Categorie
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => setActiveDialog("supplier")}
          >
            <Building2 className="h-3.5 w-3.5" />
            Leverancier
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => setActiveDialog("price")}
          >
            <DollarSign className="h-3.5 w-3.5" />
            Prijs
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs text-destructive hover:text-destructive"
            onClick={() => setActiveDialog("deactivate")}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Deactiveren
          </Button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto gap-1 text-xs text-muted-foreground"
          onClick={onClearSelection}
        >
          <X className="h-3.5 w-3.5" />
          Deselecteer
        </Button>
      </div>

      {/* Category Dialog */}
      <Dialog open={activeDialog === "category"} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Categorie wijzigen</DialogTitle>
            <DialogDescription>
              Wijzig de categorie van {count} geselecteerde producten.
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedValue} onValueChange={setSelectedValue}>
            <SelectTrigger>
              <SelectValue placeholder="Kies een categorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Geen categorie</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => closeDialog()}>Annuleren</Button>
            <Button onClick={handleCategoryChange} disabled={!selectedValue || isLoading}>
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Dialog */}
      <Dialog open={activeDialog === "supplier"} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leverancier wijzigen</DialogTitle>
            <DialogDescription>
              Wijzig de leverancier van {count} geselecteerde producten.
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedValue} onValueChange={setSelectedValue}>
            <SelectTrigger>
              <SelectValue placeholder="Kies een leverancier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => closeDialog()}>Annuleren</Button>
            <Button onClick={handleSupplierChange} disabled={!selectedValue || isLoading}>
              Opslaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Dialog */}
      <Dialog open={activeDialog === "deactivate"} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Producten deactiveren</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je {count} producten wilt deactiveren? Ze worden niet verwijderd maar zijn niet meer zichtbaar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => closeDialog()}>Annuleren</Button>
            <Button variant="destructive" onClick={handleDeactivate} disabled={isLoading}>
              Deactiveren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Dialog */}
      <Dialog open={activeDialog === "price"} onOpenChange={() => closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prijs aanpassen</DialogTitle>
            <DialogDescription>
              Pas de verkoopprijs aan van {count} geselecteerde producten.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={priceMode === "percentage" ? "default" : "outline"}
                onClick={() => setPriceMode("percentage")}
              >
                Percentage (%)
              </Button>
              <Button
                size="sm"
                variant={priceMode === "fixed" ? "default" : "outline"}
                onClick={() => setPriceMode("fixed")}
              >
                Vast bedrag (€)
              </Button>
            </div>
            <div>
              <Label>{priceMode === "percentage" ? "Percentage (bijv. 10 voor +10%, -5 voor -5%)" : "Nieuwe verkoopprijs (€)"}</Label>
              <Input
                type="number"
                step="0.01"
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                placeholder={priceMode === "percentage" ? "10" : "199.99"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => closeDialog()}>Annuleren</Button>
            <Button onClick={handlePriceChange} disabled={!priceValue || isLoading}>
              Toepassen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
