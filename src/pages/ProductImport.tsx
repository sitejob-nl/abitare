import { useState, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Upload, FileSpreadsheet, Check, Loader2, AlertCircle, X, File, AlertTriangle, Package, FileJson } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProductImport, usePriceGroupImport, parsePrice } from '@/hooks/useProductImport';
import { useJsonImport, type JsonPayload } from '@/hooks/useJsonImport';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ImportValidation, validateImportData, ValidationResult } from '@/components/import/ImportValidation';
import { ImportHistory } from '@/components/import/ImportHistory';
import { PimsImportTab } from '@/components/import/PimsImportTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

interface PriceGroupMapping extends ColumnMapping {
  range_code: string;
  range_name: string;
  range_type: string;      // Variabile 1: Type variabele (bijv. "FPC", "CAM")
  range_code_2: string;    // Variante 2: Secundaire variant code
  range_name_2: string;    // Descrizione 2° variabile: Secundaire variant naam
  range_type_2: string;    // Variabile 2: Type secundaire variabele (bijv. "TBF", "LAJ")
  discount_group: string;  // Cat. molt.: Kortingsgroep (GR1, GR2, GR3)
  catalog_code: string;    // Codice listino cartaceo: Papieren cataloguscode
  dimension_1: string;
  dimension_2: string;
  dimension_3: string;
}

type ImportMode = 'standard' | 'price_groups';

