import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Upload, FileSpreadsheet, Check, Loader2, AlertCircle, X, File, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProductImport, parsePrice } from '@/hooks/useProductImport';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImportValidation, validateImportData, ValidationResult } from '@/components/import/ImportValidation';
import * as XLSX from 'xlsx';

interface ParsedRow {
  [key: string]: string | number;
}

interface ColumnMapping {
  article_code: string;
  name: string;
  cost_price: string;
  base_price: string;
  description?: string;
}

export default function ProductImport() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [fileData, setFileData] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parseError, setParseError] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    article_code: '',
    name: '',
    cost_price: '',
    base_price: '',
  });
  
  const { importProducts, isImporting, importResult } = useProductImport();

  // Fetch suppliers
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

  // Fetch categories
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

  // Get available columns from data
  const availableColumns = useMemo(() => {
    if (fileData.length === 0) return [];
    return Object.keys(fileData[0]);
  }, [fileData]);

  // Auto-detect column mapping based on common column names
  const autoDetectMapping = (columns: string[]) => {
    const mapping: ColumnMapping = {
      article_code: '',
      name: '',
      cost_price: '',
      base_price: '',
    };

    const articlePatterns = ['artikel', 'article', 'code', 'sku', 'artikelcode', 'article_code', 'product_code', 'artikelnummer'];
    const namePatterns = ['omschrijving', 'naam', 'name', 'description', 'product', 'title', 'productnaam'];
    const costPatterns = ['inkoop', 'cost', 'netto', 'factuur', 'inkoopprijs', 'cost_price', 'netto factuur'];
    const pricePatterns = ['verkoop', 'advies', 'price', 'prijs', 'base', 'verkoopprijs', 'base_price', 'adviesprijs'];

    columns.forEach(col => {
      const colLower = col.toLowerCase();
      
      if (!mapping.article_code && articlePatterns.some(p => colLower.includes(p))) {
        mapping.article_code = col;
      }
      if (!mapping.name && namePatterns.some(p => colLower.includes(p))) {
        mapping.name = col;
      }
      if (!mapping.cost_price && costPatterns.some(p => colLower.includes(p))) {
        mapping.cost_price = col;
      }
      if (!mapping.base_price && pricePatterns.some(p => colLower.includes(p)) && !colLower.includes('inkoop') && !colLower.includes('cost')) {
        mapping.base_price = col;
      }
    });

    return mapping;
  };

  // Mapped products for validation and import
  const mappedProducts = useMemo(() => {
    return fileData.map(row => ({
      article_code: columnMapping.article_code ? row[columnMapping.article_code]?.toString() || '' : '',
      name: columnMapping.name ? row[columnMapping.name]?.toString() || '' : '',
      cost_price: columnMapping.cost_price ? parsePrice(row[columnMapping.cost_price]) : undefined,
      base_price: columnMapping.base_price ? parsePrice(row[columnMapping.base_price]) : undefined,
    }));
  }, [fileData, columnMapping]);

  // Preview data (first 10 rows)
  const previewData = useMemo(() => mappedProducts.slice(0, 10), [mappedProducts]);

  // Validation result
  const validation: ValidationResult = useMemo(() => {
    if (mappedProducts.length === 0 || !columnMapping.article_code) {
      return { isValid: true, errors: [], warnings: [], stats: { totalRows: 0, validRows: 0, duplicateCount: 0, priceIssueCount: 0, missingCodeCount: 0 } };
    }
    return validateImportData(mappedProducts);
  }, [mappedProducts, columnMapping.article_code]);

  // Total count
  const totalCount = fileData.length;
  const importableCount = validation.stats.validRows;

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    setParseError('');
    setFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Get first sheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, {
        defval: '', // Default value for empty cells
        raw: false, // Get formatted strings
      });

      if (jsonData.length === 0) {
        throw new Error('Geen data gevonden in het bestand');
      }

      setFileData(jsonData);
      
      // Auto-detect column mapping
      const columns = Object.keys(jsonData[0]);
      const detectedMapping = autoDetectMapping(columns);
      setColumnMapping(detectedMapping);
      
      setStep(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fout bij het lezen van het bestand';
      setParseError(message);
      setFileData([]);
    } finally {
      setIsParsingFile(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    // Create a fake event to reuse handleFileUpload logic
    const fakeEvent = {
      target: { files: [file] }
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    
    await handleFileUpload(fakeEvent);
  };

  const handleImport = async () => {
    if (!selectedSupplierId || !columnMapping.article_code) return;
    
    // Only import valid products (with article_code)
    const validProducts = mappedProducts.filter(p => p.article_code && p.article_code.trim() !== '');
    
    // Deduplicate - keep last occurrence of each article code
    const deduplicatedMap = new Map<string, typeof validProducts[0]>();
    validProducts.forEach(p => {
      deduplicatedMap.set(p.article_code.trim().toUpperCase(), p);
    });
    const productsToImport = Array.from(deduplicatedMap.values());

    await importProducts({
      products: productsToImport,
      supplierId: selectedSupplierId,
      categoryId: selectedCategoryId || undefined,
    });
    
    setStep(4);
  };

  const resetImport = () => {
    setStep(1);
    setFileData([]);
    setFileName('');
    setParseError('');
    setSelectedSupplierId('');
    setSelectedCategoryId('');
    setColumnMapping({
      article_code: '',
      name: '',
      cost_price: '',
      base_price: '',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <AppLayout title="Product Import">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Product Import</h1>
            <p className="text-muted-foreground">Importeer producten vanuit prijslijsten</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 4 && <div className={`w-12 h-0.5 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: File Selection */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Stap 1: Bestand selecteren</CardTitle>
              <CardDescription>Upload een CSV of Excel prijslijst</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload Zone */}
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {isParsingFile ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    <p className="text-muted-foreground">Bestand wordt verwerkt...</p>
                  </div>
                ) : fileName ? (
                  <div className="flex flex-col items-center gap-4">
                    <File className="h-12 w-12 text-primary" />
                    <div>
                      <p className="font-medium">{fileName}</p>
                      <p className="text-sm text-muted-foreground">{fileData.length} rijen gevonden</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); resetImport(); }}>
                      <X className="h-4 w-4 mr-2" />
                      Ander bestand kiezen
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Sleep een bestand hierheen</p>
                      <p className="text-sm text-muted-foreground">of klik om te bladeren</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>CSV, XLSX of XLS</span>
                    </div>
                  </div>
                )}
              </div>

              {parseError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{parseError}</AlertDescription>
                </Alert>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Zorg dat je bestand een headerrij heeft met kolomnamen. De eerste rij wordt gebruikt om kolommen te herkennen.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Supplier & Category Selection */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Stap 2: Leverancier & Categorie</CardTitle>
              <CardDescription>
                Bestand: <span className="font-medium">{fileName}</span> ({fileData.length} rijen)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Leverancier *</Label>
                  <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer leverancier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name} ({supplier.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Categorie (optioneel)</Label>
                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer categorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={resetImport}>Terug</Button>
                <Button onClick={() => setStep(3)} disabled={!selectedSupplierId}>
                  Volgende
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Column Mapping & Preview */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Stap 3: Kolommen mappen & Preview</CardTitle>
              <CardDescription>Koppel de kolommen uit je bestand aan de database velden</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Column Mapping */}
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { key: 'article_code', label: 'Artikelcode *', required: true },
                  { key: 'name', label: 'Naam', required: false },
                  { key: 'cost_price', label: 'Inkoopprijs', required: false },
                  { key: 'base_price', label: 'Verkoopprijs', required: false },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <Label>{label}</Label>
                    <Select 
                      value={columnMapping[key as keyof ColumnMapping] || ''} 
                      onValueChange={(value) => setColumnMapping(prev => ({ ...prev, [key]: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer kolom" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Niet mappen --</SelectItem>
                        {availableColumns.map((col) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Preview Table */}
              <div>
                <h4 className="font-medium mb-2">Preview (eerste 10 rijen)</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Artikelcode</TableHead>
                        <TableHead>Naam</TableHead>
                        <TableHead className="text-right">Inkoopprijs</TableHead>
                        <TableHead className="text-right">Verkoopprijs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.length > 0 ? (
                        previewData.map((row, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono">{row.article_code || '-'}</TableCell>
                            <TableCell>{row.name || '-'}</TableCell>
                            <TableCell className="text-right">
                              {row.cost_price !== undefined ? `€ ${row.cost_price.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {row.base_price !== undefined ? `€ ${row.base_price.toFixed(2)}` : '-'}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Selecteer kolommen om preview te zien
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Validation Results */}
              {columnMapping.article_code && mappedProducts.length > 0 && (
                <ImportValidation validation={validation} />
              )}

              {!columnMapping.article_code && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Artikelcode is verplicht. Selecteer welke kolom de artikelcode bevat.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>Terug</Button>
                <Button 
                  onClick={handleImport} 
                  disabled={isImporting || !columnMapping.article_code || !validation.isValid}
                  variant={validation.warnings.length > 0 && validation.isValid ? "default" : "default"}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importeren...
                    </>
                  ) : !validation.isValid ? (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Fouten oplossen
                    </>
                  ) : validation.warnings.length > 0 ? (
                    <>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Importeer toch ({importableCount} producten)
                    </>
                  ) : (
                    `Importeer ${importableCount} producten`
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Results */}
        {step === 4 && importResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-6 w-6 text-green-500" />
                Import voltooid
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{importResult.inserted}</div>
                  <div className="text-sm text-muted-foreground">Nieuwe producten</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{importResult.updated}</div>
                  <div className="text-sm text-muted-foreground">Bijgewerkt</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold">{importResult.total}</div>
                  <div className="text-sm text-muted-foreground">Totaal verwerkt</div>
                </div>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Er waren {importResult.errors.length} fouten tijdens de import.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-center gap-4 pt-4">
                <Button variant="outline" onClick={resetImport}>
                  Nieuwe import
                </Button>
                <Button onClick={() => navigate('/products')}>
                  Bekijk producten
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
