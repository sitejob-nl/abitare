import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Copy, FilePlus, Loader2 } from "lucide-react";

export type DuplicateMode = "revision" | "new_sub_quote";

interface DuplicateChoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (mode: DuplicateMode) => void;
  quoteNumber: number;
  isPending: boolean;
}

export function DuplicateChoiceDialog({
  open,
  onOpenChange,
  onSelect,
  quoteNumber,
  isPending,
}: DuplicateChoiceDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Offerte #{quoteNumber} kopiëren</AlertDialogTitle>
          <AlertDialogDescription>
            Kies hoe je deze offerte wilt kopiëren.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-3 py-2">
          <Button
            variant="outline"
            className="justify-start h-auto py-3 px-4 gap-3"
            onClick={() => onSelect("revision")}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin shrink-0" />
            ) : (
              <Copy className="h-5 w-5 shrink-0 text-primary" />
            )}
            <div className="text-left">
              <div className="font-medium">Nieuwe revisie</div>
              <div className="text-xs text-muted-foreground font-normal">
                Zelfde offertenummer, nieuw revisienummer (bijv. rev 2)
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="justify-start h-auto py-3 px-4 gap-3"
            onClick={() => onSelect("new_sub_quote")}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin shrink-0" />
            ) : (
              <FilePlus className="h-5 w-5 shrink-0 text-primary" />
            )}
            <div className="text-left">
              <div className="font-medium">Nieuwe deelofferte</div>
              <div className="text-xs text-muted-foreground font-normal">
                Nieuw offertenummer, losgekoppeld van huidige revisies
              </div>
            </div>
          </Button>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Annuleren</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