export default function ProductImport() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'standard';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [importMode, setImportMode] = useState<ImportMode>('standard');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [fileData, setFileData] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parseError, setParseError] = useState<string>('');
  const [columnMapping, setColumnMapping] = useState<PriceGroupMapping>({
    article_code: '',
    name: '',
    cost_price: '',
    base_price: '',
    range_code: '',
    range_name: '',
    range_type: '',
    range_code_2: '',
    range_name_2: '',
    range_type_2: '',
    discount_group: '',
    catalog_code: '',
    dimension_1: '',
    dimension_2: '',
    dimension_3: '',
  });
  
  // JSON import state
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonPayloads, setJsonPayloads] = useState<JsonPayload[]>([]);

  const { importProducts, isImporting, importResult } = useProductImport();
  const { importPriceGroups, isImporting: isImportingPriceGroups, importResult: priceGroupResult } = usePriceGroupImport();
  const { parseJsonFiles, importJsonChunks, isImporting: isJsonImporting, bulkProgress, resetProgress } = useJsonImport();

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
  const autoDetectMapping = (columns: string[]): PriceGroupMapping => {
    const mapping: PriceGroupMapping = {
      article_code: '',
      name: '',
      cost_price: '',
      base_price: '',
      range_code: '',
      range_name: '',
      range_type: '',
      range_code_2: '',
      range_name_2: '',
      range_type_2: '',
      discount_group: '',
      catalog_code: '',
      dimension_1: '',
      dimension_2: '',
      dimension_3: '',
    };

    // Artikelcode patronen - specifiek naar generiek
    const articlePatterns = [
      'codice gestionale',    // Stosa exact - moet VOOR generieke 'codice' patterns

      'codice gestionale',    // Stosa exact
      'codice listino',       // Stosa alternatief
      'artikel',              // NL
      'article_code',
      'artikelcode',
      'artikelnummer',
      'article',
      'codice',
      'code',
      'sku',
      'product_code',
    ];
    
    // Naam patronen (let op: niet variabile/variante)
    const namePatterns = [
      'descrizione',          // IT (maar niet variabile)
      'omschrijving',         // NL
      'naam',
      'name',
      'description',
      'product',
      'title',
      'productnaam',
    ];
    
    // Inkoopprijs patronen
    const costPatterns = [
      'netto factuur',        // Siemens exact
      'inkoop',
      'cost',
      'netto',
      'inkoopprijs',
      'cost_price',
      'costo',
    ];
    
    // Verkoopprijs patronen
    const pricePatterns = [
      'prezzo listino',       // Stosa exact
      'adviesprijs',          // Siemens
      'verkoop',
      'advies',
      'price',
      'prijs',
      'base_price',
      'verkoopprijs',
      'prezzo',
      'listino',
    ];
    
    // Prijsgroep code patronen - STRIKTER (alleen exacte matches)
    const rangeCodePatterns = [
      'variante 1',           // Stosa exact
      'range_code',
      'prijsgroep_code',
    ];
    
    // Prijsgroep naam patronen
    const rangeNamePatterns = [
      'descrizione 1° variabile',  // Stosa exact
      'descrizione variante',
      'range_name',
      'prijsgroep_naam',
    ];
    
    // Type variabele patronen (bijv. "CAM" voor kleur accessoires)
    const rangeTypePatterns = [
      'variabile 1',        // Stosa exact
      'variable type',
      'variant type',
      'type variabele',
    ];
    
    // Secundaire variant patronen (Variabile 2 / Variante 2)
    const rangeCode2Patterns = [
      'variante 2',         // Stosa exact
      'variant_2',
      'range_code_2',
    ];
    
    const rangeName2Patterns = [
      'descrizione 2° variabile',  // Stosa exact
      'descrizione variante 2',
      'range_name_2',
    ];
    
    const rangeType2Patterns = [
      'variabile 2',        // Stosa exact
      'variable_type_2',
      'variant_type_2',
    ];
    
    // Kortingsgroep patronen
    const discountGroupPatterns = [
      'cat. molt',          // Stosa exact
      'cat molt',
      'kortingsgroep',
      'discount_group',
      'discount group',
    ];
    
    // Cataloguscode patronen
    const catalogCodePatterns = [
      'codice listino cartaceo',  // Stosa exact
      'cataloguscode',
      'catalog_code',
      'paper_code',
    ];
    
    const dim1Patterns = ['dimensione 1', 'breedte', 'width', 'larghezza', 'dim1'];
    const dim2Patterns = ['dimensione 2', 'hoogte', 'height', 'altezza', 'dim2'];
    const dim3Patterns = ['dimensione 3', 'diepte', 'depth', 'profondità', 'dim3'];

    columns.forEach(col => {
      const colLower = col.toLowerCase();
      
      // Artikelcode
      if (!mapping.article_code && articlePatterns.some(p => colLower.includes(p))) {
        mapping.article_code = col;
      }
      
      // Naam - NIET matchen als het "variabile" of "variante" bevat
      if (!mapping.name && namePatterns.some(p => colLower.includes(p)) 
          && !colLower.includes('variabile') && !colLower.includes('variante')) {
        mapping.name = col;
      }
      
      // Inkoopprijs
      if (!mapping.cost_price && costPatterns.some(p => colLower.includes(p))) {
        mapping.cost_price = col;
      }
      
      // Verkoopprijs - niet inkoop/cost
      if (!mapping.base_price && pricePatterns.some(p => colLower.includes(p)) 
          && !colLower.includes('inkoop') && !colLower.includes('cost')) {
        mapping.base_price = col;
      }
      
      // Prijsgroep code - strikte matching
      if (!mapping.range_code && rangeCodePatterns.some(p => colLower.includes(p))) {
        mapping.range_code = col;
      }
      
      // Prijsgroep naam
      if (!mapping.range_name && rangeNamePatterns.some(p => colLower.includes(p))) {
        mapping.range_name = col;
      }
      
      // Type variabele (bijv. "CAM")
      if (!mapping.range_type && rangeTypePatterns.some(p => colLower.includes(p))) {
        mapping.range_type = col;
      }
      
      // Secundaire variant code (Variante 2)
      if (!mapping.range_code_2 && rangeCode2Patterns.some(p => colLower.includes(p))) {
        mapping.range_code_2 = col;
      }
      
      // Secundaire variant naam
      if (!mapping.range_name_2 && rangeName2Patterns.some(p => colLower.includes(p))) {
        mapping.range_name_2 = col;
      }
      
      // Secundaire variant type (Variabile 2)
      if (!mapping.range_type_2 && rangeType2Patterns.some(p => colLower.includes(p))) {
        mapping.range_type_2 = col;
      }
      
      // Kortingsgroep (Cat. molt.)
      if (!mapping.discount_group && discountGroupPatterns.some(p => colLower.includes(p))) {
        mapping.discount_group = col;
      }
      
      // Cataloguscode
      if (!mapping.catalog_code && catalogCodePatterns.some(p => colLower.includes(p))) {
        mapping.catalog_code = col;
      }
      
      // Dimensies
      if (!mapping.dimension_1 && dim1Patterns.some(p => colLower.includes(p))) {
        mapping.dimension_1 = col;
      }
      if (!mapping.dimension_2 && dim2Patterns.some(p => colLower.includes(p))) {
        mapping.dimension_2 = col;
      }
      if (!mapping.dimension_3 && dim3Patterns.some(p => colLower.includes(p))) {
        mapping.dimension_3 = col;
      }
    });

    // Debug logging
    console.log('[Import AutoDetect] Column mapping result:', JSON.stringify(mapping, null, 2));
    console.log('[Import AutoDetect] Available columns:', columns);
    
    return mapping;
  };

  // Mapped products for standard import
  const mappedProducts = useMemo(() => {
    return fileData.map(row => ({
      article_code: columnMapping.article_code ? row[columnMapping.article_code]?.toString() || '' : '',
      name: columnMapping.name ? row[columnMapping.name]?.toString() || '' : '',
      cost_price: columnMapping.cost_price ? parsePrice(row[columnMapping.cost_price]) : undefined,
      base_price: columnMapping.base_price ? parsePrice(row[columnMapping.base_price]) : undefined,
    }));
  }, [fileData, columnMapping]);

  // Extract unique price groups for price_groups mode
  const extractedPriceGroups = useMemo(() => {
    if (importMode !== 'price_groups' || !columnMapping.range_code) return [];
    
    const rangeMap = new Map<string, { code: string; name: string; type: string; count: number }>();
    
    fileData.forEach(row => {
      const code = row[columnMapping.range_code]?.toString().trim();
      const name = columnMapping.range_name ? row[columnMapping.range_name]?.toString().trim() : code;
      const type = columnMapping.range_type ? row[columnMapping.range_type]?.toString().trim() : '';
      
      if (code) {
        if (rangeMap.has(code)) {
          rangeMap.get(code)!.count++;
        } else {
          rangeMap.set(code, { code, name: name || code, type: type || '', count: 1 });
        }
      }
    });
    
    return Array.from(rangeMap.values()).sort((a, b) => b.count - a.count);
  }, [fileData, columnMapping.range_code, columnMapping.range_name, columnMapping.range_type, importMode]);

  // Extract unique products for price_groups mode, including base_price from rows without variant
  const extractedProducts = useMemo(() => {
    if (importMode !== 'price_groups' || !columnMapping.article_code) return [];
    
    const productMap = new Map<string, { 
      article_code: string; 
      name: string; 
      base_price?: number;
      width_mm?: number;
      height_mm?: number;
      depth_mm?: number;
      discount_group?: string;
      catalog_code?: string;
    }>();
    
    fileData.forEach(row => {
      const code = row[columnMapping.article_code]?.toString().trim();
      if (!code) return;
      
      const rangeCode = columnMapping.range_code ? row[columnMapping.range_code]?.toString().trim() : '';
      
      if (!productMap.has(code)) {
        // First occurrence: set product data
        const basePrice = (!rangeCode && columnMapping.base_price) 
          ? parsePrice(row[columnMapping.base_price]) 
          : undefined;
        
        productMap.set(code, {
          article_code: code,
          name: columnMapping.name ? row[columnMapping.name]?.toString().trim() || code : code,
          base_price: basePrice,
          width_mm: columnMapping.dimension_1 ? parsePrice(row[columnMapping.dimension_1]) : undefined,
          height_mm: columnMapping.dimension_2 ? parsePrice(row[columnMapping.dimension_2]) : undefined,
          depth_mm: columnMapping.dimension_3 ? parsePrice(row[columnMapping.dimension_3]) : undefined,
          discount_group: columnMapping.discount_group ? row[columnMapping.discount_group]?.toString().trim() : undefined,
          catalog_code: columnMapping.catalog_code ? row[columnMapping.catalog_code]?.toString().trim() : undefined,
        });
      } else if (!rangeCode && columnMapping.base_price && !productMap.get(code)!.base_price) {
        // Update base_price from a row without variant (if not already set)
        const basePrice = parsePrice(row[columnMapping.base_price]);
        if (basePrice) {
          productMap.get(code)!.base_price = basePrice;
        }
      }
    });
    
    const products = Array.from(productMap.values());
    const withBasePrice = products.filter(p => p.base_price);
    console.log(`[Import Debug] extractedProducts: ${products.length} unique, ${withBasePrice.length} with base_price`);
    
    return products;
  }, [fileData, columnMapping, importMode]);

  // Extract prices per product-range for price_groups mode
  const extractedPrices = useMemo(() => {
    if (importMode !== 'price_groups' || !columnMapping.article_code || !columnMapping.range_code || !columnMapping.base_price) return [];
    
    const allPrices = fileData.map(row => {
      const rawPrice = row[columnMapping.base_price];
      const parsed = parsePrice(rawPrice);
      return {
        article_code: row[columnMapping.article_code]?.toString().trim() || '',
        range_code: row[columnMapping.range_code]?.toString().trim() || '',
        price: parsed || 0,
        variant_2_code: columnMapping.range_code_2 ? row[columnMapping.range_code_2]?.toString().trim() : undefined,
        variant_2_name: columnMapping.range_name_2 ? row[columnMapping.range_name_2]?.toString().trim() : undefined,
      };
    });
    
    // Filter: must have article_code, range_code (non-empty = variant row), and valid price
    const filtered = allPrices.filter(p => p.article_code && p.range_code && p.price > 0);
    
    // Debug logging for price extraction
    const zeroPrices = allPrices.filter(p => p.article_code && p.range_code && p.price === 0);
    if (zeroPrices.length > 0) {
      console.log(`[Import Debug] ${filtered.length} valid prices, ${zeroPrices.length} filtered out (price=0).`);
      console.log(`[Import Debug] Sample zero-price rows (raw values):`, 
        fileData.slice(0, 5).map(row => ({ 
          raw: row[columnMapping.base_price], 
          parsed: parsePrice(row[columnMapping.base_price]) 
        }))
      );
    }
    
    return filtered;
  }, [fileData, columnMapping, importMode]);

  // Preview data (first 10 rows)
  const previewData = useMemo(() => mappedProducts.slice(0, 10), [mappedProducts]);

  // Validation result for standard mode
  const validation: ValidationResult = useMemo(() => {
    if (importMode === 'price_groups' || mappedProducts.length === 0 || !columnMapping.article_code) {
      return { isValid: true, errors: [], warnings: [], stats: { totalRows: 0, validRows: 0, duplicateCount: 0, priceIssueCount: 0, missingCodeCount: 0 } };
    }
    return validateImportData(mappedProducts);
  }, [mappedProducts, columnMapping.article_code, importMode]);

  // Validation for price groups mode
  const priceGroupValidation = useMemo(() => {
    if (importMode !== 'price_groups') {
      return { isValid: true, errors: [], warnings: [] };
    }
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!columnMapping.article_code) {
      errors.push('Artikelcode kolom is verplicht');
    }
    if (!columnMapping.range_code) {
      errors.push('Prijsgroep code kolom is verplicht');
    }
    if (!columnMapping.base_price) {
      errors.push('Prijs kolom is verplicht');
    }
    if (extractedPriceGroups.length === 0) {
      errors.push('Geen prijsgroepen gevonden in de data');
    }
    if (extractedProducts.length === 0) {
      errors.push('Geen producten gevonden in de data');
    }
    
    if (extractedPrices.filter(p => p.price <= 0).length > 0) {
      warnings.push(`${extractedPrices.filter(p => p.price <= 0).length} rijen met ongeldige prijs worden overgeslagen`);
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  }, [importMode, columnMapping, extractedPriceGroups, extractedProducts, extractedPrices]);

  // Total count
  const totalCount = fileData.length;
  const importableCount = importMode === 'price_groups' ? extractedProducts.length : validation.stats.validRows;

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsParsingFile(true);
    setParseError('');
    setFileName(file.name);

    try {
      // JSON detection
      if (file.name.toLowerCase().endsWith('.json')) {
        const payloads = await parseJsonFiles(files);
        setJsonPayloads(payloads);
        setJsonMode(true);
        setFileName(payloads.length === 1 ? payloads[0].fileName : `${payloads.length} JSON bestanden`);
        
        // Auto-detect supplier from JSON
        const supplierId = payloads[0]?.data?.supplier_id as string;
        if (supplierId && suppliers.some(s => s.id === supplierId)) {
          setSelectedSupplierId(supplierId);
        }
        
        setStep(2);
        setIsParsingFile(false);
        return;
      }

      // Excel/CSV flow (existing)
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<ParsedRow>(worksheet, {
        defval: '',
        raw: false,
      });

      if (jsonData.length === 0) {
        throw new Error('Geen data gevonden in het bestand');
      }

      setFileData(jsonData);
      setJsonMode(false);
      
      const columns = Object.keys(jsonData[0]);
      const detectedMapping = autoDetectMapping(columns);
      
      let shouldUsePriceGroups = false;
      if (detectedMapping.range_code && detectedMapping.article_code) {
        const rangeValues = new Set<string>();
        const articleValues = new Set<string>();
        jsonData.slice(0, 200).forEach(row => {
          const rangeVal = row[detectedMapping.range_code]?.toString().trim();
          const articleVal = row[detectedMapping.article_code]?.toString().trim();
          if (rangeVal && rangeVal !== '-' && rangeVal !== '' && rangeVal !== '€ -') rangeValues.add(rangeVal);
          if (articleVal && articleVal !== '-' && articleVal !== '') articleValues.add(articleVal);
        });
        const hasMultipleRanges = rangeValues.size >= 3;
        const rangesAreReused = articleValues.size > 0 && rangeValues.size < articleValues.size * 0.5;
        const notTooManyRanges = rangeValues.size < 500;
        shouldUsePriceGroups = hasMultipleRanges && rangesAreReused && notTooManyRanges;
        if (!shouldUsePriceGroups) {
          detectedMapping.range_code = '';
          detectedMapping.range_name = '';
        }
      }
      
      setColumnMapping(detectedMapping);
      setImportMode(shouldUsePriceGroups ? 'price_groups' : 'standard');
      setStep(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fout bij het lezen van het bestand';
      setParseError(message);
      setFileData([]);
      setJsonPayloads([]);
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
    if (jsonMode) {
      // JSON direct import
      await importJsonChunks(jsonPayloads, selectedSupplierId || undefined);
      setStep(4);
      return;
    }

    if (!selectedSupplierId || !columnMapping.article_code) return;
    
    if (importMode === 'price_groups') {
      await importPriceGroups({
        products: extractedProducts,
        ranges: extractedPriceGroups,
        prices: extractedPrices,
        supplierId: selectedSupplierId,
        categoryId: selectedCategoryId || undefined,
      });
    } else {
      const validProducts = mappedProducts.filter(p => p.article_code && p.article_code.trim() !== '');
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
    }
    
    setStep(4);
  };

  const resetImport = () => {
    setStep(1);
    setFileData([]);
    setFileName('');
    setParseError('');
    setImportMode('standard');
    setJsonMode(false);
    setJsonPayloads([]);
    resetProgress();
    setSelectedSupplierId('');
    setSelectedCategoryId('');
    setColumnMapping({
      article_code: '',
      name: '',
      cost_price: '',
      base_price: '',
      range_code: '',
      range_name: '',
      range_type: '',
      range_code_2: '',
      range_name_2: '',
      range_type_2: '',
      discount_group: '',
      catalog_code: '',
      dimension_1: '',
      dimension_2: '',
      dimension_3: '',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const currentIsImporting = jsonMode ? isJsonImporting : (importMode === 'price_groups' ? isImportingPriceGroups : isImporting);
  const currentResult = importMode === 'price_groups' ? priceGroupResult : importResult;
  const currentValidation = importMode === 'price_groups' ? priceGroupValidation : validation;

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

        {/* Import History */}
        <ImportHistory />

        {/* Tabs for Standard vs PIMS */}
        <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })}>
          <TabsList>
            <TabsTrigger value="standard">Prijslijst Import</TabsTrigger>
            <TabsTrigger value="pims">PIMS Import</TabsTrigger>
          </TabsList>

          <TabsContent value="pims">
            <PimsImportTab />
          </TabsContent>

          <TabsContent value="standard">

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
              <CardDescription>Upload een CSV, Excel prijslijst of JSON importbestand</CardDescription>
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
                  accept=".csv,.xlsx,.xls,.json"
                  multiple
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
                      <span>CSV, XLSX, XLS</span>
                      <FileJson className="h-4 w-4 ml-2" />
                      <span>JSON (Stosa import)</span>
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

        {/* Step 2: Supplier, Mode & Category Selection */}
        {step === 2 && jsonMode && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                Stap 2: JSON Import
              </CardTitle>
              <CardDescription>
                {jsonPayloads.length} bestand{jsonPayloads.length !== 1 ? 'en' : ''} geselecteerd
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* JSON Stats */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Producten</span>
                  </div>
                  <div className="text-2xl font-bold">{jsonPayloads.reduce((s, p) => s + p.stats.products, 0).toLocaleString()}</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Prijsgroepen</div>
                  <div className="text-2xl font-bold">{jsonPayloads.reduce((s, p) => s + p.stats.ranges, 0)}</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Prijzen</div>
                  <div className="text-2xl font-bold">{jsonPayloads.reduce((s, p) => s + p.stats.prices, 0).toLocaleString()}</div>
                </div>
              </div>

              {/* File list */}
              {jsonPayloads.length > 1 && (
                <div>
                  <h4 className="font-medium mb-2">Bestanden ({jsonPayloads.length})</h4>
                  <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bestand</TableHead>
                          <TableHead className="text-right">Producten</TableHead>
                          <TableHead className="text-right">Prijzen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jsonPayloads.map((p, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-sm">{p.fileName}</TableCell>
                            <TableCell className="text-right">{p.stats.products}</TableCell>
                            <TableCell className="text-right">{p.stats.prices.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Supplier override */}
              <div className="space-y-2">
                <Label>Leverancier {selectedSupplierId ? '' : '(optioneel - standaard uit JSON)'}</Label>
                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Leverancier uit JSON gebruiken" />
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

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={resetImport}>Terug</Button>
                <Button onClick={handleImport} disabled={isJsonImporting}>
                  {isJsonImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importeren...
                    </>
                  ) : (
                    `Importeer ${jsonPayloads.length} chunk${jsonPayloads.length !== 1 ? 's' : ''}`
                  )}
                </Button>
              </div>

              {/* Bulk progress */}
              {bulkProgress && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>Chunk {bulkProgress.current} van {bulkProgress.total}</span>
                    <span>{Math.round((bulkProgress.current / bulkProgress.total) * 100)}%</span>
                  </div>
                  <Progress value={(bulkProgress.current / bulkProgress.total) * 100} />
                  
                  {bulkProgress.results.length > 0 && (
                    <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Bestand</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Resultaat</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bulkProgress.results.map((r, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-sm">{r.fileName}</TableCell>
                              <TableCell>
                                {r.success ? (
                                  <Badge variant="default">OK</Badge>
                                ) : (
                                  <Badge variant="destructive">Fout</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {r.success 
                                  ? `${(r.products_inserted || 0) + (r.products_updated || 0)} prod, ${(r.prices_inserted || 0).toLocaleString()} prijzen`
                                  : r.error
                                }
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 2 && !jsonMode && (
          <Card>
            <CardHeader>
              <CardTitle>Stap 2: Import instellingen</CardTitle>
              <CardDescription>
                Bestand: <span className="font-medium">{fileName}</span> ({fileData.length} rijen)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Import Mode Selection */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Import type</Label>
                <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as ImportMode)} className="grid gap-3">
                  <div className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors ${importMode === 'standard' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                    <RadioGroupItem value="standard" id="standard" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="standard" className="font-medium cursor-pointer">Standaard</Label>
                      <p className="text-sm text-muted-foreground">Eén prijs per product - voor simpele prijslijsten</p>
                    </div>
                  </div>
                  <div className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-colors ${importMode === 'price_groups' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                    <RadioGroupItem value="price_groups" id="price_groups" className="mt-1" />
                    <div className="flex-1">
                      <Label htmlFor="price_groups" className="font-medium cursor-pointer">Prijsgroepen</Label>
                      <p className="text-sm text-muted-foreground">Meerdere prijzen per product - voor Stosa en vergelijkbare leveranciers</p>
                    </div>
                    {columnMapping.range_code && (
                      <Badge variant="secondary" className="ml-2">Aanbevolen</Badge>
                    )}
                  </div>
                </RadioGroup>
              </div>

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
              {/* Column Mapping - Standard mode */}
              {importMode === 'standard' && (
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
                        value={columnMapping[key as keyof ColumnMapping] || '__none__'} 
                        onValueChange={(value) => setColumnMapping(prev => ({ ...prev, [key]: value === '__none__' ? '' : value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer kolom" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">-- Niet mappen --</SelectItem>
                          {availableColumns.map((col) => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              )}

              {/* Column Mapping - Price Groups mode */}
              {importMode === 'price_groups' && (
                <div className="space-y-6">
                  {/* Basic fields */}
                  <div>
                    <h4 className="font-medium mb-3">Product velden</h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      {[
                        { key: 'article_code', label: 'Artikelcode *' },
                        { key: 'name', label: 'Naam' },
                        { key: 'base_price', label: 'Prijs *' },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-2">
                          <Label>{label}</Label>
                          <Select 
                            value={columnMapping[key as keyof PriceGroupMapping] || '__none__'} 
                            onValueChange={(value) => setColumnMapping(prev => ({ ...prev, [key]: value === '__none__' ? '' : value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer kolom" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">-- Niet mappen --</SelectItem>
                              {availableColumns.map((col) => (
                                <SelectItem key={col} value={col}>{col}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price group fields */}
                  <div>
                    <h4 className="font-medium mb-3">Primaire prijsgroep (Variabile 1)</h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      {[
                        { key: 'range_type', label: 'Type variabele (Variabile 1)' },
                        { key: 'range_code', label: 'Prijsgroep code (Variante 1) *' },
                        { key: 'range_name', label: 'Prijsgroep naam (Descrizione 1°)' },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-2">
                          <Label>{label}</Label>
                          <Select 
                            value={columnMapping[key as keyof PriceGroupMapping] || '__none__'} 
                            onValueChange={(value) => setColumnMapping(prev => ({ ...prev, [key]: value === '__none__' ? '' : value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer kolom" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">-- Niet mappen --</SelectItem>
                              {availableColumns.map((col) => (
                                <SelectItem key={col} value={col}>{col}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Secondary variant fields */}
                  <div>
                    <h4 className="font-medium mb-3">Secundaire variant (Variabile 2) - optioneel</h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      {[
                        { key: 'range_type_2', label: 'Type variabele (Variabile 2)' },
                        { key: 'range_code_2', label: 'Variant code (Variante 2)' },
                        { key: 'range_name_2', label: 'Variant naam (Descrizione 2°)' },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-2">
                          <Label>{label}</Label>
                          <Select 
                            value={columnMapping[key as keyof PriceGroupMapping] || '__none__'} 
                            onValueChange={(value) => setColumnMapping(prev => ({ ...prev, [key]: value === '__none__' ? '' : value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer kolom" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">-- Niet mappen --</SelectItem>
                              {availableColumns.map((col) => (
                                <SelectItem key={col} value={col}>{col}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Extra metadata fields */}
                  <div>
                    <h4 className="font-medium mb-3">Extra velden - optioneel</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      {[
                        { key: 'discount_group', label: 'Kortingsgroep (Cat. molt.)' },
                        { key: 'catalog_code', label: 'Cataloguscode (Codice listino cartaceo)' },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-2">
                          <Label>{label}</Label>
                          <Select 
                            value={columnMapping[key as keyof PriceGroupMapping] || '__none__'} 
                            onValueChange={(value) => setColumnMapping(prev => ({ ...prev, [key]: value === '__none__' ? '' : value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer kolom" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">-- Niet mappen --</SelectItem>
                              {availableColumns.map((col) => (
                                <SelectItem key={col} value={col}>{col}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dimension fields */}
                  <div>
                    <h4 className="font-medium mb-3">Afmetingen - optioneel</h4>
                    <div className="grid gap-4 md:grid-cols-3">
                      {[
                        { key: 'dimension_1', label: 'Breedte (mm)' },
                        { key: 'dimension_2', label: 'Hoogte (mm)' },
                        { key: 'dimension_3', label: 'Diepte (mm)' },
                      ].map(({ key, label }) => (
                        <div key={key} className="space-y-2">
                          <Label>{label}</Label>
                          <Select 
                            value={columnMapping[key as keyof PriceGroupMapping] || '__none__'} 
                            onValueChange={(value) => setColumnMapping(prev => ({ ...prev, [key]: value === '__none__' ? '' : value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer kolom" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">-- Niet mappen --</SelectItem>
                              {availableColumns.map((col) => (
                                <SelectItem key={col} value={col}>{col}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Table - Standard mode */}
              {importMode === 'standard' && (
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
              )}

              {/* Preview - Price Groups mode */}
              {importMode === 'price_groups' && columnMapping.article_code && columnMapping.range_code && (
                <div className="space-y-4">
                  {/* Statistics */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Producten</span>
                      </div>
                      <div className="text-2xl font-bold">{extractedProducts.length.toLocaleString()}</div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Prijsgroepen</div>
                      <div className="text-2xl font-bold">{extractedPriceGroups.length}</div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Prijzen</div>
                      <div className="text-2xl font-bold">{extractedPrices.length.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Price groups preview */}
                  {extractedPriceGroups.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Gevonden prijsgroepen (top 10)</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {columnMapping.range_type && <TableHead>Type</TableHead>}
                              <TableHead>Code</TableHead>
                              <TableHead>Naam</TableHead>
                              <TableHead className="text-right">Aantal prijzen</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {extractedPriceGroups.slice(0, 10).map((group, idx) => (
                              <TableRow key={idx}>
                                {columnMapping.range_type && (
                                  <TableCell>
                                    {group.type && (
                                      <Badge variant="secondary" className="font-mono">
                                        {group.type}
                                      </Badge>
                                    )}
                                  </TableCell>
                                )}
                                <TableCell className="font-mono">{group.code}</TableCell>
                                <TableCell>{group.name}</TableCell>
                                <TableCell className="text-right">{group.count.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                            {extractedPriceGroups.length > 10 && (
                              <TableRow>
                                <TableCell colSpan={columnMapping.range_type ? 4 : 3} className="text-center text-muted-foreground">
                                  ... en {extractedPriceGroups.length - 10} meer prijsgroepen
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Products preview */}
                  {extractedProducts.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Preview producten (eerste 10)</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Artikelcode</TableHead>
                              <TableHead>Naam</TableHead>
                              <TableHead className="text-right">B x H x D (mm)</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {extractedProducts.slice(0, 10).map((product, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-mono">{product.article_code}</TableCell>
                                <TableCell>{product.name}</TableCell>
                                <TableCell className="text-right text-muted-foreground">
                                  {product.width_mm || '-'} x {product.height_mm || '-'} x {product.depth_mm || '-'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Validation Results - Standard mode */}
              {importMode === 'standard' && columnMapping.article_code && mappedProducts.length > 0 && (
                <ImportValidation validation={validation} />
              )}

              {/* Validation Results - Price Groups mode */}
              {importMode === 'price_groups' && (
                <>
                  {priceGroupValidation.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc pl-4">
                          {priceGroupValidation.errors.map((error, idx) => (
                            <li key={idx}>{error}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                  {priceGroupValidation.warnings.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <ul className="list-disc pl-4">
                          {priceGroupValidation.warnings.map((warning, idx) => (
                            <li key={idx}>{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              {importMode === 'standard' && !columnMapping.article_code && (
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
                  disabled={currentIsImporting || !currentValidation.isValid}
                >
                  {currentIsImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importeren...
                    </>
                  ) : !currentValidation.isValid ? (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Fouten oplossen
                    </>
                  ) : importMode === 'price_groups' ? (
                    `Importeer ${extractedProducts.length.toLocaleString()} producten met ${extractedPriceGroups.length} prijsgroepen`
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
        {step === 4 && jsonMode && bulkProgress && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-6 w-6 text-primary" />
                JSON Import voltooid
              </CardTitle>
              <CardDescription>
                {bulkProgress.results.filter(r => r.success).length}/{bulkProgress.total} chunks succesvol
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-primary">
                    {bulkProgress.results.reduce((s, r) => s + (r.products_inserted || 0), 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Nieuwe producten</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-primary">
                    {bulkProgress.results.reduce((s, r) => s + (r.products_updated || 0), 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Bijgewerkt</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold text-primary">
                    {bulkProgress.results.reduce((s, r) => s + (r.ranges_created || 0), 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Prijsgroepen</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold">
                    {bulkProgress.results.reduce((s, r) => s + (r.prices_inserted || 0), 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Prijzen</div>
                </div>
              </div>

              {/* Per-chunk results */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bestand</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Producten</TableHead>
                      <TableHead className="text-right">Prijzen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkProgress.results.map((r, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">{r.fileName}</TableCell>
                        <TableCell>
                          {r.success ? (
                            <Badge variant="default">OK</Badge>
                          ) : (
                            <Badge variant="destructive" title={r.error}>Fout</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.success ? `${(r.products_inserted || 0) + (r.products_updated || 0)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.success ? (r.prices_inserted || 0).toLocaleString() : r.error}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-center gap-4 pt-4">
                <Button variant="outline" onClick={resetImport}>Nieuwe import</Button>
                <Button onClick={() => navigate('/products')}>Bekijk producten</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && !jsonMode && currentResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-6 w-6 text-primary" />
                Import voltooid
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {importMode === 'price_groups' && priceGroupResult ? (
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold text-primary">{priceGroupResult.products_inserted}</div>
                    <div className="text-sm text-muted-foreground">Nieuwe producten</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold text-primary">{priceGroupResult.products_updated}</div>
                    <div className="text-sm text-muted-foreground">Bijgewerkt</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold text-primary">{priceGroupResult.ranges_created}</div>
                    <div className="text-sm text-muted-foreground">Prijsgroepen</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold">{priceGroupResult.prices_inserted.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Prijzen</div>
                  </div>
                </div>
              ) : importResult && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold text-primary">{importResult.inserted}</div>
                    <div className="text-sm text-muted-foreground">Nieuwe producten</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold text-primary">{importResult.updated}</div>
                    <div className="text-sm text-muted-foreground">Bijgewerkt</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-3xl font-bold">{importResult.total}</div>
                    <div className="text-sm text-muted-foreground">Totaal verwerkt</div>
                  </div>
                </div>
              )}

              {currentResult && 'errors' in currentResult && currentResult.errors && currentResult.errors.length > 0 && (
                <div className="space-y-2">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Er waren {currentResult.errors.length} fouten tijdens de import.
                    </AlertDescription>
                  </Alert>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        Import fouten ({currentResult.errors.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-60 overflow-y-auto border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">#</TableHead>
                              <TableHead>Foutmelding</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {currentResult.errors.map((error, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                                <TableCell className="text-sm text-destructive">{error}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <div className="flex justify-center gap-4 pt-4">
                <Button variant="outline" onClick={resetImport}>Nieuwe import</Button>
                <Button onClick={() => navigate('/products')}>Bekijk producten</Button>
              </div>
            </CardContent>
          </Card>
        )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
