import { useMemo } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

export interface ValidationIssue {
  type: 'error' | 'warning';
  code: string;
  message: string;
  rowIndex?: number;
  articleCode?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  stats: {
    totalRows: number;
    validRows: number;
    duplicateCount: number;
    priceIssueCount: number;
    missingCodeCount: number;
  };
}

interface MappedProduct {
  article_code: string;
  name: string;
  cost_price?: number;
  base_price?: number;
}

export function validateImportData(products: MappedProduct[]): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  
  // Track article codes for duplicate detection
  const articleCodeMap = new Map<string, number[]>();
  let duplicateCount = 0;
  let priceIssueCount = 0;
  let missingCodeCount = 0;
  let validRows = 0;
  
  products.forEach((product, index) => {
    const rowNum = index + 2; // +2 because header is row 1, and we're 0-indexed
    let hasError = false;
    
    // Check for missing article code
    if (!product.article_code || product.article_code.trim() === '') {
      errors.push({
        type: 'error',
        code: 'MISSING_CODE',
        message: `Rij ${rowNum}: Ontbrekende artikelcode`,
        rowIndex: index,
      });
      missingCodeCount++;
      hasError = true;
    } else {
      // Track for duplicate detection
      const code = product.article_code.trim().toUpperCase();
      const existing = articleCodeMap.get(code) || [];
      existing.push(rowNum);
      articleCodeMap.set(code, existing);
    }
    
    // Price validation
    const costPrice = product.cost_price;
    const basePrice = product.base_price;
    
    // Check for negative prices
    if (costPrice !== undefined && costPrice < 0) {
      errors.push({
        type: 'error',
        code: 'NEGATIVE_COST',
        message: `Rij ${rowNum}: Negatieve inkoopprijs (€${costPrice.toFixed(2)})`,
        rowIndex: index,
        articleCode: product.article_code,
      });
      priceIssueCount++;
      hasError = true;
    }
    
    if (basePrice !== undefined && basePrice < 0) {
      errors.push({
        type: 'error',
        code: 'NEGATIVE_PRICE',
        message: `Rij ${rowNum}: Negatieve verkoopprijs (€${basePrice.toFixed(2)})`,
        rowIndex: index,
        articleCode: product.article_code,
      });
      priceIssueCount++;
      hasError = true;
    }
    
    // Check if cost > base (potential margin issue)
    if (costPrice !== undefined && basePrice !== undefined && costPrice > basePrice) {
      warnings.push({
        type: 'warning',
        code: 'MARGIN_NEGATIVE',
        message: `Rij ${rowNum}: Inkoopprijs (€${costPrice.toFixed(2)}) hoger dan verkoopprijs (€${basePrice.toFixed(2)}) - negatieve marge`,
        rowIndex: index,
        articleCode: product.article_code,
      });
      priceIssueCount++;
    }
    
    // Check for extremely high prices (potential typo)
    if (basePrice !== undefined && basePrice > 100000) {
      warnings.push({
        type: 'warning',
        code: 'HIGH_PRICE',
        message: `Rij ${rowNum}: Ongewoon hoge verkoopprijs (€${basePrice.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}) - controleer op invoerfouten`,
        rowIndex: index,
        articleCode: product.article_code,
      });
    }
    
    // Check for zero prices (if both cost and base are provided but zero)
    if (costPrice === 0 && basePrice === 0) {
      warnings.push({
        type: 'warning',
        code: 'ZERO_PRICES',
        message: `Rij ${rowNum}: Beide prijzen zijn €0 - is dit correct?`,
        rowIndex: index,
        articleCode: product.article_code,
      });
    }
    
    if (!hasError) {
      validRows++;
    }
  });
  
  // Check for duplicates in the file
  articleCodeMap.forEach((rows, code) => {
    if (rows.length > 1) {
      duplicateCount += rows.length - 1;
      warnings.push({
        type: 'warning',
        code: 'DUPLICATE',
        message: `Artikelcode "${code}" komt ${rows.length}x voor (rijen: ${rows.join(', ')}) - alleen de laatste wordt bewaard`,
        articleCode: code,
      });
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalRows: products.length,
      validRows,
      duplicateCount,
      priceIssueCount,
      missingCodeCount,
    },
  };
}

interface ImportValidationProps {
  validation: ValidationResult;
  className?: string;
}

export function ImportValidation({ validation, className }: ImportValidationProps) {
  const { isValid, errors, warnings, stats } = validation;
  
  const hasIssues = errors.length > 0 || warnings.length > 0;
  
  if (!hasIssues) {
    return (
      <Alert className={className}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle>Data is correct</AlertTitle>
        <AlertDescription>
          Alle {stats.totalRows} rijen zijn valide en klaar voor import.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Summary */}
      <div className="flex flex-wrap gap-2">
        {stats.validRows > 0 && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            {stats.validRows} valide
          </Badge>
        )}
        {errors.length > 0 && (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            {errors.length} fouten
          </Badge>
        )}
        {warnings.length > 0 && (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {warnings.length} waarschuwingen
          </Badge>
        )}
        {stats.duplicateCount > 0 && (
          <Badge variant="secondary">
            {stats.duplicateCount} duplicaten
          </Badge>
        )}
      </div>
      
      {/* Errors */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fouten ({errors.length})</AlertTitle>
          <AlertDescription>
            <p className="mb-2">De volgende fouten moeten worden opgelost voordat je kunt importeren:</p>
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="link" size="sm" className="h-auto p-0 text-destructive">
                  Toon details
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="list-disc pl-4 mt-2 space-y-1 text-sm">
                  {errors.slice(0, 10).map((error, idx) => (
                    <li key={idx}>{error.message}</li>
                  ))}
                  {errors.length > 10 && (
                    <li className="text-muted-foreground">
                      ...en {errors.length - 10} andere fouten
                    </li>
                  )}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Waarschuwingen ({warnings.length})</AlertTitle>
          <AlertDescription className="text-amber-700">
            <p className="mb-2">Controleer deze potentiële problemen:</p>
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="link" size="sm" className="h-auto p-0 text-amber-700">
                  Toon details
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul className="list-disc pl-4 mt-2 space-y-1 text-sm">
                  {warnings.slice(0, 10).map((warning, idx) => (
                    <li key={idx}>{warning.message}</li>
                  ))}
                  {warnings.length > 10 && (
                    <li className="text-amber-600">
                      ...en {warnings.length - 10} andere waarschuwingen
                    </li>
                  )}
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
