import { useState } from "react";
import { MessageSquare, Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";

const noteTypes = [
  { value: "internal", label: "Intern", color: "bg-blue-100 text-blue-800" },
  { value: "installer", label: "Monteur", color: "bg-emerald-100 text-emerald-800" },
  { value: "customer", label: "Klant", color: "bg-purple-100 text-purple-800" },
];

interface Note {
  id: string;
  content: string;
  note_type: string | null;
  created_at: string | null;
  created_by: string | null;
}

interface NotesCardProps {
  notes: Note[];
  onAdd: (content: string, noteType: string) => void;
  onDelete: (noteId: string) => void;
  isAdding?: boolean;
  isDeleting?: boolean;
}

function formatDate(date: string | null): string {
  if (!date) return "";
  try {
    return format(new Date(date), "d MMM yyyy 'om' HH:mm", { locale: nl });
  } catch {
    return "";
  }
}

function getNoteTypeConfig(type: string | null) {
  return noteTypes.find((t) => t.value === type) || noteTypes[0];
}

export function NotesCard({
  notes,
  onAdd,
  onDelete,
  isAdding,
  isDeleting,
}: NotesCardProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState("internal");

  const handleSubmit = () => {
    if (!content.trim()) return;
    onAdd(content.trim(), noteType);
    setContent("");
    setNoteType("internal");
    setShowDialog(false);
  };

  const sortedNotes = [...notes].sort((a, b) => {
    const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Notities</h3>
            {notes.length > 0 && (
              <p className="text-xs text-muted-foreground">{notes.length} notitie(s)</p>
            )}
          </div>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Toevoegen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Notitie toevoegen</DialogTitle>
              <DialogDescription>
                Voeg een notitie toe aan deze order
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Type notitie</Label>
                <Select value={noteType} onValueChange={setNoteType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {noteTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", type.color)}>
                          {type.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notitie</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Typ je notitie hier..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Annuleren
              </Button>
              <Button onClick={handleSubmit} disabled={isAdding || !content.trim()}>
                {isAdding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Toevoegen...
                  </>
                ) : (
                  "Toevoegen"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {sortedNotes.length === 0 ? (
        <div className="py-6 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">Nog geen notities</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
          {sortedNotes.map((note) => {
            const typeConfig = getNoteTypeConfig(note.note_type);
            return (
              <div
                key={note.id}
                className="rounded-lg border border-border-light bg-background p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", typeConfig.color)}>
                    {typeConfig.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(note.created_at)}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Notitie verwijderen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Weet je zeker dat je deze notitie wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuleren</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => onDelete(note.id)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? "Verwijderen..." : "Verwijderen"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
