import { useState, useEffect, useMemo } from "react";
import { Loader2, Truck } from "lucide-react";
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
import { useUpdateQuote } from "@/hooks/useQuotes";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProductRanges } from "@/hooks/useProductRanges";
import { useProductColors } from "@/hooks/useProductColors";
import { usePriceGroups } from "@/hooks/usePriceGroups";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "keuken", label: "Keuken" },
  { value: "sanitair", label: "Sanitair" },
  { value: "meubels", label: "Meubels" },
  { value: "tegels", label: "Tegels" },
];

interface QuoteConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  currentCategory?: string | null;
  currentReference?: string | null;
  currentSupplierId?: string | null;
  currentRangeId?: string | null;
  currentColorId?: string | null;
  currentPriceGroupId?: string | null;
  currentCorpusColorId?: string | null;
  currentRequiresTransport?: boolean;
  currentRequiresKooiaap?: boolean;
  currentShowLinePrices?: boolean;
  currentShowArticleCodes?: boolean;
}

export function QuoteConfigDialog({
  open,
  onOpenChange,
  quoteId,
  currentCategory,
  currentReference,
  currentSupplierId,
  currentRangeId,
  currentColorId,
  currentPriceGroupId,
  currentCorpusColorId,
  currentRequiresTransport,
  currentRequiresKooiaap,
  currentShowLinePrices,
  currentShowArticleCodes,
}: QuoteConfigDialogProps) {
  const updateQuote = useUpdateQuote();

  const [category, setCategory] = useState(currentCategory || "keuken");
  const [reference, setReference] = useState(currentReference || "");
  const [supplierId, setSupplierId] = useState(currentSupplierId || "");
  const [rangeId, setRangeId] = useState(currentRangeId || "");
  const [colorId, setColorId] = useState(currentColorId || "");
  const [priceGroupId, setPriceGroupId] = useState(currentPriceGroupId || "");
  const [corpusColorId, setCorpusColorId] = useState(currentCorpusColorId || "");
  const [requiresTransport, setRequiresTransport] = useState(currentRequiresTransport ?? false);
  const [requiresKooiaap, setRequiresKooiaap] = useState(currentRequiresKooiaap ?? false);
  const [showLinePrices, setShowLinePrices] = useState(currentShowLinePrices ?? true);
  const [showArticleCodes, setShowArticleCodes] = useState(currentShowArticleCodes ?? true);

  const { data: suppliers = [] } = useSuppliers();
  const { data: ranges = [] } = useProductRanges(supplierId || undefined);
  const { data: colors = [] } = useProductColors(rangeId || undefined);

  const selectedSupplier = suppliers.find(s => s.id === supplierId);
  const hasPriceGroups = selectedSupplier?.has_price_groups === true;
  const { data: priceGroups = [] } = usePriceGroups(hasPriceGroups ? supplierId : undefined);

  // Get distinct collections from price_groups (not product_ranges)
  const collections = useMemo(() => {
    const cols = new Set<string>();
    priceGroups.forEach(pg => { if (pg.collection) cols.add(pg.collection); });
    return Array.from(cols).sort();
  }, [priceGroups]);

  const [selectedCollection, setSelectedCollection] = useState<string>("");

  const filteredRanges = useMemo(() => {
    if (!selectedCollection) return ranges;
    return ranges.filter(r => r.collection === selectedCollection);
  }, [ranges, selectedCollection]);

  const filteredPriceGroups = useMemo(() => {
    if (!selectedCollection) return priceGroups;
    return priceGroups.filter(pg => pg.collection === selectedCollection);
  }, [priceGroups, selectedCollection]);

  // Sync with props when dialog opens
  useEffect(() => {
    if (open) {
      setCategory(currentCategory || "keuken");
      setReference(currentReference || "");
      setSupplierId(currentSupplierId || "");
      setRangeId(currentRangeId || "");
      setColorId(currentColorId || "");
      setPriceGroupId(currentPriceGroupId || "");
      setCorpusColorId(currentCorpusColorId || "");
      setSelectedCollection("");
      setRequiresTransport(currentRequiresTransport ?? false);
      setRequiresKooiaap(currentRequiresKooiaap ?? false);
      setShowLinePrices(currentShowLinePrices ?? true);
      setShowArticleCodes(currentShowArticleCodes ?? true);
    }
  }, [open, currentCategory, currentReference, currentSupplierId, currentRangeId, currentColorId, currentPriceGroupId, currentCorpusColorId, currentRequiresTransport, currentRequiresKooiaap, currentShowLinePrices, currentShowArticleCodes]);

  const handleSupplierChange = (value: string) => {
    setSupplierId(value);
    setRangeId("");
    setColorId("");
    setPriceGroupId("");
    setSelectedCollection("");
  };

  const handleCollectionChange = (value: string) => {
    setSelectedCollection(value === "all" ? "" : value);
    setRangeId("");
    setColorId("");
  };

  const handleRangeChange = (value: string) => {
    setRangeId(value);
    setColorId("");
  };

  const handleSave = async () => {
    try {
      await updateQuote.mutateAsync({
        id: quoteId,
        category,
        reference: reference || null,
        default_supplier_id: supplierId || null,
        default_range_id: rangeId || null,
        default_color_id: colorId || null,
        default_price_group_id: priceGroupId || null,
        default_corpus_color_id: corpusColorId || null,
        requires_transport: requiresTransport,
        requires_kooiaap: requiresKooiaap,
        show_line_prices: showLinePrices,
        show_article_codes: showArticleCodes,
      });

      toast({
        title: "Configuratie bijgewerkt",
        description: "De offerte-standaard configuratie is opgeslagen.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating quote config:", error);
      toast({
        title: "Fout bij opslaan",
        description: "Er is iets misgegaan. Probeer het opnieuw.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Offerte configuratie</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Category */}
          <div className="space-y-2">
            <Label>Categorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference */}
          <div className="space-y-2">
            <Label>Referentie</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Bijv. Jansen - Keuken - 2026-001"
            />
          </div>

          {/* Supplier */}
          <div className="space-y-2">
            <Label>Standaard leverancier</Label>
            <Select value={supplierId} onValueChange={handleSupplierChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer leverancier..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Geen</SelectItem>
                {suppliers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Collection (from price_groups for has_price_groups suppliers) */}
          {supplierId && supplierId !== "none" && collections.length > 0 && (
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

          {/* Range/Model -- hidden for has_price_groups suppliers and suppliers without ranges */}
          {supplierId && supplierId !== "none" && !hasPriceGroups && filteredRanges.length > 0 && (
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={rangeId} onValueChange={handleRangeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer model..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen</SelectItem>
                  {filteredRanges.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.code} - {r.name || r.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Price Group (for has_price_groups suppliers, filtered by collection) */}
          {hasPriceGroups && (
            <div className="space-y-2">
              <Label>Prijsgroep</Label>
              <Select value={priceGroupId} onValueChange={setPriceGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer prijsgroep..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen</SelectItem>
                  {filteredPriceGroups.map(pg => (
                    <SelectItem key={pg.id} value={pg.id}>{pg.code} - {pg.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Front Color - only show when colors are available */}
          {rangeId && rangeId !== "none" && colors.length > 0 && (
            <div className="space-y-2">
              <Label>Standaard frontkleur</Label>
              <Select value={colorId} onValueChange={setColorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer kleur..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen</SelectItem>
                  {colors.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Corpus Color - only show when colors are available */}
          {supplierId && supplierId !== "none" && colors.length > 0 && (
            <div className="space-y-2">
              <Label>Standaard korpuskleur</Label>
              <Select value={corpusColorId} onValueChange={setCorpusColorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer korpuskleur..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen</SelectItem>
                  {colors.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} - {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* PDF display options */}
          <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
            <div className="text-sm font-medium">PDF weergave</div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showArticleCodes" className="text-sm font-normal">Toon artikelcodes op offerte</Label>
              <Switch
                id="showArticleCodes"
                checked={showArticleCodes}
                onCheckedChange={setShowArticleCodes}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="showLinePrices" className="text-sm font-normal">Toon prijzen per regel op offerte</Label>
              <Switch
                id="showLinePrices"
                checked={showLinePrices}
                onCheckedChange={setShowLinePrices}
              />
            </div>
          </div>

          {/* Transport options for tegels */}
          {category === "tegels" && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Truck className="h-4 w-4 text-muted-foreground" />
                Transportopties
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="transport" className="text-sm font-normal">Transport nodig</Label>
                <Switch
                  id="transport"
                  checked={requiresTransport}
                  onCheckedChange={(checked) => {
                    setRequiresTransport(checked);
                    if (!checked) setRequiresKooiaap(false);
                  }}
                />
              </div>
              {requiresTransport && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="kooiaap" className="text-sm font-normal">Kooiaap (hydraulische laadklep)</Label>
                  <Switch
                    id="kooiaap"
                    checked={requiresKooiaap}
                    onCheckedChange={setRequiresKooiaap}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
          <Button onClick={handleSave} disabled={updateQuote.isPending}>
            {updateQuote.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
