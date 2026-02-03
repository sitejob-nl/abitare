import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDeleteQuote } from "@/hooks/useQuotes";
import { useDuplicateQuote } from "@/hooks/useQuoteDuplicate";
import { toast } from "@/hooks/use-toast";

interface QuoteActionsProps {
  quoteId: string;
  quoteNumber: number;
}

export function QuoteActions({ quoteId, quoteNumber }: QuoteActionsProps) {
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const deleteQuote = useDeleteQuote();
  const duplicateQuote = useDuplicateQuote();

  const handleDelete = async () => {
    try {
      await deleteQuote.mutateAsync(quoteId);
      toast({
        title: "Offerte verwijderd",
        description: `Offerte #${quoteNumber} is verwijderd.`,
      });
      navigate("/quotes");
    } catch (error) {
      toast({
        title: "Fout bij verwijderen",
        description: "De offerte kon niet worden verwijderd.",
        variant: "destructive",
      });
    }
    setShowDeleteDialog(false);
  };

  const handleDuplicate = async () => {
    try {
      const newQuote = await duplicateQuote.mutateAsync(quoteId);
      toast({
        title: "Offerte gekopieerd",
        description: `Een nieuwe offerte #${newQuote.quote_number} is aangemaakt.`,
      });
      navigate(`/quotes/${newQuote.id}`);
    } catch (error) {
      console.error("Error duplicating quote:", error);
      toast({
        title: "Fout bij kopiëren",
        description: "De offerte kon niet worden gekopieerd.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 h-8"
        onClick={handleDuplicate}
        disabled={duplicateQuote.isPending}
      >
        {duplicateQuote.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">Kopiëren</span>
      </Button>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Verwijderen</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Offerte verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je offerte #{quoteNumber} wilt verwijderen? 
              Alle secties en regels worden ook verwijderd. 
              Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteQuote.isPending}
            >
              {deleteQuote.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
