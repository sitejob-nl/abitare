import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuoteSection, useUpdateQuoteSection } from "@/hooks/useQuoteSections";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProductRanges } from "@/hooks/useProductRanges";
import { useProductColors } from "@/hooks/useProductColors";
import { usePriceGroups } from "@/hooks/usePriceGroups";
import { usePriceGroupColors } from "@/hooks/usePriceGroupColors";
import { toast } from "@/hooks/use-toast";

interface QuoteSectionConfigProps {
  section: QuoteSection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuoteSectionConfig({ section, open, onOpenChange }: QuoteSectionConfigProps) {
  const updateSection = useUpdateQuoteSection();
  
  const [formData, setFormData] = useState({
    description: section.description || "",
    range_id: section.range_id || "",
    color_id: section.color_id || "",
    price_group_id: (section as any).price_group_id || "",
    front_number: section.front_number || "",
    front_color: section.front_color || "",
    plinth_color: section.plinth_color || "",
    corpus_color: section.corpus_color || "",
    hinge_color: section.hinge_color || "",
    drawer_color: section.drawer_color || "",
    handle_number: section.handle_number || "",
    column_height_mm: section.column_height_mm?.toString() || "",
    countertop_height_mm: section.countertop_height_mm?.toString() || "",
    countertop_thickness_mm: section.countertop_thickness_mm?.toString() || "",
    workbench_material: section.workbench_material || "",
    workbench_edge: section.workbench_edge || "",
    workbench_color: section.workbench_color || "",
    show_prices: (section as any).show_prices !== false,
  });

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");

  // Fetch data
  const { data: suppliers = [] } = useSuppliers();
  const { data: allRanges = [] } = useProductRanges(selectedSupplierId || undefined);
  const { data: allColors = [] } = useProductColors(formData.range_id || null);
  
  // Check if selected supplier has price groups
  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
  const hasPriceGroups = selectedSupplier?.has_price_groups === true;
  
  const { data: priceGroups = [] } = usePriceGroups(
    hasPriceGroups ? selectedSupplierId : undefined
  );
  const { data: priceGroupColors = [] } = usePriceGroupColors(
    formData.price_group_id || undefined
  );

  // Filter colors by type
  const frontColors = allColors.filter((c) => (c as any).color_type === "front" || !(c as any).color_type);
  const corpusColors = allColors.filter((c) => (c as any).color_type === "corpus");
  const hingeColors = allColors.filter((c) => (c as any).color_type === "hinge");
  const drawerColors = allColors.filter((c) => (c as any).color_type === "drawer");
  const plinthColors = allColors.filter((c) => (c as any).color_type === "plinth");

  // Ranges are already filtered by supplier via the hook
  const filteredRanges = allRanges;

  useEffect(() => {
    setFormData({
      description: section.description || "",
      range_id: section.range_id || "",
      color_id: section.color_id || "",
      price_group_id: (section as any).price_group_id || "",
      front_number: section.front_number || "",
      front_color: section.front_color || "",
      plinth_color: section.plinth_color || "",
      corpus_color: section.corpus_color || "",
      hinge_color: section.hinge_color || "",
      drawer_color: section.drawer_color || "",
      handle_number: section.handle_number || "",
      column_height_mm: section.column_height_mm?.toString() || "",
      countertop_height_mm: section.countertop_height_mm?.toString() || "",
      countertop_thickness_mm: section.countertop_thickness_mm?.toString() || "",
      workbench_material: section.workbench_material || "",
      workbench_edge: section.workbench_edge || "",
      workbench_color: section.workbench_color || "",
      show_prices: (section as any).show_prices !== false,
    });

    if (section.range_id) {
      const existingRange = allRanges.find((r) => r.id === section.range_id);
      if (existingRange?.supplier_id) {
        setSelectedSupplierId(existingRange.supplier_id);
      }
    }
  }, [section, allRanges]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setFormData((prev) => ({
      ...prev,
      range_id: "",
      color_id: "",
      price_group_id: "",
    }));
  };

  const handleRangeChange = (rangeId: string) => {
    const selectedRange = allRanges.find((r) => r.id === rangeId);
    setFormData((prev) => ({
      ...prev,
      range_id: rangeId,
      color_id: "",
      front_number: selectedRange?.code || prev.front_number,
    }));
  };

  const handlePriceGroupChange = (pgId: string) => {
    setFormData((prev) => ({
      ...prev,
      price_group_id: pgId,
      // Reset front color when price group changes (colors differ per group)
      front_color: "",
    }));
  };

  const handleColorChange = (colorId: string) => {
    const selectedColor = frontColors.find((c) => c.id === colorId);
    setFormData((prev) => ({
      ...prev,
      color_id: colorId,
      front_color: selectedColor?.name || prev.front_color,
    }));
  };

  const handlePriceGroupColorSelect = (colorCode: string) => {
    const pgColor = priceGroupColors.find(c => c.color_code === colorCode);
    setFormData((prev) => ({
      ...prev,
      front_color: pgColor?.color_name || colorCode,
    }));
  };

  const handleCorpusColorChange = (colorId: string) => {
    const selectedColor = corpusColors.find((c) => c.id === colorId);
    setFormData((prev) => ({
      ...prev,
      corpus_color: selectedColor?.name || "",
    }));
  };

  const handleHingeColorChange = (colorId: string) => {
    const selectedColor = hingeColors.find((c) => c.id === colorId);
    setFormData((prev) => ({
      ...prev,
      hinge_color: selectedColor?.name || "",
    }));
  };

  const handleDrawerColorChange = (colorId: string) => {
    const selectedColor = drawerColors.find((c) => c.id === colorId);
    setFormData((prev) => ({
      ...prev,
      drawer_color: selectedColor?.name || "",
    }));
  };

  const handlePlinthColorChange = (colorId: string) => {
    const selectedColor = plinthColors.find((c) => c.id === colorId);
    setFormData((prev) => ({
      ...prev,
      plinth_color: selectedColor?.name || "",
    }));
  };

  const handleSave = async () => {
    try {
      await updateSection.mutateAsync({
        id: section.id,
        description: formData.description || null,
        range_id: formData.range_id || null,
        color_id: formData.color_id || null,
        price_group_id: formData.price_group_id || null,
        front_number: formData.front_number || null,
        front_color: formData.front_color || null,
        plinth_color: formData.plinth_color || null,
        corpus_color: formData.corpus_color || null,
        hinge_color: formData.hinge_color || null,
        drawer_color: formData.drawer_color || null,
        handle_number: formData.handle_number || null,
        column_height_mm: formData.column_height_mm ? parseInt(formData.column_height_mm) : null,
        countertop_height_mm: formData.countertop_height_mm ? parseInt(formData.countertop_height_mm) : null,
        countertop_thickness_mm: formData.countertop_thickness_mm ? parseInt(formData.countertop_thickness_mm) : null,
        workbench_material: formData.workbench_material || null,
        workbench_edge: formData.workbench_edge || null,
        workbench_color: formData.workbench_color || null,
        show_prices: formData.show_prices,
      });

      toast({
        title: "Configuratie opgeslagen",
        description: "De sectie-instellingen zijn bijgewerkt.",
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Fout bij opslaan",
        description: "Er is iets misgegaan. Probeer het opnieuw.",
        variant: "destructive",
      });
    }
  };

  const isMeubelen = section.section_type === "meubelen";
  const isWerkblad = section.section_type === "werkbladen";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Sectie configuratie
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Description for all section types */}
          <div className="space-y-2">
            <Label>Beschrijving / Omschrijving</Label>
            <Textarea
              placeholder="Stosa Evolution Metropolis greeploos front met kunststof toplaag..."
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={2}
            />
          </div>

