import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectionWizardStep } from "@/types/quote-sections";

const STEP_LABELS: Record<SectionWizardStep, string> = {
  type: "Type",
  supplier: "Merk",
  model: "Model",
  pricegroup: "Prijsgroep",
  config: "Uitvoering",
};

interface WizardProgressBarProps {
  steps: SectionWizardStep[];
  currentStep: SectionWizardStep;
}

export function WizardProgressBar({ steps, currentStep }: WizardProgressBarProps) {
  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="flex items-center justify-center gap-0 px-2 py-3">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all",
                  isCompleted && "bg-emerald-500 text-white",
                  isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1 whitespace-nowrap",
                  isCurrent && "text-primary font-medium",
                  !isCurrent && "text-muted-foreground"
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-6 sm:w-10 h-0.5 mx-1 -mt-4",
                  isCompleted ? "bg-emerald-500" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
