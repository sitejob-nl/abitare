import { useState, useRef } from "react";
import { FileText, Upload, Trash2, Download, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const documentTypes = [
  { value: "offerte", label: "Offerte" },
  { value: "orderbevestiging", label: "Orderbevestiging" },
  { value: "factuur", label: "Factuur" },
  { value: "tekening", label: "Tekening" },
  { value: "foto", label: "Foto" },
  { value: "contract", label: "Contract" },
  { value: "overig", label: "Overig" },
];

interface Document {
  id: string;
  document_type: string;
  file_name: string | null;
  file_path: string | null;
  file_size: number | null;
  title: string | null;
  created_at: string | null;
  visible_to_customer: boolean | null;
  visible_to_installer: boolean | null;
}

interface DocumentsCardProps {
  documents: Document[];
  onUpload: (file: File, documentType: string, title?: string, visibleToCustomer?: boolean, visibleToInstaller?: boolean) => void;
  onDelete: (documentId: string, filePath: string) => void;
  isUploading?: boolean;
  isDeleting?: boolean;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDocumentTypeLabel(type: string): string {
  return documentTypes.find((t) => t.value === type)?.label || type;
}

export function DocumentsCard({
  documents,
  onUpload,
  onDelete,
  isUploading,
  isDeleting,
}: DocumentsCardProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("overig");
  const [title, setTitle] = useState("");
  const [visibleToCustomer, setVisibleToCustomer] = useState(false);
  const [visibleToInstaller, setVisibleToInstaller] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setTitle(file.name);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    onUpload(selectedFile, documentType, title, visibleToCustomer, visibleToInstaller);
    resetForm();
    setShowDialog(false);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setDocumentType("overig");
    setTitle("");
    setVisibleToCustomer(false);
    setVisibleToInstaller(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("order-documents")
      .download(filePath);

    if (error) {
      console.error("Download error:", error);
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Documenten</h3>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Upload className="h-4 w-4" />
              Uploaden
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Document uploaden</DialogTitle>
              <DialogDescription>
                Upload een document aan deze order
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Bestand</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                />
              </div>
              <div className="space-y-2">
                <Label>Type document</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Titel</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Documentnaam"
                />
              </div>
              <div className="space-y-3">
                <Label>Zichtbaarheid</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="visibleCustomer"
                    checked={visibleToCustomer}
                    onCheckedChange={(checked) => setVisibleToCustomer(checked === true)}
                  />
                  <label htmlFor="visibleCustomer" className="text-sm text-muted-foreground">
                    Zichtbaar voor klant
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="visibleInstaller"
                    checked={visibleToInstaller}
                    onCheckedChange={(checked) => setVisibleToInstaller(checked === true)}
                  />
                  <label htmlFor="visibleInstaller" className="text-sm text-muted-foreground">
                    Zichtbaar voor monteur
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { resetForm(); setShowDialog(false); }}>
                Annuleren
              </Button>
              <Button onClick={handleUpload} disabled={isUploading || !selectedFile}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploaden...
                  </>
                ) : (
                  "Uploaden"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {documents.length === 0 ? (
        <div className="py-6 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">Nog geen documenten</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-lg border border-border-light bg-background p-3"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-medium text-foreground">
                    {doc.title || doc.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getDocumentTypeLabel(doc.document_type)} • {formatFileSize(doc.file_size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {doc.file_path && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(doc.file_path!, doc.file_name || "document")}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Document verwijderen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Weet je zeker dat je "{doc.title || doc.file_name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuleren</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => doc.file_path && onDelete(doc.id, doc.file_path)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Verwijderen..." : "Verwijderen"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
