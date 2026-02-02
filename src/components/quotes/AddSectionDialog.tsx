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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createSection.mutateAsync({
        quote_id: quoteId,
        section_type: sectionType,
        title: title.trim() || null,
        sort_order: existingSectionsCount,
        subtotal: 0,
      });

      toast({
        title: "Sectie toegevoegd",
        description: `De sectie "${title || SECTION_TYPES.find(t => t.value === sectionType)?.label}" is aangemaakt.`,
      });

      // Reset form
      setSectionType("meubelen");
      setTitle("");
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
      <DialogContent className="sm:max-w-[400px]">
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
            <Label htmlFor="title">Titel (optioneel)</Label>
            <Input
              id="title"
              placeholder="Bijv. 'Eiland', 'Kastenwand'..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Laat leeg om alleen het type als naam te gebruiken
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
