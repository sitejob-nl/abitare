import { useState, useMemo } from "react";
import { Loader2, Plus, Search, Package } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts";
import { useCreateQuoteLine } from "@/hooks/useQuoteLines";
import { fetchProductPrice } from "@/hooks/useProductPrices";
import { useProductRanges } from "@/hooks/useProductRanges";
import { usePriceGroups } from "@/hooks/usePriceGroups";
import { toast } from "@/hooks/use-toast";

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  sectionId: string;
  sectionRangeId?: string | null;
  quoteDefaultRangeId?: string | null;
  sectionSupplierId?: string | null;
  sectionPriceGroupId?: string | null;
}

export function AddProductDialog({
  open,
  onOpenChange,
  quoteId,
  sectionId,
  sectionRangeId,
  quoteDefaultRangeId,
  sectionSupplierId,
  sectionPriceGroupId,
}: AddProductDialogProps) {
  const createLine = useCreateQuoteLine();

  // Product search
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Form fields
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [discount, setDiscount] = useState("0");
  const [heightMm, setHeightMm] = useState("");
  const [widthMm, setWidthMm] = useState("");
  const [extraDescription, setExtraDescription] = useState("");
  const [priceSource, setPriceSource] = useState<"range_price" | "base_price" | "override_price" | "quote_default_price" | "price_group_price" | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [priceType, setPriceType] = useState<"abitare" | "boekprijs">("abitare");
  const [overrideRangeId, setOverrideRangeId] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Free line fields
  const [freeDescription, setFreeDescription] = useState("");
  const [freeArticleCode, setFreeArticleCode] = useState("");
  const [freePrice, setFreePrice] = useState("");
  const [freeQuantity, setFreeQuantity] = useState("1");
  const [freeHeightMm, setFreeHeightMm] = useState("");
  const [freeWidthMm, setFreeWidthMm] = useState("");
  const [freeExtraDescription, setFreeExtraDescription] = useState("");

  // Group header toggle
  const [isGroupHeader, setIsGroupHeader] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");

  // Supplier filter
  const [showAllSuppliers, setShowAllSuppliers] = useState(false);

  // Category and width filters
  const [categoryFilter, setCategoryFilter] = useState("");
  const [widthFilter, setWidthFilter] = useState("all");

  const { data: productsResult, isLoading: productsLoading } = useProducts({
    search: productSearch || undefined,
    supplierId: showAllSuppliers ? undefined : (sectionSupplierId || undefined),
    priceGroupId: showAllSuppliers ? undefined : (sectionPriceGroupId || undefined),
    enabled: open,
    pageSize: 100,
  });
  const products = productsResult?.data;

  // Filter products by category and width
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p: any) => {
      if (categoryFilter && p.kitchen_group !== categoryFilter) {
        return false;
      }
      if (widthFilter !== "all" && p.width_mm != null && p.width_mm !== parseInt(widthFilter)) {
        return false;
      }
      return true;
    });
  }, [products, categoryFilter, widthFilter]);

  // Fetch ranges and price groups for override dropdown
  const { data: ranges } = useProductRanges(sectionSupplierId || undefined);
  const { data: priceGroups } = usePriceGroups(sectionSupplierId || undefined);
  const hasPriceGroups = (priceGroups?.length ?? 0) > 0;

  const selectedProduct = useMemo(() => {
    return products?.find((p) => p.id === selectedProductId);
  }, [products, selectedProductId]);

  // When product is selected, prefill price and dimensions
  const handleProductSelect = async (productId: string) => {
    setSelectedProductId(productId);

    const product = products?.find(p => p.id === productId);
    if (!product) return;

    if (product.height_mm) setHeightMm(product.height_mm.toString());
    if (product.width_mm) setWidthMm(product.width_mm.toString());

    await refetchPrice(productId, overrideRangeId);
  };

  const refetchPrice = async (productId: string, overrideId: string | null, selectedPriceType?: "abitare" | "boekprijs", priceGroupOverrideId?: string | null) => {
    const product = products?.find(p => p.id === productId);
    if (!product) return;

    const currentPriceType = selectedPriceType || priceType;
    const effectivePriceGroupId = priceGroupOverrideId !== undefined ? priceGroupOverrideId : sectionPriceGroupId;

    setIsLoadingPrice(true);
    try {
      const priceResult = await fetchProductPrice(productId, sectionRangeId || null, overrideId, quoteDefaultRangeId, undefined, effectivePriceGroupId);
      if (priceResult.price != null) {
        setUnitPrice(priceResult.price.toString());
        setPriceSource(priceResult.source);
      } else {
        const bookPrice = (product as any).book_price;
        if (currentPriceType === "boekprijs" && bookPrice != null) {
          setUnitPrice(bookPrice.toString());
          setPriceSource("base_price");
        } else if (product.base_price) {
          setUnitPrice(product.base_price.toString());
          setPriceSource("base_price");
        }
      }
    } catch (error) {
      console.error("Error fetching price:", error);
      if (product.base_price) {
        setUnitPrice(product.base_price.toString());
        setPriceSource("base_price");
      }
    } finally {
      setIsLoadingPrice(false);
    }
  };

  const handlePriceTypeChange = (value: string) => {
    const newType = value as "abitare" | "boekprijs";
    setPriceType(newType);
    if (!selectedProductId) return;

    const product = products?.find(p => p.id === selectedProductId);
    if (!product) return;

    const bookPrice = (product as any).book_price;
    if (priceSource === "base_price" || !priceSource) {
      if (newType === "boekprijs" && bookPrice != null) {
        setUnitPrice(bookPrice.toString());
      } else if (product.base_price != null) {
        setUnitPrice(product.base_price.toString());
      }
    }
  };

  const handleOverrideChange = (value: string) => {
    const newOverrideId = value === "none" ? null : value;
    setOverrideRangeId(newOverrideId);
    if (selectedProductId) {
      refetchPrice(selectedProductId, hasPriceGroups ? null : newOverrideId, undefined, hasPriceGroups ? newOverrideId : undefined);
    }
  };

  const handleSubmitProduct = async () => {
    if (!selectedProduct) return;

    try {
      const lineData: any = {
        quote_id: quoteId,
        section_id: sectionId,
        product_id: selectedProduct.id,
        article_code: selectedProduct.article_code,
        description: selectedProduct.name,
        quantity: parseFloat(quantity) || 1,
        unit: selectedProduct.unit || "stuk",
        unit_price: parseFloat(unitPrice) || selectedProduct.base_price || 0,
        discount_percentage: parseFloat(discount) || 0,
        vat_rate: selectedProduct.vat_rate || 21,
        height_mm: heightMm ? parseInt(heightMm) : null,
        width_mm: widthMm ? parseInt(widthMm) : null,
        extra_description: extraDescription.trim() || null,
        price_type: priceType,
      };

      if (overrideRangeId && !hasPriceGroups) {
        lineData.range_override_id = overrideRangeId;
      }

      await createLine.mutateAsync(lineData);

      toast({
        title: "Product toegevoegd",
        description: `${selectedProduct.name} is toegevoegd aan de offerte.`,
      });

      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding product:", error);
      toast({
        title: "Fout bij toevoegen",
        description: "Er is iets misgegaan. Probeer het opnieuw.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitFreeLine = async () => {
    if (isGroupHeader) {
      if (!groupTitle.trim()) {
        toast({ title: "Titel verplicht", description: "Vul een titel in voor de groepkop.", variant: "destructive" });
        return;
      }

      try {
        await createLine.mutateAsync({
          quote_id: quoteId, section_id: sectionId, product_id: null, article_code: null,
          description: groupTitle.trim(), group_title: groupTitle.trim(), is_group_header: true,
          quantity: 0, unit: "stuk", unit_price: 0, discount_percentage: 0, vat_rate: 0,
        });
        toast({ title: "Groepkop toegevoegd", description: "De groepkop is toegevoegd aan de offerte." });
        resetForm();
        onOpenChange(false);
      } catch (error) {
        console.error("Error adding group header:", error);
        toast({ title: "Fout bij toevoegen", description: "Er is iets misgegaan.", variant: "destructive" });
      }
      return;
    }

    if (!freeDescription.trim()) {
      toast({ title: "Omschrijving verplicht", description: "Vul een omschrijving in voor de vrije regel.", variant: "destructive" });
      return;
    }

    try {
      await createLine.mutateAsync({
        quote_id: quoteId, section_id: sectionId, product_id: null,
        article_code: freeArticleCode.trim() || null,
        description: freeDescription.trim(),
        quantity: parseFloat(freeQuantity) || 1, unit: "stuk",
        unit_price: parseFloat(freePrice) || 0, discount_percentage: 0, vat_rate: 21,
        height_mm: freeHeightMm ? parseInt(freeHeightMm) : null,
        width_mm: freeWidthMm ? parseInt(freeWidthMm) : null,
        extra_description: freeExtraDescription.trim() || null,
      });
      toast({ title: "Regel toegevoegd", description: "De vrije regel is toegevoegd aan de offerte." });
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding free line:", error);
      toast({ title: "Fout bij toevoegen", description: "Er is iets misgegaan.", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setProductSearch("");
    setSelectedProductId(null);
    setQuantity("1");
    setUnitPrice("");
    setDiscount("0");
    setHeightMm("");
    setWidthMm("");
    setExtraDescription("");
    setPriceSource(null);
    setOverrideRangeId(null);
    setPriceType("abitare");
    setAdvancedOpen(false);
    setFreeDescription("");
    setFreeArticleCode("");
    setFreePrice("");
    setFreeQuantity("1");
    setFreeHeightMm("");
    setFreeWidthMm("");
    setFreeExtraDescription("");
    setIsGroupHeader(false);
    setGroupTitle("");
    setShowAllSuppliers(false);
    setCategoryFilter("");
    setWidthFilter("all");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); onOpenChange(isOpen); }}>
      <DialogContent className="sm:max-w-[920px] h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle>Product toevoegen</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="product" className="flex-1 flex flex-col overflow-hidden px-6 pb-6">
          <TabsList className="grid w-full grid-cols-2 shrink-0">
            <TabsTrigger value="product">Uit catalogus</TabsTrigger>
            <TabsTrigger value="free">Vrije regel</TabsTrigger>
          </TabsList>

          {/* ───── PRODUCT TAB: Two-panel layout ───── */}
          <TabsContent value="product" className="flex-1 overflow-hidden mt-4">
            <div className="flex gap-5 h-full overflow-hidden">
              {/* ── Left panel: search + filters + product list ── */}
              <div className="flex-1 flex flex-col gap-3 overflow-hidden min-w-0">
                {/* Search bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Zoek op artikelcode of naam..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Filters row */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { value: "", label: "Alle" },
                    { value: "onderkast", label: "Onderkast" },
                    { value: "bovenkast", label: "Bovenkast" },
                    { value: "hoge_kast", label: "Hoge kast" },
                    { value: "apparatuur", label: "Apparatuur" },
                  ].map((cat) => (
                    <Button
                      key={cat.value}
                      variant={categoryFilter === cat.value ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setCategoryFilter(cat.value)}
                    >
                      {cat.label}
                    </Button>
                  ))}

                  <div className="ml-auto flex items-center gap-2">
                    <Select value={widthFilter} onValueChange={setWidthFilter}>
                      <SelectTrigger className="h-7 text-xs w-24">
                        <SelectValue placeholder="Breedte" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        <SelectItem value="300">30 cm</SelectItem>
                        <SelectItem value="450">45 cm</SelectItem>
                        <SelectItem value="600">60 cm</SelectItem>
                        <SelectItem value="900">90 cm</SelectItem>
                        <SelectItem value="1200">120 cm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Supplier toggle */}
                {sectionSupplierId && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="showAllSuppliers"
                      checked={showAllSuppliers}
                      onCheckedChange={(checked) => setShowAllSuppliers(checked === true)}
                    />
                    <Label htmlFor="showAllSuppliers" className="text-xs font-normal cursor-pointer">
                      Toon alle leveranciers
                    </Label>
                  </div>
                )}

                {/* Product list */}
                <ScrollArea className="flex-1 border rounded-md">
                  {productsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Package className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">Geen producten gevonden</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredProducts.map((product: any) => (
                        <button
                          key={product.id}
                          type="button"
                          className={cn(
                            "w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors focus:outline-none focus:bg-accent/50",
                            selectedProductId === product.id && "bg-accent ring-1 ring-primary/20"
                          )}
                          onClick={() => handleProductSelect(product.id)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">
                                {product.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {product.article_code}
                                {product.supplier?.name && (
                                  <span className="ml-1.5 opacity-60">• {product.supplier.name}</span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {product.width_mm && (
                                <span className="text-xs text-muted-foreground">{product.width_mm}mm</span>
                              )}
                              {product.energy_label && (
                                <Badge variant="outline" className="text-[10px] h-4 px-1">
                                  {product.energy_label}
                                </Badge>
                              )}
                              {product.base_price != null && (
                                <span className="text-xs font-medium tabular-nums">
                                  € {product.base_price.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <p className="text-xs text-muted-foreground">
                  {filteredProducts.length} product{filteredProducts.length !== 1 ? "en" : ""}
                </p>
              </div>

              {/* ── Right panel: form ── */}
              <div className="w-[320px] shrink-0 border-l pl-5 flex flex-col overflow-y-auto">
                {selectedProduct ? (
                  <div className="flex flex-col gap-4">
                    {/* Selected product header */}
                    <div className="rounded-md border bg-muted/30 p-3">
                      <p className="text-sm font-semibold truncate">{selectedProduct.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedProduct.article_code}</p>
                      {priceSource && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Badge
                            variant={priceSource === "override_price" ? "destructive" : priceSource === "range_price" || priceSource === "quote_default_price" ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {priceSource === "override_price" ? "Override" : priceSource === "range_price" ? "Prijsgroep" : priceSource === "quote_default_price" ? "Offerte-standaard" : priceType === "boekprijs" ? "Boekprijs" : "Abitare"}
                          </Badge>
                          {isLoadingPrice && <Loader2 className="h-3 w-3 animate-spin" />}
                        </div>
                      )}
                    </div>

                    {/* Core fields in compact grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Prijs (€)</Label>
                        <Input
                          type="number" min="0" step="0.01"
                          value={unitPrice}
                          onChange={(e) => setUnitPrice(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Aantal</Label>
                        <Input
                          type="number" min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Hoogte (mm)</Label>
                        <Input
                          type="number" min="0" placeholder="—"
                          value={heightMm}
                          onChange={(e) => setHeightMm(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Breedte (mm)</Label>
                        <Input
                          type="number" min="0" placeholder="—"
                          value={widthMm}
                          onChange={(e) => setWidthMm(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Extra description */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Extra omschrijving</Label>
                      <Input
                        placeholder="Bijv. Passtuk hoge kast 132 x 2340mm"
                        value={extraDescription}
                        onChange={(e) => setExtraDescription(e.target.value)}
                      />
                    </div>

                    {/* Advanced options (collapsible) */}
                    <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground h-7 px-1">
                          {advancedOpen ? "▾" : "▸"} Geavanceerde opties
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-3 pt-2">
                        {/* Price type */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">Prijstype</Label>
                          <RadioGroup
                            value={priceType}
                            onValueChange={handlePriceTypeChange}
                            className="flex gap-3"
                          >
                            <div className="flex items-center space-x-1.5">
                              <RadioGroupItem value="abitare" id="price-abitare" />
                              <Label htmlFor="price-abitare" className="text-xs font-normal cursor-pointer">
                                Abitare
                                {selectedProduct?.base_price != null && (
                                  <span className="text-muted-foreground ml-1">(€{selectedProduct.base_price.toFixed(2)})</span>
                                )}
                              </Label>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <RadioGroupItem value="boekprijs" id="price-boek" />
                              <Label htmlFor="price-boek" className="text-xs font-normal cursor-pointer">
                                Boek
                                {(selectedProduct as any)?.book_price != null && (
                                  <span className="text-muted-foreground ml-1">(€{(selectedProduct as any).book_price.toFixed(2)})</span>
                                )}
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {/* Override range / price group */}
                        {((ranges?.length ?? 0) > 0 || hasPriceGroups) && (
                          <div className="space-y-1.5">
                            <Label className="text-xs">Override prijsgroep</Label>
                            <Select value={overrideRangeId || "none"} onValueChange={handleOverrideChange}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Geen override" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Geen override</SelectItem>
                                {hasPriceGroups
                                  ? priceGroups?.map((pg) => (
                                      <SelectItem key={pg.id} value={pg.id}>
                                        {pg.code} - {pg.name}
                                      </SelectItem>
                                    ))
                                  : ranges?.map((range) => (
                                      <SelectItem key={range.id} value={range.id}>
                                        {range.code} - {range.name || range.collection || ""}
                                      </SelectItem>
                                    ))
                                }
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Discount */}
                        <div className="space-y-1.5">
                          <Label className="text-xs">Korting (%)</Label>
                          <Input
                            type="number" min="0" max="100" step="0.1"
                            value={discount}
                            onChange={(e) => setDiscount(e.target.value)}
                          />
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Submit */}
                    <div className="flex gap-2 pt-2 mt-auto">
                      <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                        Annuleren
                      </Button>
                      <Button className="flex-1" onClick={handleSubmitProduct} disabled={createLine.isPending}>
                        {createLine.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Toevoegen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                    <Package className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Selecteer een product</p>
                    <p className="text-xs mt-1 text-center">Klik op een product in de lijst om het te configureren.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ───── FREE LINE TAB ───── */}
          <TabsContent value="free" className="mt-4 space-y-4">
            {/* Group header toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="group-header"
                checked={isGroupHeader}
                onCheckedChange={(checked) => setIsGroupHeader(checked === true)}
              />
              <Label htmlFor="group-header" className="text-sm">
                Groepkop (bijv. "Eiland bestaande uit:")
              </Label>
            </div>

            {isGroupHeader ? (
              <div className="space-y-2">
                <Label>Groeptitel *</Label>
                <Input
                  placeholder="Eiland bestaande uit:"
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Omschrijving *</Label>
                    <Textarea
                      placeholder="Omschrijving van het product of de dienst..."
                      value={freeDescription}
                      onChange={(e) => setFreeDescription(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Extra omschrijving</Label>
                    <Input
                      placeholder="Tweede regel omschrijving"
                      value={freeExtraDescription}
                      onChange={(e) => setFreeExtraDescription(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Artikelcode</Label>
                    <Input placeholder="Optioneel" value={freeArticleCode} onChange={(e) => setFreeArticleCode(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Hoogte (mm)</Label>
                    <Input type="number" min="0" value={freeHeightMm} onChange={(e) => setFreeHeightMm(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Breedte (mm)</Label>
                    <Input type="number" min="0" value={freeWidthMm} onChange={(e) => setFreeWidthMm(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Aantal</Label>
                    <Input type="number" min="1" value={freeQuantity} onChange={(e) => setFreeQuantity(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Prijs (€)</Label>
                    <Input type="number" min="0" step="0.01" placeholder="0.00" value={freePrice} onChange={(e) => setFreePrice(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Annuleren</Button>
              <Button onClick={handleSubmitFreeLine} disabled={createLine.isPending}>
                {createLine.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Plus className="mr-2 h-4 w-4" />
                Toevoegen
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