          {/* PDF price visibility per section */}
          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
            <Label htmlFor="sectionShowPrices" className="text-sm font-normal">
              Prijzen tonen in PDF voor deze sectie
            </Label>
            <Switch
              id="sectionShowPrices"
              checked={formData.show_prices}
              onCheckedChange={(v) => setFormData(prev => ({ ...prev, show_prices: v }))}
            />
          </div>

          {/* Supplier, Range, Price Group, Color selection (for meubelen) */}
          {isMeubelen && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">
                {hasPriceGroups ? "Model, Prijsgroep & Kleur" : "Prijsgroep & Kleur"}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Leverancier</Label>
                  <Select value={selectedSupplierId} onValueChange={handleSupplierChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer leverancier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Geen</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {filteredRanges.length > 0 && (
                  <div className="space-y-2">
                    <Label>{hasPriceGroups ? "Model / Collectie" : "Assortiment"}</Label>
                    <Select
                      value={formData.range_id}
                      onValueChange={handleRangeChange}
                      disabled={!selectedSupplierId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={hasPriceGroups ? "Selecteer model" : "Selecteer assortiment"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Geen</SelectItem>
                        {filteredRanges.map((range) => (
                          <SelectItem key={range.id} value={range.id}>
                            {range.code}
                            {range.name ? ` - ${range.name}` : ""}
                            {range.price_group ? ` (Groep ${range.price_group})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Price Group dropdown for suppliers with price groups */}
                {hasPriceGroups && (
                  <div className="space-y-2">
                    <Label>Prijsgroep</Label>
                    <Select
                      value={formData.price_group_id}
                      onValueChange={handlePriceGroupChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer prijsgroep (E1-E10)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Geen</SelectItem>
                        {priceGroups.map((pg) => (
                          <SelectItem key={pg.id} value={pg.id}>
                            {pg.code} - {pg.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Front color: from price_group_colors if available, otherwise from product_colors */}
                {hasPriceGroups && formData.price_group_id ? (
                  <div className="space-y-2">
                    <Label>Kleur (uit prijsgroep)</Label>
                    <Select
                      value={priceGroupColors.find(c => c.color_name === formData.front_color)?.color_code || ""}
                      onValueChange={handlePriceGroupColorSelect}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer kleur" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Geen</SelectItem>
                        {priceGroupColors.map((color) => (
                          <SelectItem key={color.id} value={color.color_code}>
                            {color.color_code} - {color.color_name}
                            {color.material_type ? ` (${color.material_type})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {priceGroupColors.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Nog geen kleuren geconfigureerd voor deze prijsgroep
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Kleur (uit prijsgroep)</Label>
                    <Select
                      value={formData.color_id}
                      onValueChange={handleColorChange}
                      disabled={!formData.range_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer kleur" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Geen</SelectItem>
                        {frontColors.map((color) => (
                          <SelectItem key={color.id} value={color.id}>
                            <div className="flex items-center gap-2">
                              {color.hex_color && (
                                <div
                                  className="w-3 h-3 rounded border"
                                  style={{ backgroundColor: color.hex_color }}
                                />
                              )}
                              {color.code} - {color.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Meubelen specific fields */}
          {isMeubelen && (
            <>
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Front & Kleuren</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Frontnummer</Label>
                    <Input
                      placeholder="MPTS GL LB"
                      value={formData.front_number}
                      onChange={(e) => handleChange("front_number", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kleur front</Label>
                    {frontColors.length > 0 && !hasPriceGroups ? (
                      <Select
                        value={frontColors.find((c) => c.name === formData.front_color)?.id || ""}
                        onValueChange={(id) => {
                          const color = frontColors.find((c) => c.id === id);
                          handleChange("front_color", color?.name || "");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer kleur" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Geen</SelectItem>
                          {frontColors.map((color) => (
                            <SelectItem key={color.id} value={color.id}>
                              <div className="flex items-center gap-2">
                                {color.hex_color && (
                                  <div className="w-3 h-3 rounded border" style={{ backgroundColor: color.hex_color }} />
                                )}
                                {color.code} - {color.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Rovere Nodato"
                        value={formData.front_color}
                        onChange={(e) => handleChange("front_color", e.target.value)}
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Plintkleur</Label>
                    {plinthColors.length > 0 ? (
                      <Select
                        value={plinthColors.find((c) => c.name === formData.plinth_color)?.id || ""}
                        onValueChange={(id) => handlePlinthColorChange(id)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer kleur" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Geen</SelectItem>
                          {plinthColors.map((color) => (
                            <SelectItem key={color.id} value={color.id}>
                              {color.code} - {color.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Bronze"
                        value={formData.plinth_color}
                        onChange={(e) => handleChange("plinth_color", e.target.value)}
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Corpuskleur</Label>
                    {corpusColors.length > 0 ? (
                      <Select
                        value={corpusColors.find((c) => c.name === formData.corpus_color)?.id || ""}
                        onValueChange={(id) => handleCorpusColorChange(id)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer kleur" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Geen</SelectItem>
                          {corpusColors.map((color) => (
                            <SelectItem key={color.id} value={color.id}>
                              {color.code} - {color.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Rose"
                        value={formData.corpus_color}
                        onChange={(e) => handleChange("corpus_color", e.target.value)}
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Scharnier kleur</Label>
                    {hingeColors.length > 0 ? (
                      <Select
                        value={hingeColors.find((c) => c.name === formData.hinge_color)?.id || ""}
                        onValueChange={(id) => handleHingeColorChange(id)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer kleur" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Geen</SelectItem>
                          {hingeColors.map((color) => (
                            <SelectItem key={color.id} value={color.id}>
                              {color.code} - {color.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Peltro"
                        value={formData.hinge_color}
                        onChange={(e) => handleChange("hinge_color", e.target.value)}
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Lade kleur</Label>
                    {drawerColors.length > 0 ? (
                      <Select
                        value={drawerColors.find((c) => c.name === formData.drawer_color)?.id || ""}
                        onValueChange={(id) => handleDrawerColorChange(id)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer kleur" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Geen</SelectItem>
                          {drawerColors.map((color) => (
                            <SelectItem key={color.id} value={color.id}>
                              {color.code} - {color.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Titanium"
                        value={formData.drawer_color}
                        onChange={(e) => handleChange("drawer_color", e.target.value)}
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Greepnummer</Label>
                    <Input
                      placeholder="Greeploos"
                      value={formData.handle_number}
                      onChange={(e) => handleChange("handle_number", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Afmetingen</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Kolomkast hoogte (mm)</Label>
                    <Input
                      type="number"
                      placeholder="2400"
                      value={formData.column_height_mm}
                      onChange={(e) => handleChange("column_height_mm", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Aanrecht hoogte (mm)</Label>
                    <Input
                      type="number"
                      placeholder="970"
                      value={formData.countertop_height_mm}
                      onChange={(e) => handleChange("countertop_height_mm", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Blad dikte (mm)</Label>
                    <Input
                      type="number"
                      placeholder="60"
                      value={formData.countertop_thickness_mm}
                      onChange={(e) => handleChange("countertop_thickness_mm", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Werkblad specific fields */}
          {isWerkblad && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3 text-muted-foreground">Werkblad specificaties</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Uitvoering / Materiaal</Label>
                  <Input
                    placeholder="Keramiek 12 mm dikte met facet randafwerking"
                    value={formData.workbench_material}
                    onChange={(e) => handleChange("workbench_material", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Randafwerking</Label>
                  <Input
                    placeholder="1P"
                    value={formData.workbench_edge}
                    onChange={(e) => handleChange("workbench_edge", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kleur</Label>
                  <Input
                    placeholder="QUARZO GOLD ARTON BM"
                    value={formData.workbench_color}
                    onChange={(e) => handleChange("workbench_color", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={updateSection.isPending}>
            Opslaan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Inline config display component for section header
interface SectionConfigDisplayProps {
  section: QuoteSection;
}

export function SectionConfigDisplay({ section }: SectionConfigDisplayProps) {
  const isMeubelen = section.section_type === "meubelen";
  const isWerkblad = section.section_type === "werkbladen";

  const hasConfig = section.description || 
    (isMeubelen && (section.front_number || section.front_color || section.plinth_color)) ||
    (isWerkblad && (section.workbench_material || section.workbench_edge));

  if (!hasConfig) return null;

  return (
    <div className="px-4 py-3 bg-muted/20 border-b text-sm">
      {section.description && (
        <p className="text-muted-foreground mb-2">{section.description}</p>
      )}
      
      {isMeubelen && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 text-xs">
          {section.front_number && (
            <div>
              <span className="text-muted-foreground">Frontnummer:</span>{" "}
              <span className="font-medium">{section.front_number}</span>
            </div>
          )}
          {section.front_color && (
            <div>
              <span className="text-muted-foreground">Kleur front:</span>{" "}
              <span className="font-medium">{section.front_color}</span>
            </div>
          )}
          {section.plinth_color && (
            <div>
              <span className="text-muted-foreground">Plintkleur:</span>{" "}
              <span className="font-medium">{section.plinth_color}</span>
            </div>
          )}
          {section.corpus_color && (
            <div>
              <span className="text-muted-foreground">Corpuskleur:</span>{" "}
              <span className="font-medium">{section.corpus_color}</span>
            </div>
          )}
          {section.hinge_color && (
            <div>
              <span className="text-muted-foreground">Scharnier kleur:</span>{" "}
              <span className="font-medium">{section.hinge_color}</span>
            </div>
          )}
          {section.drawer_color && (
            <div>
              <span className="text-muted-foreground">Lade kleur:</span>{" "}
              <span className="font-medium">{section.drawer_color}</span>
            </div>
          )}
          {section.handle_number && (
            <div>
              <span className="text-muted-foreground">Greepnummer:</span>{" "}
              <span className="font-medium">{section.handle_number}</span>
            </div>
          )}
          {section.column_height_mm && (
            <div>
              <span className="text-muted-foreground">Kolomkast hoogte:</span>{" "}
              <span className="font-medium">{section.column_height_mm} mm</span>
            </div>
          )}
          {section.countertop_height_mm && (
            <div>
              <span className="text-muted-foreground">Aanrecht hoogte:</span>{" "}
              <span className="font-medium">{section.countertop_height_mm} mm</span>
            </div>
          )}
          {section.countertop_thickness_mm && (
            <div>
              <span className="text-muted-foreground">Blad dikte:</span>{" "}
              <span className="font-medium">{section.countertop_thickness_mm} mm</span>
            </div>
          )}
        </div>
      )}

      {isWerkblad && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-1 text-xs">
          {section.workbench_material && (
            <div className="md:col-span-3">
              <span className="text-muted-foreground">Uitvoering:</span>{" "}
              <span className="font-medium">{section.workbench_material}</span>
            </div>
          )}
          {section.workbench_edge && (
            <div>
              <span className="text-muted-foreground">Randafwerking:</span>{" "}
              <span className="font-medium">{section.workbench_edge}</span>
            </div>
          )}
          {section.workbench_color && (
            <div>
              <span className="text-muted-foreground">Kleur:</span>{" "}
              <span className="font-medium">{section.workbench_color}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
