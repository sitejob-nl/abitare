import { useState, useMemo, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts";
import { useCreateQuoteLine } from "@/hooks/useQuoteLines";
import { fetchProductPrice } from "@/hooks/useProductPrices";
import { toast } from "@/hooks/use-toast";

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  sectionId: string;
  sectionRangeId?: string | null; // Pass the section's range_id for price lookup
}

export function AddProductDialog({
  open,
  onOpenChange,
  quoteId,
  sectionId,
  sectionRangeId,
}: AddProductDialogProps) {
  const createLine = useCreateQuoteLine();
  
  // Product search
  const [productSearch, setProductSearch] = useState("");
  const [productOpen, setProductOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  // Form fields
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [discount, setDiscount] = useState("0");
  const [heightMm, setHeightMm] = useState("");
  const [widthMm, setWidthMm] = useState("");
  const [extraDescription, setExtraDescription] = useState("");
  const [priceSource, setPriceSource] = useState<"range_price" | "base_price" | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  
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

  const { data: products, isLoading: productsLoading } = useProducts({
    search: productSearch || undefined,
    limit: 20,
    enabled: open,
  });

  const selectedProduct = useMemo(() => {
    return products?.find((p) => p.id === selectedProductId);
  }, [products, selectedProductId]);

  // When product is selected, prefill price and dimensions
  const handleProductSelect = async (productId: string) => {
    setSelectedProductId(productId);
    setProductOpen(false);
    
    const product = products?.find(p => p.id === productId);
    if (!product) return;

    // Prefill dimensions
    if (product.height_mm) {
      setHeightMm(product.height_mm.toString());
    }
    if (product.width_mm) {
      setWidthMm(product.width_mm.toString());
    }

    // Fetch price from product_prices based on section range
    setIsLoadingPrice(true);
    try {
      const priceResult = await fetchProductPrice(productId, sectionRangeId || null);
      if (priceResult.price != null) {
        setUnitPrice(priceResult.price.toString());
        setPriceSource(priceResult.source);
      } else if (product.base_price) {
        setUnitPrice(product.base_price.toString());
        setPriceSource("base_price");
      }
    } catch (error) {
      console.error("Error fetching price:", error);
      // Fallback to base_price
      if (product.base_price) {
        setUnitPrice(product.base_price.toString());
        setPriceSource("base_price");
      }
    } finally {
      setIsLoadingPrice(false);
    }
  };

  const handleSubmitProduct = async () => {
    if (!selectedProduct) return;

    try {
      await createLine.mutateAsync({
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
      });

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
    // If group header, only require title
    if (isGroupHeader) {
      if (!groupTitle.trim()) {
        toast({
          title: "Titel verplicht",
          description: "Vul een titel in voor de groepkop.",
          variant: "destructive",
        });
        return;
      }

      try {
        await createLine.mutateAsync({
          quote_id: quoteId,
          section_id: sectionId,
          product_id: null,
          article_code: null,
          description: groupTitle.trim(),
          group_title: groupTitle.trim(),
          is_group_header: true,
          quantity: 0,
          unit: "stuk",
          unit_price: 0,
          discount_percentage: 0,
          vat_rate: 0,
        });

        toast({
          title: "Groepkop toegevoegd",
          description: "De groepkop is toegevoegd aan de offerte.",
        });

        resetForm();
        onOpenChange(false);
      } catch (error) {
        console.error("Error adding group header:", error);
        toast({
          title: "Fout bij toevoegen",
          description: "Er is iets misgegaan. Probeer het opnieuw.",
          variant: "destructive",
        });
      }
      return;
    }

    if (!freeDescription.trim()) {
      toast({
        title: "Omschrijving verplicht",
        description: "Vul een omschrijving in voor de vrije regel.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createLine.mutateAsync({
        quote_id: quoteId,
        section_id: sectionId,
        product_id: null,
        article_code: freeArticleCode.trim() || null,
        description: freeDescription.trim(),
        quantity: parseFloat(freeQuantity) || 1,
        unit: "stuk",
        unit_price: parseFloat(freePrice) || 0,
        discount_percentage: 0,
        vat_rate: 21,
        height_mm: freeHeightMm ? parseInt(freeHeightMm) : null,
        width_mm: freeWidthMm ? parseInt(freeWidthMm) : null,
        extra_description: freeExtraDescription.trim() || null,
      });

      toast({
        title: "Regel toegevoegd",
        description: "De vrije regel is toegevoegd aan de offerte.",
      });

      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding free line:", error);
      toast({
        title: "Fout bij toevoegen",
        description: "Er is iets misgegaan. Probeer het opnieuw.",
        variant: "destructive",
      });
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
    setFreeDescription("");
    setFreeArticleCode("");
    setFreePrice("");
    setFreeQuantity("1");
    setFreeHeightMm("");
    setFreeWidthMm("");
    setFreeExtraDescription("");
    setIsGroupHeader(false);
    setGroupTitle("");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Product toevoegen</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="product" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="product">Uit catalogus</TabsTrigger>
            <TabsTrigger value="free">Vrije regel</TabsTrigger>
          </TabsList>

          <TabsContent value="product" className="space-y-4 mt-4">
            {/* Product Search */}
            <div className="space-y-2">
              <Label>Product *</Label>
              <Popover open={productOpen} onOpenChange={setProductOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    {selectedProduct
                      ? `${selectedProduct.article_code} - ${selectedProduct.name}`
                      : "Zoek een product..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Zoek op artikelcode of naam..."
                      value={productSearch}
                      onValueChange={setProductSearch}
                    />
                    <CommandList>
                      {productsLoading ? (
                        <div className="flex items-center justify-center py-6">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>Geen producten gevonden.</CommandEmpty>
                          <CommandGroup>
                            {products?.map((product) => (
                              <CommandItem
                                key={product.id}
                                value={product.id}
                                onSelect={() => handleProductSelect(product.id)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedProductId === product.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {product.article_code} - {product.name}
                                  </span>
                                  {product.base_price && (
                                    <span className="text-xs text-muted-foreground">
                                      Basisprijs: € {product.base_price.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {selectedProduct && (
              <>
                {/* Price indicator */}
                {priceSource && (
                  <div className="flex items-center gap-2">
                    <Badge variant={priceSource === "range_price" ? "default" : "secondary"}>
                      {priceSource === "range_price" ? "Prijsgroep prijs" : "Basisprijs"}
                    </Badge>
                    {isLoadingPrice && <Loader2 className="h-3 w-3 animate-spin" />}
                  </div>
                )}

                {/* Dimensions */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label>Hoogte (mm)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="hg"
                      value={heightMm}
                      onChange={(e) => setHeightMm(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Breedte (mm)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="br"
                      value={widthMm}
                      onChange={(e) => setWidthMm(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Aantal</Label>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prijs</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                    />
                  </div>
                </div>

                {/* Extra description */}
                <div className="space-y-2">
                  <Label>Extra omschrijving (optioneel)</Label>
                  <Input
                    placeholder="Bijv. Passtuk hoge kast 132 x 2340mm"
                    value={extraDescription}
                    onChange={(e) => setExtraDescription(e.target.value)}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Annuleren
                  </Button>
                  <Button
                    onClick={handleSubmitProduct}
                    disabled={createLine.isPending}
                  >
                    {createLine.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Toevoegen
                  </Button>
                </DialogFooter>
              </>
            )}
          </TabsContent>

          <TabsContent value="free" className="space-y-4 mt-4">
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
                  <Label>Extra omschrijving (optioneel)</Label>
                  <Input
                    placeholder="Tweede regel omschrijving"
                    value={freeExtraDescription}
                    onChange={(e) => setFreeExtraDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-5 gap-3">
                  <div className="space-y-2">
                    <Label>Artikelcode</Label>
                    <Input
                      placeholder="Optioneel"
                      value={freeArticleCode}
                      onChange={(e) => setFreeArticleCode(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>hg (mm)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder=""
                      value={freeHeightMm}
                      onChange={(e) => setFreeHeightMm(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>br (mm)</Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder=""
                      value={freeWidthMm}
                      onChange={(e) => setFreeWidthMm(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Aantal</Label>
                    <Input
                      type="number"
                      min="1"
                      value={freeQuantity}
                      onChange={(e) => setFreeQuantity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Prijs</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={freePrice}
                      onChange={(e) => setFreePrice(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuleren
              </Button>
              <Button
                onClick={handleSubmitFreeLine}
                disabled={createLine.isPending}
              >
                {createLine.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Plus className="mr-2 h-4 w-4" />
                Toevoegen
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
