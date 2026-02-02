import { useState, useEffect } from "react";
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
import { QuoteSection, useUpdateQuoteSection } from "@/hooks/useQuoteSections";
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
  });

  useEffect(() => {
    setFormData({
      description: section.description || "",
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
    });
  }, [section]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateSection.mutateAsync({
        id: section.id,
        description: formData.description || null,
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
                    <Input
                      placeholder="Rovere Nodato"
                      value={formData.front_color}
                      onChange={(e) => handleChange("front_color", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plintkleur</Label>
                    <Input
                      placeholder="Bronze"
                      value={formData.plinth_color}
                      onChange={(e) => handleChange("plinth_color", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Corpuskleur</Label>
                    <Input
                      placeholder="Rose"
                      value={formData.corpus_color}
                      onChange={(e) => handleChange("corpus_color", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Scharnier kleur</Label>
                    <Input
                      placeholder="Peltro"
                      value={formData.hinge_color}
                      onChange={(e) => handleChange("hinge_color", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lade kleur</Label>
                    <Input
                      placeholder="Titanium"
                      value={formData.drawer_color}
                      onChange={(e) => handleChange("drawer_color", e.target.value)}
                    />
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
