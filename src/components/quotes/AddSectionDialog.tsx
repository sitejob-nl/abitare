import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { useCreateQuoteSection, SECTION_TYPES, SectionType } from "@/hooks/useQuoteSections";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProductRanges } from "@/hooks/useProductRanges";
import { usePriceGroups } from "@/hooks/usePriceGroups";
import { toast } from "@/hooks/use-toast";

interface AddSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  existingSectionsCount: number;
}

export function AddSectionDialog({
  open,
  onOpenChange,
  quoteId,
  existingSectionsCount,
}: AddSectionDialogProps) {
  const createSection = useCreateQuoteSection();
  const [sectionType, setSectionType] = useState<SectionType>("meubelen");
  const [title, setTitle] = useState("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [rangeId, setRangeId] = useState<string>("");
  const [priceGroupId, setPriceGroupId] = useState<string>("");

  const { data: suppliers } = useSuppliers();
  const { data: ranges } = useProductRanges(supplierId || undefined);
  
  // Check if selected supplier has price groups
  const selectedSupplier = suppliers?.find(s => s.id === supplierId);
  const hasPriceGroups = selectedSupplier?.has_price_groups === true;
  
  const { data: priceGroups } = usePriceGroups(
    hasPriceGroups ? supplierId : undefined
  );

  const handleSupplierChange = (value: string) => {
    setSupplierId(value);
    setRangeId("");
    setPriceGroupId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedRange = ranges?.find(r => r.id === rangeId);
    const selectedPriceGroup = priceGroups?.find(pg => pg.id === priceGroupId);
    
    // Build default title from model + price group
    let defaultTitle = title.trim() || null;
    if (!defaultTitle) {
      const parts: string[] = [];
      if (selectedRange?.name) parts.push(selectedRange.name);
      else if (selectedRange?.code) parts.push(selectedRange.code);
      if (selectedPriceGroup) parts.push(selectedPriceGroup.code);
      defaultTitle = parts.length > 0 ? parts.join(" - ") : null;
    }

    try {
      await createSection.mutateAsync({
        quote_id: quoteId,
        section_type: sectionType,
        title: defaultTitle,
        sort_order: existingSectionsCount,
        subtotal: 0,
        range_id: rangeId || null,
        price_group_id: priceGroupId || null,
      });

      toast({
        title: "Sectie toegevoegd",
        description: `De sectie "${defaultTitle || SECTION_TYPES.find(t => t.value === sectionType)?.label}" is aangemaakt.`,
      });

      // Reset form
      setSectionType("meubelen");
      setTitle("");
      setSupplierId("");
      setRangeId("");
      setPriceGroupId("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating section:", error);
      toast({
        title: "Fout bij aanmaken",
        description: "Er is iets misgegaan. Probeer het opnieuw.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Nieuwe sectie</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="section-type">Type sectie *</Label>
            <Select
              value={sectionType}
              onValueChange={(value) => setSectionType(value as SectionType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer type" />
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

          <div className="space-y-2">
            <Label>Leverancier</Label>
            <Select value={supplierId} onValueChange={handleSupplierChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer leverancier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers?.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {supplierId && (
            <div className="space-y-2">
              <Label>{hasPriceGroups ? "Model / Collectie" : "Prijsgroep"}</Label>
              <Select value={rangeId} onValueChange={setRangeId}>
                <SelectTrigger>
                  <SelectValue placeholder={hasPriceGroups ? "Selecteer model" : "Selecteer prijsgroep"} />
                </SelectTrigger>
                <SelectContent>
                  {ranges?.map((range) => (
                    <SelectItem key={range.id} value={range.id}>
                      {range.name || range.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {hasPriceGroups && (
            <div className="space-y-2">
              <Label>Prijsgroep</Label>
              <Select value={priceGroupId} onValueChange={setPriceGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer prijsgroep (E1-E10, A, B, C)" />
                </SelectTrigger>
                <SelectContent>
                  {priceGroups?.map((pg) => (
                    <SelectItem key={pg.id} value={pg.id}>
                      {pg.code} - {pg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Titel (optioneel)</Label>
            <Input
              id="title"
              placeholder="Bijv. 'Eiland', 'Kastenwand'..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Laat leeg om de prijsgroep of type als naam te gebruiken
            </p>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuleren
            </Button>
            <Button type="submit" disabled={createSection.isPending}>
              {createSection.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Toevoegen
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
