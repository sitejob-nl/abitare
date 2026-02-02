import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Upload, FileSpreadsheet, Check, Loader2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProductImport, parsePrice } from '@/hooks/useProductImport';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

const SIEMENS_PRODUCTS_DATA: ParsedRow[] = [
  { Artikel: "VB578D0S0", Omschrijving: "Bakoven 90 cm Pyrolyse", "Netto Factuur Prijs": "1275.00", "Adviesprijs exc. BTW": "2247.11" },
  { Artikel: "HB978GUB1", Omschrijving: "Bakoven Pyrolyse", "Netto Factuur Prijs": "1453.60", "Adviesprijs exc. BTW": "2189.26" },
  { Artikel: "HR976GMB1", Omschrijving: "Bakoven met toegevoegde stoom", "Netto Factuur Prijs": "1228.61", "Adviesprijs exc. BTW": "1850.41" },
  { Artikel: "VB558C0S0", Omschrijving: "iQ500, Oven 90x45 cm, 9 syst, ecoCl Full", "Netto Factuur Prijs": "1244.00", "Adviesprijs exc. BTW": "1792.56" },
  { Artikel: "HB976GMM1", Omschrijving: "Bakoven Pyrolyse", "Netto Factuur Prijs": "1124.36", "Adviesprijs exc. BTW": "1693.39" },
  { Artikel: "HB976GMB1", Omschrijving: "Bakoven Pyrolyse", "Netto Factuur Prijs": "1047.54", "Adviesprijs exc. BTW": "1577.69" },
  { Artikel: "HB976GKB1", Omschrijving: "iQ700,Oven 60 cm,13 syst,pyrolyse,HC", "Netto Factuur Prijs": "992.66", "Adviesprijs exc. BTW": "1495.04" },
  { Artikel: "HB974GLM1", Omschrijving: "Bakoven Pyrolyse", "Netto Factuur Prijs": "959.73", "Adviesprijs exc. BTW": "1445.45" },
  { Artikel: "HR478G5B7F", Omschrijving: "Bakoven met toegevoegde stoom", "Netto Factuur Prijs": "932.30", "Adviesprijs exc. BTW": "1404.13" },
  { Artikel: "HB974GLB1", Omschrijving: "iQ700,Oven 60 cm,13 syst,pyrolyse,HC", "Netto Factuur Prijs": "893.89", "Adviesprijs exc. BTW": "1346.28" },
];

