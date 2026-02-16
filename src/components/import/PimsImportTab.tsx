import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, Loader2, Check, AlertCircle, FileSpreadsheet, Image } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePimsImport } from '@/hooks/usePimsImport';

type PimsFormat = 'bmecat' | 'csv';

export function PimsImportTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [format, setFormat] = useState<PimsFormat>('bmecat');
  const [supplierId, setSupplierId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileBase64, setFileBase64] = useState('');
  const [fileSize, setFileSize] = useState(0);

  const { importPims, isImporting, importResult, progress, reset } = usePimsImport();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['product_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(file.size);

    // Auto-detect format
    const ext = file.name.toLowerCase();
    if (ext.endsWith('.xml') || ext.endsWith('.bmecat')) {
      setFormat('bmecat');
    } else if (ext.endsWith('.csv') || ext.endsWith('.txt')) {
      setFormat('csv');
    }

    // Convert to base64
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    setFileBase64(btoa(binary));
  };

  const handleImport = async () => {
    if (!supplierId || !fileBase64) return;
    
    try {
      await importPims({
        supplierId,
        categoryId: categoryId || undefined,
        format,
        fileContent: fileBase64,
        fileName,
      });
      setStep(3);
    } catch {
      // Error handled by hook
    }
  };

  const handleReset = () => {
    setStep(1);
    setFileName('');
    setFileBase64('');
    setFileSize(0);
    setSupplierId('');
    setCategoryId('');
    reset();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Configuration */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              PIMS Productdata Import
            </CardTitle>
            <CardDescription>
              Importeer productdata uit Tradeplace PIMS (BMEcat XML of CSV). 
              Inclusief afbeeldingen, specificaties en EAN-codes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Supplier */}
            <div className="space-y-2">
              <Label>Leverancier *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer leverancier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category (optional) */}
            <div className="space-y-2">
              <Label>Categorie (optioneel)</Label>
              <Select value={categoryId || 'none'} onValueChange={(v) => setCategoryId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Alle categorieën" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Geen specifieke categorie</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Format */}
            <div className="space-y-2">
              <Label>Bestandsformaat</Label>
              <RadioGroup value={format} onValueChange={(v) => setFormat(v as PimsFormat)} className="flex gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="bmecat" id="pims-bmecat" />
                  <Label htmlFor="pims-bmecat" className="font-normal cursor-pointer">BMEcat XML</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="csv" id="pims-csv" />
                  <Label htmlFor="pims-csv" className="font-normal cursor-pointer">CSV</Label>
                </div>
              </RadioGroup>
            </div>

            {/* File upload */}
            <div className="space-y-2">
              <Label>Bestand</Label>
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={format === 'bmecat' ? '.xml,.bmecat' : '.csv,.txt'}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {fileName ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="h-10 w-10 text-primary" />
                    <p className="font-medium text-sm">{fileName}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Klik om een {format === 'bmecat' ? 'BMEcat XML' : 'CSV'} bestand te selecteren
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Info box */}
            <Alert>
              <Image className="h-4 w-4" />
              <AlertDescription>
                Afbeeldingen uit het PIMS-bestand worden automatisch gedownload en opgeslagen. 
                Bestaande handmatige aanpassingen (user overrides) worden niet overschreven.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!supplierId || !fileBase64}
              >
                Volgende
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Confirm & Import */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Bevestig import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Leverancier</div>
                <div className="text-sm font-medium">{suppliers.find(s => s.id === supplierId)?.name}</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Formaat</div>
                <div className="text-sm font-medium">{format === 'bmecat' ? 'BMEcat XML' : 'CSV'}</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Bestand</div>
                <div className="text-sm font-medium">{fileName}</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-xs text-muted-foreground">Bestandsgrootte</div>
                <div className="text-sm font-medium">{formatFileSize(fileSize)}</div>
              </div>
            </div>

            {isImporting && (
              <div className="space-y-2">
                <Progress value={undefined} className="h-2" />
                <p className="text-sm text-muted-foreground text-center">{progress || 'Verwerken...'}</p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} disabled={isImporting}>
                Terug
              </Button>
              <Button onClick={handleImport} disabled={isImporting}>
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importeren...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Start import
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Results */}
      {step === 3 && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              Import afgerond
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-primary">{importResult.inserted}</div>
                <div className="text-sm text-muted-foreground">Nieuwe producten</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-primary">{importResult.updated}</div>
                <div className="text-sm text-muted-foreground">Bijgewerkt</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold text-primary">{importResult.images_queued || importResult.images_downloaded || 0}</div>
                <div className="text-sm text-muted-foreground">Afbeeldingen</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold">{importResult.total}</div>
                <div className="text-sm text-muted-foreground">Totaal</div>
              </div>
            </div>

            {(importResult.images_queued || 0) > 0 && (
              <Alert>
                <Image className="h-4 w-4" />
                <AlertDescription>
                  {importResult.images_queued} afbeelding(en) worden op de achtergrond gedownload en verwerkt. Dit kan enkele minuten duren.
                </AlertDescription>
              </Alert>
            )}

            {(importResult.image_errors || 0) > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {importResult.image_errors} afbeelding(en) konden niet worden gedownload.
                </AlertDescription>
              </Alert>
            )}

            {importResult.errors && importResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {importResult.errors.length} fout(en) tijdens import:
                  <ul className="mt-2 list-disc pl-4 text-xs">
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-center">
              <Button variant="outline" onClick={handleReset}>Nieuwe import</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
