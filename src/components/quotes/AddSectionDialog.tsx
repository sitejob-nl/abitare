import { useState, useEffect, useMemo } from "react";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { useCreateQuoteSection, SECTION_TYPES } from "@/hooks/useQuoteSections";
import { useSupplier } from "@/hooks/useSuppliers";
import { isStosaSupplier } from "@/hooks/useStosaData";
import { toast } from "@/hooks/use-toast";
import type { SectionType, SectionWizardStep, StosaConfig } from "@/types/quote-sections";

import { SectionTypeSelector } from "./section-wizard/SectionTypeSelector";
import { SupplierSelector } from "./section-wizard/SupplierSelector";
import { StosaModelSelector } from "./section-wizard/StosaModelSelector";
import { WizardPriceGroupSelector } from "./section-wizard/PriceGroupSelector";
import { StosaConfigPanel } from "./section-wizard/StosaConfigPanel";

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

  // Wizard state
  const [step, setStep] = useState<SectionWizardStep>("type");
  const [sectionType, setSectionType] = useState<SectionType | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierCode, setSupplierCode] = useState<string>("");
  const [modelCode, setModelCode] = useState<string | null>(null);
  const [modelName, setModelName] = useState<string | null>(null);
  const [priceGroupId, setPriceGroupId] = useState<string | null>(null);
  const [priceGroupCode, setPriceGroupCode] = useState<string>("");
  const [config, setConfig] = useState<StosaConfig>({});
  const [title, setTitle] = useState("");

  // Lookup supplier for has_price_groups check
  const { data: selectedSupplier } = useSupplier(supplierId);
  const isStosa = isStosaSupplier(supplierCode);
  const hasPriceGroups = selectedSupplier?.has_price_groups === true;

  // Determine wizard steps based on selections
  const wizardSteps = useMemo<SectionWizardStep[]>(() => {
    const steps: SectionWizardStep[] = ["type", "supplier"];

    if (isStosa) {
      steps.push("model");
    }
    if (hasPriceGroups) {
      steps.push("pricegroup");
    }
    if (isStosa) {
      steps.push("config");
    }

    return steps;
  }, [isStosa, hasPriceGroups]);

  const currentStepIndex = wizardSteps.indexOf(step);
  const isLastStep = currentStepIndex === wizardSteps.length - 1;
  const progressPercent = ((currentStepIndex + 1) / wizardSteps.length) * 100;

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep("type");
      setSectionType(null);
      setSupplierId(null);
      setSupplierCode("");
      setModelCode(null);
      setModelName(null);
      setPriceGroupId(null);
      setPriceGroupCode("");
      setConfig({});
      setTitle("");
    }
  }, [open]);

  // Can move to next step?
  const canProceed = useMemo(() => {
    switch (step) {
      case "type":
        return !!sectionType;
      case "supplier":
        return !!supplierId;
      case "model":
        return !!modelCode;
      case "pricegroup":
        return !!priceGroupId;
      case "config":
        return true; // Config is optional
      default:
        return false;
    }
  }, [step, sectionType, supplierId, modelCode, priceGroupId]);

  const handleNext = () => {
    if (isLastStep) {
      handleSubmit();
      return;
    }
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < wizardSteps.length) {
      setStep(wizardSteps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(wizardSteps[prevIndex]);
    }
  };

  const handleSupplierChange = (id: string, code: string) => {
    setSupplierId(id);
    setSupplierCode(code);
    // Reset downstream selections
    setModelCode(null);
    setModelName(null);
    setPriceGroupId(null);
    setPriceGroupCode("");
    setConfig({});
  };

  const handleModelChange = (code: string, name: string) => {
    setModelCode(code);
    setModelName(name);
  };

  const handlePriceGroupChange = (id: string, code: string) => {
    setPriceGroupId(id);
    setPriceGroupCode(code);
  };

  // Build default title from config
  const generateTitle = (): string => {
    if (title.trim()) return title.trim();

    const parts: string[] = [];
    
    // Section type label
    const typeLabel = SECTION_TYPES.find((t) => t.value === sectionType)?.label;

    if (modelName) {
      parts.push(modelName);
    }
    if (priceGroupCode) {
      parts.push(priceGroupCode);
    }
    if (config.front_color) {
      parts.push(config.front_color);
    }

    if (parts.length > 0) return parts.join(" | ");
    return typeLabel || "Nieuwe sectie";
  };

  const handleSubmit = async () => {
    if (!sectionType) return;

    const sectionTitle = generateTitle();

    // Map the new section_type values to existing DB values for backward compat
    // Current DB uses: meubelen, apparatuur, werkbladen, montage, transport, overig
    const sectionTypeMap: Record<SectionType, string> = {
      keukenmeubelen: "meubelen",
      apparatuur: "apparatuur",
      werkbladen: "werkbladen",
      sanitair: "overig",
      diversen: "overig",
    };

    try {
      await createSection.mutateAsync({
        quote_id: quoteId,
        section_type: sectionTypeMap[sectionType] || sectionType,
        title: sectionTitle,
        sort_order: existingSectionsCount,
        subtotal: 0,
        supplier_id: supplierId || null,
        model_code: modelCode || null,
        model_name: modelName || null,
        price_group_id: priceGroupId || null,
        front_color: config.front_color || null,
        corpus_color: config.corpus_color || null,
        plinth_color: config.plinth_color || null,
        hinge_color: config.handle_color || null,
        handle_number: config.handle_code || null,
        column_height_mm: config.worktop_height || null,
        configuration: Object.keys(config).length > 0 ? JSON.parse(JSON.stringify(config)) : null,
      });

      toast({
        title: "Sectie toegevoegd",
        description: `De sectie "${sectionTitle}" is aangemaakt.`,
      });

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
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nieuwe sectie</DialogTitle>
          <Progress value={progressPercent} className="h-1.5 mt-2" />
        </DialogHeader>

        <div className="py-2 min-h-[200px]">
          {step === "type" && (
            <SectionTypeSelector
              value={sectionType}
              onChange={(type) => {
                setSectionType(type);
                // Auto-advance after selection
                setTimeout(() => {
                  const nextIdx = wizardSteps.indexOf("type") + 1;
                  if (nextIdx < wizardSteps.length) {
                    setStep(wizardSteps[nextIdx]);
                  }
                }, 200);
              }}
            />
          )}

          {step === "supplier" && sectionType && (
            <SupplierSelector
              sectionType={sectionType}
              value={supplierId}
              onChange={handleSupplierChange}
            />
          )}

          {step === "model" && (
            <StosaModelSelector
              value={modelCode}
              onChange={handleModelChange}
            />
          )}

          {step === "pricegroup" && supplierId && (
            <WizardPriceGroupSelector
              supplierId={supplierId}
              value={priceGroupId}
              onChange={handlePriceGroupChange}
            />
          )}

          {step === "config" && supplierId && (
            <div className="space-y-4">
              <StosaConfigPanel
                modelCode={modelCode}
                supplierId={supplierId}
                priceGroupId={priceGroupId}
                config={config}
                onChange={setConfig}
              />

              {/* Title override */}
              <div className="space-y-2 pt-4 border-t">
                <Label>Titel (optioneel)</Label>
                <Input
                  placeholder={generateTitle()}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Laat leeg om automatisch een naam te genereren
                </p>
              </div>
            </div>
          )}

          {/* For non-STOSA, show title on last step */}
          {isLastStep && !isStosa && step !== "config" && (
            <div className="space-y-2 mt-6 pt-4 border-t">
              <Label>Titel (optioneel)</Label>
              <Input
                placeholder="Bijv. 'Eiland', 'Kastenwand'..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Laat leeg om automatisch een naam te genereren
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between gap-2 pt-4">
          <div>
            {currentStepIndex > 0 && (
              <Button type="button" variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Vorige
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Annuleren
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed || createSection.isPending}
            >
              {createSection.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isLastStep ? (
                "Toevoegen"
              ) : (
                <>
                  Volgende
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