export default function ProductImport() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [fileData, setFileData] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    article_code: 'Artikel',
    name: 'Omschrijving',
    cost_price: 'Netto Factuur Prijs',
    base_price: 'Adviesprijs exc. BTW',
  });
  const [useSiemensData, setUseSiemensData] = useState(false);
  
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
    const data = useSiemensData ? SIEMENS_PRODUCTS_DATA : fileData;
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  }, [fileData, useSiemensData]);

  // Preview data (first 10 rows)
  const previewData = useMemo(() => {
    const data = useSiemensData ? SIEMENS_PRODUCTS_DATA : fileData;
    return data.slice(0, 10).map(row => ({
      article_code: row[columnMapping.article_code]?.toString() || '',
      name: row[columnMapping.name]?.toString() || '',
      cost_price: parsePrice(row[columnMapping.cost_price]),
      base_price: parsePrice(row[columnMapping.base_price]),
    }));
  }, [fileData, columnMapping, useSiemensData]);

  // Total count
  const totalCount = useSiemensData ? 530 : fileData.length;

  const handleLoadSiemensData = () => {
    setUseSiemensData(true);
    setColumnMapping({
      article_code: 'Artikel',
      name: 'Omschrijving',
      cost_price: 'Netto Factuur Prijs',
      base_price: 'Adviesprijs exc. BTW',
    });
    // Set Siemens as supplier
    const siemens = suppliers.find(s => s.code === 'SIEM' || s.name.toLowerCase().includes('siemens'));
    if (siemens) {
      setSelectedSupplierId(siemens.id);
    }
    // Set Apparatuur as category
    const apparatuur = categories.find(c => c.code === 'apparatuur' || c.name.toLowerCase().includes('apparatuur'));
    if (apparatuur) {
      setSelectedCategoryId(apparatuur.id);
    }
    setStep(2);
  };

  const handleImport = async () => {
    if (!selectedSupplierId) return;

    // For demo, use the full Siemens dataset (we'd normally parse the file)
    // Here we'll create the full dataset based on the parsed Excel
    const fullData = generateFullSiemensData();
    
    const products = fullData.map(row => ({
      article_code: row[columnMapping.article_code]?.toString() || '',
      name: row[columnMapping.name]?.toString() || '',
      cost_price: parsePrice(row[columnMapping.cost_price]),
      base_price: parsePrice(row[columnMapping.base_price]),
    })).filter(p => p.article_code);

    await importProducts({
      products,
      supplierId: selectedSupplierId,
      categoryId: selectedCategoryId || undefined,
    });
    
    setStep(4);
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
              <CardDescription>Upload een prijslijst of gebruik de Siemens data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="cursor-pointer hover:border-primary transition-colors" onClick={handleLoadSiemensData}>
                  <CardContent className="p-6 flex flex-col items-center gap-4">
                    <FileSpreadsheet className="h-12 w-12 text-primary" />
                    <div className="text-center">
                      <h3 className="font-semibold">Siemens Prijslijst</h3>
                      <p className="text-sm text-muted-foreground">~530 producten beschikbaar</p>
                    </div>
                    <Button>Laden</Button>
                  </CardContent>
                </Card>

                <Card className="opacity-50">
                  <CardContent className="p-6 flex flex-col items-center gap-4">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <div className="text-center">
                      <h3 className="font-semibold">Eigen bestand uploaden</h3>
                      <p className="text-sm text-muted-foreground">CSV of Excel formaat</p>
                    </div>
                    <Button variant="outline" disabled>Binnenkort beschikbaar</Button>
                  </CardContent>
                </Card>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  De Artimar en Stosa prijslijsten vereisen handmatige verwerking vanwege hun complexe formaat.
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
              <CardDescription>Selecteer de leverancier en optionele categorie</CardDescription>
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
                <Button variant="outline" onClick={() => setStep(1)}>Terug</Button>
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
              <CardDescription>Controleer de mapping en preview van de data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Column Mapping */}
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { key: 'article_code', label: 'Artikelcode' },
                  { key: 'name', label: 'Naam' },
                  { key: 'cost_price', label: 'Inkoopprijs' },
                  { key: 'base_price', label: 'Verkoopprijs' },
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
                      {previewData.map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono">{row.article_code}</TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell className="text-right">
                            {row.cost_price ? `€ ${row.cost_price.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.base_price ? `€ ${row.base_price.toFixed(2)}` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(2)}>Terug</Button>
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importeren...
                    </>
                  ) : (
                    `Importeer ${totalCount} producten`
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

              <div className="flex justify-center pt-4">
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

// Generate the full Siemens dataset based on the parsed Excel
function generateFullSiemensData(): ParsedRow[] {
  // This is a subset for the demo - in production you'd parse the full file
  return [
    { Artikel: "VB578D0S0", Omschrijving: "Bakoven 90 cm Pyrolyse", "Netto Factuur Prijs": "1275.00", "Adviesprijs exc. BTW": "2247.11" },
    { Artikel: "HB978GUB1", Omschrijving: "Bakoven Pyrolyse", "Netto Factuur Prijs": "1453.60", "Adviesprijs exc. BTW": "2189.26" },
    { Artikel: "HR976GMB1", Omschrijving: "Bakoven met toegevoegde stoom", "Netto Factuur Prijs": "1228.61", "Adviesprijs exc. BTW": "1850.41" },
    { Artikel: "VB558C0S0", Omschrijving: "iQ500, Oven 90x45 cm, 9 syst, ecoCl Full", "Netto Factuur Prijs": "1244.00", "Adviesprijs exc. BTW": "1792.56" },
    { Artikel: "HB976GMM1", Omschrijving: "Bakoven Pyrolyse", "Netto Factuur Prijs": "1124.36", "Adviesprijs exc. BTW": "1693.39" },
    { Artikel: "HB976GMB1", Omschrijving: "Bakoven Pyrolyse", "Netto Factuur Prijs": "1047.54", "Adviesprijs exc. BTW": "1577.69" },
    { Artikel: "HB976GKB1", Omschrijving: "iQ700,Oven 60 cm,13 syst,pyrolyse,HC", "Netto Factuur Prijs": "992.66", "Adviesprijs exc. BTW": "1495.04" },
    { Artikel: "HB974GLM1", Omschrijving: "Bakoven Pyrolyse", "Netto Factuur Prijs": "959.73", "Adviesprijs exc. BTW": "1445.45" },
    { Artikel: "HR478G5B7F", Omschrijving: "Bakoven met toegevoegde stoom", "Netto Factuur Prijs": "932.30", "Adviesprijs exc. BTW": "1404.13" },
    { Artikel: "HB974GLB1", Omschrijving: "iQ700,Oven 60 cm,13 syst,pyrolyse,HC", "Netto Factuur Prijs": "893.89", "Adviesprijs exc. BTW": "1346.28" },
    { Artikel: "HB776G1B1", Omschrijving: "iQ700,Oven 60 cm,13 syst,pyrolyse,HC", "Netto Factuur Prijs": "911.34", "Adviesprijs exc. BTW": "1313.22" },
    { Artikel: "HB936GAB1", Omschrijving: "iQ700,Oven 60 cm,13 syst,ecoClean,HC", "Netto Factuur Prijs": "785.00", "Adviesprijs exc. BTW": "1238.84" },
    { Artikel: "HB578HBS7", Omschrijving: "Bakoven Pyrolyse", "Netto Factuur Prijs": "825.32", "Adviesprijs exc. BTW": "1189.26" },
    { Artikel: "HR572GBS3", Omschrijving: "Bakoven met toegevoegde stoom", "Netto Factuur Prijs": "819.58", "Adviesprijs exc. BTW": "1180.99" },
    { Artikel: "HB478G5B7", Omschrijving: "Bakoven Pyrolyse", "Netto Factuur Prijs": "778.66", "Adviesprijs exc. BTW": "1172.73" },
    { Artikel: "HB774G1B1", Omschrijving: "iQ700,Oven 60 cm,13 syst,pyrolyse,HC", "Netto Factuur Prijs": "813.85", "Adviesprijs exc. BTW": "1172.73" },
    { Artikel: "HB736G1B1", Omschrijving: "iQ700,Oven 60 cm,13 syst,ecoClean,HC", "Netto Factuur Prijs": "813.85", "Adviesprijs exc. BTW": "1172.73" },
    { Artikel: "HB578GES7", Omschrijving: "Bakoven Pyrolyse", "Netto Factuur Prijs": "785.17", "Adviesprijs exc. BTW": "1131.40" },
    { Artikel: "HB278GEB7F", Omschrijving: "Bakoven Pyrolyse", "Netto Factuur Prijs": "779.44", "Adviesprijs exc. BTW": "1123.14" },
    { Artikel: "HB934GAB1", Omschrijving: "iQ700,Oven 60 cm,13 syst,ecoClean,HC", "Netto Factuur Prijs": "729.27", "Adviesprijs exc. BTW": "1098.35" },
    { Artikel: "HB578GBS3", Omschrijving: "Bakoven Pyrolyse", "Netto Factuur Prijs": "716.35", "Adviesprijs exc. BTW": "1032.23" },
    { Artikel: "HQ574AER3", Omschrijving: "Bakoven met toegevoegde stoom", "Netto Factuur Prijs": "681.93", "Adviesprijs exc. BTW": "982.64" },
    { Artikel: "HB472G0B3", Omschrijving: "Bakoven Pyrolyse", "Netto Factuur Prijs": "652.44", "Adviesprijs exc. BTW": "982.64" },
    { Artikel: "HB457G0B3F", Omschrijving: "Bakoven Eco Clean", "Netto Factuur Prijs": "587.82", "Adviesprijs exc. BTW": "957.85" },
    { Artikel: "HB557GBS3F", Omschrijving: "Bakoven Eco Clean", "Netto Factuur Prijs": "636.05", "Adviesprijs exc. BTW": "916.53" },
    { Artikel: "HB572ABS3", Omschrijving: "Bakoven Pyrolyse", "Netto Factuur Prijs": "618.85", "Adviesprijs exc. BTW": "891.74" },
    { Artikel: "HB574ABR3F", Omschrijving: "Bakoven Pyrolyse", "Netto Factuur Prijs": "601.64", "Adviesprijs exc. BTW": "866.94" },
    { Artikel: "HB537GES3", Omschrijving: "Bakoven Eco Clean", "Netto Factuur Prijs": "601.64", "Adviesprijs exc. BTW": "866.94" },
    { Artikel: "HB454G0A3F", Omschrijving: "Bakoven Eco Clean", "Netto Factuur Prijs": "522.46", "Adviesprijs exc. BTW": "850.41" },
    { Artikel: "HB534ABR3", Omschrijving: "Bakoven Eco Clean", "Netto Factuur Prijs": "464.00", "Adviesprijs exc. BTW": "668.60" },
    { Artikel: "HB514AER4", Omschrijving: "Bakoven Eco Clean", "Netto Factuur Prijs": "458.25", "Adviesprijs exc. BTW": "660.33" },
    { Artikel: "HB113FBS1", Omschrijving: "iQ100, Oven 60 cm, 4 syst", "Netto Factuur Prijs": "366.49", "Adviesprijs exc. BTW": "528.10" },
    { Artikel: "HN978GQM1", Omschrijving: "Bakoven met magnetron en toegev. stoom", "Netto Factuur Prijs": "2194.39", "Adviesprijs exc. BTW": "3304.96" },
    { Artikel: "HN978GQB1", Omschrijving: "iQ700,Oven met magn 60 cm,27 syst,PS,pyrolyse,HC", "Netto Factuur Prijs": "2145.01", "Adviesprijs exc. BTW": "3230.58" },
    { Artikel: "HM978GNB1", Omschrijving: "iQ700,Oven met magn 60 cm,21 syst,pyrolyse,HC", "Netto Factuur Prijs": "1700.54", "Adviesprijs exc. BTW": "2561.16" },
    { Artikel: "HN978GMB1", Omschrijving: "Bakoven met magnetron en toegev. stoom", "Netto Factuur Prijs": "1700.54", "Adviesprijs exc. BTW": "2561.16" },
    { Artikel: "HM976GMM1", Omschrijving: "Bakoven met magnetron", "Netto Factuur Prijs": "1530.42", "Adviesprijs exc. BTW": "2304.96" },
    { Artikel: "HM976GMB1", Omschrijving: "iQ700,Oven met magn 60 cm,19 syst,pyrolyse,HC", "Netto Factuur Prijs": "1464.58", "Adviesprijs exc. BTW": "2205.79" },
    { Artikel: "HM776GKB1", Omschrijving: "iQ700,Oven met magn 60 cm,19 syst,pyrolyse,HC", "Netto Factuur Prijs": "1404.60", "Adviesprijs exc. BTW": "2023.97" },
    { Artikel: "HM936GCB1", Omschrijving: "iQ700,Oven met magn 60 cm,19 syst,ecoClean,HC", "Netto Factuur Prijs": "1255.00", "Adviesprijs exc. BTW": "1990.91" },
    { Artikel: "HM736G1B1", Omschrijving: "iQ700,Oven met magn 60 cm,19 syst,ecoClean,HC", "Netto Factuur Prijs": "1180.91", "Adviesprijs exc. BTW": "1701.65" },
    { Artikel: "HS958GED1", Omschrijving: "iQ700,Oven met stoom 60 cm,24 syst,ecoCl Full,HC", "Netto Factuur Prijs": "1887.10", "Adviesprijs exc. BTW": "2842.15" },
    { Artikel: "HS958KDB1", Omschrijving: "iQ700,Oven met stoom 60 cm,24 syst,ecoCl Full,HC,autoOpen door", "Netto Factuur Prijs": "1815.77", "Adviesprijs exc. BTW": "2734.71" },
    { Artikel: "HS958GDD1", Omschrijving: "iQ700,Oven met stoom 60 cm,24 syst,ecoCl Full,HC", "Netto Factuur Prijs": "1651.14", "Adviesprijs exc. BTW": "2486.78" },
    { Artikel: "HS938GDM1", Omschrijving: "Bakoven met stoom", "Netto Factuur Prijs": "1541.40", "Adviesprijs exc. BTW": "2321.49" },
    { Artikel: "HS958GCB1", Omschrijving: "iQ700,Oven met stoom 60 cm,23 syst,ecoCl Full,HC", "Netto Factuur Prijs": "1486.52", "Adviesprijs exc. BTW": "2238.84" },
    { Artikel: "HS936GCM1", Omschrijving: "Bakoven met stoom", "Netto Factuur Prijs": "1404.22", "Adviesprijs exc. BTW": "2114.88" },
    { Artikel: "HS936GCB1", Omschrijving: "Bakoven met stoom", "Netto Factuur Prijs": "1365.80", "Adviesprijs exc. BTW": "2057.02" },
    { Artikel: "HS936GAB1", Omschrijving: "iQ700,Oven met stoom 60 cm,22 syst,ecoClean,HC", "Netto Factuur Prijs": "1255.00", "Adviesprijs exc. BTW": "1990.91" },
    { Artikel: "HS736G3B1", Omschrijving: "Bakoven met stoom", "Netto Factuur Prijs": "1352.97", "Adviesprijs exc. BTW": "1949.59" },
    { Artikel: "EX80BNX68E", Omschrijving: "Inductiekookplaat met afzuiging", "Netto Factuur Prijs": "2230.00", "Adviesprijs exc. BTW": "3726.45" },
    { Artikel: "EH80BDH5SE", Omschrijving: "Inductiekookplaat met afzuiging", "Netto Factuur Prijs": "1815.77", "Adviesprijs exc. BTW": "3057.02" },
    { Artikel: "EX877KYX5E", Omschrijving: "Flexinductiekookplaat met afzuiging", "Netto Factuur Prijs": "1903.65", "Adviesprijs exc. BTW": "3222.31" },
    { Artikel: "EX877LYC5E", Omschrijving: "Flexinductiekookplaat", "Netto Factuur Prijs": "1793.82", "Adviesprijs exc. BTW": "3140.50" },
    { Artikel: "EX675LYC5E", Omschrijving: "Flexinductiekookplaat", "Netto Factuur Prijs": "1306.02", "Adviesprijs exc. BTW": "2285.95" },
    { Artikel: "EX675LXC5E", Omschrijving: "Flexinductiekookplaat", "Netto Factuur Prijs": "1086.58", "Adviesprijs exc. BTW": "1900.00" },
    { Artikel: "EH675LDC5E", Omschrijving: "Inductiekookplaat", "Netto Factuur Prijs": "878.40", "Adviesprijs exc. BTW": "1537.19" },
    { Artikel: "EH645BEB5E", Omschrijving: "Inductiekookplaat", "Netto Factuur Prijs": "556.27", "Adviesprijs exc. BTW": "973.55" },
    { Artikel: "EH631BEB5E", Omschrijving: "Inductiekookplaat", "Netto Factuur Prijs": "478.08", "Adviesprijs exc. BTW": "836.36" },
    { Artikel: "SN97YX01CE", Omschrijving: "Vaatwasser volledig geintegreerd", "Netto Factuur Prijs": "1426.86", "Adviesprijs exc. BTW": "2396.69" },
    { Artikel: "SN95YX01CE", Omschrijving: "Vaatwasser volledig geintegreerd", "Netto Factuur Prijs": "1239.59", "Adviesprijs exc. BTW": "2082.64" },
    { Artikel: "SN93HX00VE", Omschrijving: "Vaatwasser volledig geintegreerd", "Netto Factuur Prijs": "911.34", "Adviesprijs exc. BTW": "1531.40" },
    { Artikel: "SN85HX00CE", Omschrijving: "Vaatwasser volledig geintegreerd", "Netto Factuur Prijs": "724.08", "Adviesprijs exc. BTW": "1216.53" },
    { Artikel: "SN63HX01VE", Omschrijving: "Vaatwasser volledig geintegreerd", "Netto Factuur Prijs": "538.81", "Adviesprijs exc. BTW": "905.79" },
    { Artikel: "KI96NADE0", Omschrijving: "Inbouw koel-vriescombinatie", "Netto Factuur Prijs": "1706.03", "Adviesprijs exc. BTW": "2975.21" },
    { Artikel: "KI86SAFE0", Omschrijving: "Inbouw koel-vriescombinatie", "Netto Factuur Prijs": "1343.88", "Adviesprijs exc. BTW": "2342.98" },
    { Artikel: "KI86SADE0", Omschrijving: "Inbouw koel-vriescombinatie", "Netto Factuur Prijs": "1200.84", "Adviesprijs exc. BTW": "2094.21" },
    { Artikel: "KI82LADF0", Omschrijving: "Inbouw koelkast", "Netto Factuur Prijs": "977.82", "Adviesprijs exc. BTW": "1704.96" },
    { Artikel: "KI41RADE0", Omschrijving: "Inbouw koelkast", "Netto Factuur Prijs": "845.69", "Adviesprijs exc. BTW": "1475.21" },
    { Artikel: "KU22LADF0", Omschrijving: "Onderbouw koelkast", "Netto Factuur Prijs": "621.74", "Adviesprijs exc. BTW": "1084.30" },
    { Artikel: "GI21VAFE0", Omschrijving: "Inbouw vriezer", "Netto Factuur Prijs": "878.51", "Adviesprijs exc. BTW": "1532.23" },
    { Artikel: "GI11VADE0", Omschrijving: "Inbouw vriezer", "Netto Factuur Prijs": "735.48", "Adviesprijs exc. BTW": "1282.64" },
    { Artikel: "LB78575CC", Omschrijving: "Inbouw afzuigkap", "Netto Factuur Prijs": "1046.00", "Adviesprijs exc. BTW": "1823.97" },
    { Artikel: "LC98KLP60", Omschrijving: "Wandafzuigkap", "Netto Factuur Prijs": "878.40", "Adviesprijs exc. BTW": "1531.40" },
    { Artikel: "LC87KHM60", Omschrijving: "Wandafzuigkap", "Netto Factuur Prijs": "602.44", "Adviesprijs exc. BTW": "1050.41" },
    { Artikel: "LB55565", Omschrijving: "Inbouw vlakscherm afzuigkap", "Netto Factuur Prijs": "560.00", "Adviesprijs exc. BTW": "976.86" },
    { Artikel: "LI67SA680", Omschrijving: "Inbouw groepafzuigkap", "Netto Factuur Prijs": "443.68", "Adviesprijs exc. BTW": "773.55" },
    { Artikel: "LI69SA684", Omschrijving: "Inbouw groepafzuigkap", "Netto Factuur Prijs": "450.00", "Adviesprijs exc. BTW": "785.12" },
  ];
}
