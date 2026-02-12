import { useState, useEffect } from "react";
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
import { Separator } from "@/components/ui/separator";
import { useCreateQuoteSection, SECTION_TYPES, SectionType } from "@/hooks/useQuoteSections";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProductRanges } from "@/hooks/useProductRanges";
import { usePriceGroups } from "@/hooks/usePriceGroups";
import { usePriceGroupColors, useSupplierColors } from "@/hooks/usePriceGroupColors";
import { toast } from "@/hooks/use-toast";

interface AddSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  existingSectionsCount: number;
  quoteDefaultSupplierId?: string | null;
  quoteDefaultRangeId?: string | null;
  quoteDefaultPriceGroupId?: string | null;
}

export function AddSectionDialog({
  open,
  onOpenChange,
  quoteId,
  existingSectionsCount,
  quoteDefaultSupplierId,
  quoteDefaultRangeId,
  quoteDefaultPriceGroupId,
}: AddSectionDialogProps) {
  const createSection = useCreateQuoteSection();

  // Form state
  const [sectionType, setSectionType] = useState<SectionType>("meubelen");
  const [title, setTitle] = useState("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [rangeId, setRangeId] = useState<string>("");
  const [priceGroupId, setPriceGroupId] = useState<string>("");

  // Kitchen configuration state (Stosa-specific fields)
  const [frontColor, setFrontColor] = useState<string>("");
  const [corpusColor, setCorpusColor] = useState<string>("");
  const [plinthColor, setPlinthColor] = useState<string>("");
  const [hingeColor, setHingeColor] = useState<string>("");
  const [handleNumber, setHandleNumber] = useState<string>("");
  const [columnHeightMm, setColumnHeightMm] = useState<string>("");

  // Data hooks
  const { data: suppliers } = useSuppliers();
  const { data: ranges } = useProductRanges(supplierId || undefined);

  const selectedSupplier = suppliers?.find(s => s.id === supplierId);
  const hasPriceGroups = selectedSupplier?.has_price_groups === true;

  const { data: priceGroups } = usePriceGroups(
    hasPriceGroups ? supplierId : undefined
  );

  // Color hooks from price_group_colors
  const { data: frontColors = [] } = usePriceGroupColors(
    hasPriceGroups && priceGroupId ? priceGroupId : undefined,
    'front'
  );
  const { data: corpusColors = [] } = useSupplierColors(
    hasPriceGroups ? supplierId : undefined,
    'corpus'
  );

  // Get distinct collections from price_groups
  const collections = (() => {
    const cols = new Set<string>();
    priceGroups?.forEach(pg => { if (pg.collection) cols.add(pg.collection); });
    return Array.from(cols).sort();
  })();

  const [selectedCollection, setSelectedCollection] = useState<string>("");

  // Filter price groups by selected collection
  const filteredPriceGroups = (() => {
    if (!selectedCollection) return priceGroups || [];
    return (priceGroups || []).filter(pg => pg.collection === selectedCollection);
  })();

  // Sync defaults when dialog opens
  useEffect(() => {
    if (open) {
      setSupplierId(quoteDefaultSupplierId || "");
      setRangeId(quoteDefaultRangeId || "");
      setPriceGroupId(quoteDefaultPriceGroupId || "");
      setSelectedCollection("");
      setFrontColor("");
      setCorpusColor("");
      setPlinthColor("");
      setHingeColor("");
      setHandleNumber("");
      setColumnHeightMm("");
    }
  }, [open, quoteDefaultSupplierId, quoteDefaultRangeId, quoteDefaultPriceGroupId]);

  // Cascade resets
  const handleSupplierChange = (value: string) => {
    setSupplierId(value);
    setRangeId("");
    setPriceGroupId("");
    setSelectedCollection("");
    setFrontColor("");
    setCorpusColor("");
  };

  const handleCollectionChange = (value: string) => {
    setSelectedCollection(value === "all" ? "" : value);
    setPriceGroupId("");
    setFrontColor("");
  };

  const handlePriceGroupChange = (value: string) => {
    setPriceGroupId(value);
    setFrontColor("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedRange = ranges?.find(r => r.id === rangeId);
    const selectedPriceGroup = priceGroups?.find(pg => pg.id === priceGroupId);

    // Build default title
    let defaultTitle = title.trim() || null;
    if (!defaultTitle) {
      const parts: string[] = [];
      if (selectedPriceGroup) {
        parts.push(`${selectedPriceGroup.code} - ${selectedPriceGroup.name}`);
      } else if (selectedRange?.name) {
        parts.push(selectedRange.name);
      }
      if (frontColor) {
        const fc = frontColors.find(c => c.color_code === frontColor);
        if (fc) parts.push(fc.color_name);
      }
      defaultTitle = parts.length > 0 ? parts.join(" | ") : null;
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
        front_color: frontColor || null,
        corpus_color: corpusColor || null,
        plinth_color: plinthColor || null,
        hinge_color: hingeColor || null,
        handle_number: handleNumber || null,
        column_height_mm: columnHeightMm ? parseInt(columnHeightMm) : null,
      });

      toast({
        title: "Sectie toegevoegd",
        description: `De sectie "${defaultTitle || SECTION_TYPES.find(t => t.value === sectionType)?.label}" is aangemaakt.`,
      });

      // Reset and close
      setSectionType("meubelen");
      setTitle("");
      setSupplierId("");
      setRangeId("");
      setPriceGroupId("");
      setFrontColor("");
      setCorpusColor("");
      setPlinthColor("");
      setHingeColor("");
      setHandleNumber("");
      setColumnHeightMm("");
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

  const showKitchenConfig = hasPriceGroups && priceGroupId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuwe sectie</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section Type */}
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

          {/* Supplier */}
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

          {/* Collection filter (only for price-group suppliers) */}
          {hasPriceGroups && collections.length > 0 && (
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

          {/* Range/Model (for non-price-group suppliers) */}
          {supplierId && !hasPriceGroups && (ranges?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <Label>Prijsgroep / Model</Label>
              <Select value={rangeId} onValueChange={setRangeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer model" />
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

          {/* Price Group (for Stosa-like suppliers) */}
          {hasPriceGroups && (
            <div className="space-y-2">
              <Label>Prijsgroep *</Label>
              <Select value={priceGroupId} onValueChange={handlePriceGroupChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer prijsgroep (bijv. E1, E4...)" />
                </SelectTrigger>
                <SelectContent>
                  {filteredPriceGroups.map((pg) => (
                    <SelectItem key={pg.id} value={pg.id}>
                      {pg.code} - {pg.name}
                      {(pg as any).material_type && (
                        <span className="text-muted-foreground ml-1">
                          ({(pg as any).material_type})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Kitchen Configuration (shown after price group is selected) */}
          {showKitchenConfig && (
            <>
              <Separator />
              <p className="text-sm text-muted-foreground font-medium">Keukenconfiguratie</p>

              {/* Front Color */}
              {frontColors.length > 0 && (
                <div className="space-y-2">
                  <Label>Frontkleur</Label>
                  <Select value={frontColor} onValueChange={setFrontColor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer frontkleur" />
                    </SelectTrigger>
                    <SelectContent>
                      {frontColors.map((color) => (
                        <SelectItem key={color.id} value={color.color_code}>
                          {color.color_code} - {color.color_name}
                          {color.finish && (
                            <span className="text-muted-foreground ml-1">
                              ({color.finish})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Corpus Color */}
              {corpusColors.length > 0 && (
                <div className="space-y-2">
                  <Label>Korpuskleur</Label>
                  <Select value={corpusColor} onValueChange={setCorpusColor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer korpuskleur" />
                    </SelectTrigger>
                    <SelectContent>
                      {corpusColors.map((color) => (
                        <SelectItem key={color.id} value={color.color_code}>
                          {color.color_code} - {color.color_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Plinth Color */}
              <div className="space-y-2">
                <Label>Plintkleur</Label>
                <Input
                  placeholder="Bijv. dezelfde als front"
                  value={plinthColor}
                  onChange={(e) => setPlinthColor(e.target.value)}
                />
              </div>

              {/* Handle */}
              <div className="space-y-2">
                <Label>Greepnummer</Label>
                <Input
                  placeholder="Bijv. M, MI, GS, Linear..."
                  value={handleNumber}
                  onChange={(e) => setHandleNumber(e.target.value)}
                />
              </div>

              {/* Column Height */}
              <div className="space-y-2">
                <Label>Kolomhoogte (mm)</Label>
                <Input
                  type="number"
                  placeholder="Bijv. 2400"
                  value={columnHeightMm}
                  onChange={(e) => setColumnHeightMm(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titel (optioneel)</Label>
            <Input
              id="title"
              placeholder="Bijv. 'Eiland', 'Kastenwand'..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Laat leeg om automatisch een naam te genereren
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
