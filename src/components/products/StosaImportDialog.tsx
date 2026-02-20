// components/products/StosaImportDialog.tsx
// STOSA Excel Import Component v5 - with flexible column recognition

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import * as XLSX from 'xlsx'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

const VARIANT_TO_PRICE_GROUP: Record<string, { pg: string; door: string; serie: string }> = {
  '401': { pg: '1', door: 'full', serie: 'LOOK' },
  '402': { pg: '2', door: 'full', serie: 'LOOK' },
  '403': { pg: '3', door: 'full', serie: 'LOOK' },
  '404': { pg: '4', door: 'full', serie: 'LOOK' },
  '405': { pg: '5', door: 'full', serie: 'LOOK' },
  '406': { pg: '6', door: 'full', serie: 'LOOK' },
  '407': { pg: '7', door: 'full', serie: 'LOOK' },
  '408': { pg: '8', door: 'full', serie: 'LOOK' },
  '409': { pg: '9', door: 'full', serie: 'LOOK' },
  '410': { pg: '10', door: 'full', serie: 'LOOK' },
  '431': { pg: 'A', door: 'glass', serie: 'LOOK' },
  '432': { pg: 'B', door: 'glass', serie: 'LOOK' },
  '433': { pg: 'C', door: 'glass', serie: 'LOOK' },
  '443': { pg: '3', door: 'glass', serie: 'LOOK' },
  '444': { pg: '4', door: 'glass', serie: 'LOOK' },
  '445': { pg: '5', door: 'glass', serie: 'LOOK' },
  '446': { pg: '6', door: 'glass', serie: 'LOOK' },
  '447': { pg: '7', door: 'glass', serie: 'LOOK' },
  '449': { pg: '9', door: 'glass', serie: 'LOOK' },
  '450': { pg: '10', door: 'full', serie: 'LOOK' },
  '461': { pg: '1', door: 'full', serie: 'CL' },
  '462': { pg: '2', door: 'full', serie: 'CL' },
  '463': { pg: '3', door: 'full', serie: 'CL' },
  '464': { pg: '4', door: 'full', serie: 'CL' },
  '465': { pg: '5', door: 'full', serie: 'CL' },
  '466': { pg: '6', door: 'full', serie: 'CL' },
  '481': { pg: '1', door: 'glass', serie: 'CL' },
  '482': { pg: '2', door: 'glass', serie: 'CL' },
  '483': { pg: '3', door: 'glass', serie: 'CL' },
  '484': { pg: '4', door: 'glass', serie: 'CL' },
  '485': { pg: '5', door: 'glass', serie: 'CL' },
  '486': { pg: '6', door: 'glass', serie: 'CL' },
  '487': { pg: '5', door: 'full', serie: 'CL' },
  '488': { pg: '6', door: 'full', serie: 'CL' },
  '492': { pg: '7', door: 'glass', serie: 'CL' },
  '493': { pg: '7', door: 'full', serie: 'CL' },
}

const COLUMN_ALIASES: Record<string, string[]> = {
  'Codice gestionale': ['codice gestionale', 'codice_gestionale', 'sku', 'artikelcode', 'article_code'],
  'Codice listino cartaceo': ['codice listino cartaceo', 'codice_listino', 'catalog_code', 'catalogcode'],
  'Descrizione': ['descrizione', 'description', 'omschrijving', 'name'],
  'Variabile 1': ['variabile 1', 'variabile1', 'variable 1', 'var1'],
  'Variante 1': ['variante 1', 'variante1', 'variant 1'],
  'Descrizione 1° variabile - 1°Variante': ['descrizione 1° variabile', 'descrizione 1', 'desc var 1'],
  'Prezzo Listino': ['prezzo listino', 'prezzo', 'price', 'prijs', 'listino'],
  'Cat. molt.': ['cat. molt.', 'cat molt', 'categoria', 'discount_group'],
  'Dimensione 1': ['dimensione 1', 'dim1', 'width', 'breedte', 'larghezza'],
  'Dimensione 2': ['dimensione 2', 'dim2', 'height', 'hoogte', 'altezza'],
  'Dimensione 3': ['dimensione 3', 'dim3', 'depth', 'diepte', 'profondita'],
}

const REQUIRED_COLUMNS = ['Codice gestionale', 'Variabile 1', 'Prezzo Listino']

interface ParseResult {
  isStosa: boolean
  fileName: string
  totalRows: number
  fpcRows: number
  uniqueProducts: number
  priceGroups: Set<string>
  series: Set<string>
  rows: any[]
  errors: string[]
  warnings: string[]
  detectedColumns: string[]
  missingColumns: string[]
  sheetName: string
}

interface ImportStats {
  total_rows: number
  products_created: number
  products_updated: number
  prices_created: number
  prices_updated: number
  price_groups_created: number
  categories_created: number
  discount_groups_created: number
  skipped_rows: number
  by_category: Record<string, number>
  by_unit: Record<string, number>
  by_kitchen_group: Record<string, number>
  errors: string[]
}

interface StosaImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierId: string
  supplierName: string
  onSuccess?: () => void
}

function findStandardColumnName(col: string): string | null {
  const normalized = col.trim().toLowerCase()
  
  for (const [standard, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (standard.toLowerCase() === normalized) return standard
    for (const alias of aliases) {
      if (alias.toLowerCase() === normalized) return standard
    }
  }
  
  if (normalized.includes('codice') && normalized.includes('gestionale')) return 'Codice gestionale'
  if (normalized.includes('codice') && normalized.includes('listino')) return 'Codice listino cartaceo'
  if (normalized.includes('prezzo') && normalized.includes('listino')) return 'Prezzo Listino'
  if (normalized.includes('variabile') && normalized.includes('1')) return 'Variabile 1'
  if (normalized.includes('variante') && normalized.includes('1')) return 'Variante 1'
  if (normalized === 'descrizione' || normalized === 'description') return 'Descrizione'
  if (normalized.includes('cat') && normalized.includes('molt')) return 'Cat. molt.'
  if (normalized.includes('dimensione') && normalized.includes('1')) return 'Dimensione 1'
  if (normalized.includes('dimensione') && normalized.includes('2')) return 'Dimensione 2'
  if (normalized.includes('dimensione') && normalized.includes('3')) return 'Dimensione 3'
  
  return null
}

function normalizeRow(row: any, columnMapping: Record<string, string>): any {
  const normalized: any = {}
  for (const [originalCol, value] of Object.entries(row)) {
    const trimmedCol = originalCol.trim()
    const standardCol = columnMapping[trimmedCol] || columnMapping[originalCol] || trimmedCol
    normalized[standardCol] = value
  }
  return normalized
}

function parseStosaExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        let sheetName = workbook.SheetNames[0]
        for (const name of workbook.SheetNames) {
          const lower = name.toLowerCase()
          if (lower === 'inglese' || lower === 'english' || lower.includes('inglese')) {
            sheetName = name
            break
          }
        }

        console.log('Available sheets:', workbook.SheetNames)
        console.log('Using sheet:', sheetName)

        const worksheet = workbook.Sheets[sheetName]
        const rawRows = XLSX.utils.sheet_to_json(worksheet) as any[]

        const result: ParseResult = {
          isStosa: false,
          fileName: file.name,
          totalRows: rawRows.length,
          fpcRows: 0,
          uniqueProducts: 0,
          priceGroups: new Set(),
          series: new Set(),
          rows: [],
          errors: [],
          warnings: [],
          detectedColumns: [],
          missingColumns: [],
          sheetName,
        }

        if (rawRows.length === 0) {
          result.errors.push('Bestand is leeg')
          resolve(result)
          return
        }

        const originalColumns = Object.keys(rawRows[0])
        console.log('Original columns:', originalColumns)

        const columnMapping: Record<string, string> = {}
        const foundStandardColumns: string[] = []

        for (const col of originalColumns) {
          const trimmedCol = col.trim()
          const standardName = findStandardColumnName(trimmedCol)
          if (standardName) {
            columnMapping[col] = standardName
            columnMapping[trimmedCol] = standardName
            if (!foundStandardColumns.includes(standardName)) {
              foundStandardColumns.push(standardName)
            }
          } else {
            columnMapping[col] = trimmedCol
            columnMapping[trimmedCol] = trimmedCol
          }
        }

        console.log('Column mapping:', columnMapping)
        console.log('Found standard columns:', foundStandardColumns)

        result.detectedColumns = foundStandardColumns

        for (const required of REQUIRED_COLUMNS) {
          if (!foundStandardColumns.includes(required)) {
            result.missingColumns.push(required)
          }
        }

        if (result.missingColumns.length > 0) {
          result.errors.push(`Ontbrekende kolommen: ${result.missingColumns.join(', ')}`)
          result.warnings.push(
            `Gevonden kolommen: ${originalColumns.slice(0, 5).join(', ')}${originalColumns.length > 5 ? '...' : ''}`
          )
          resolve(result)
          return
        }

        result.isStosa = true
        const normalizedRows = rawRows.map(row => normalizeRow(row, columnMapping))
        const uniqueProducts = new Set<string>()
        
        for (const row of normalizedRows) {
          const sku = row['Codice gestionale']
          if (sku) uniqueProducts.add(String(sku))

          if (row['Variabile 1'] === 'FPC') {
            result.fpcRows++
            const variantCode = String(row['Variante 1'] || '')
            const variantInfo = VARIANT_TO_PRICE_GROUP[variantCode]
            
            if (variantInfo) {
              result.priceGroups.add(variantInfo.pg)
              result.series.add(variantInfo.serie)
            } else {
              const desc = row['Descrizione 1° variabile - 1°Variante'] || ''
              const match = String(desc).match(/CATEG\.\s*""([0-9]{1,2}|[ABC])""/i)
              if (match) result.priceGroups.add(match[1])
            }
          }
        }

        result.uniqueProducts = uniqueProducts.size
        result.rows = normalizedRows

        if (result.fpcRows === 0) {
          result.warnings.push('Geen FPC rijen gevonden - prijsgroep prijzen worden niet geïmporteerd')
        }
        if (result.priceGroups.size === 0 && result.fpcRows > 0) {
          result.warnings.push('FPC rijen gevonden maar geen prijsgroepen herkend')
        }

        resolve(result)
      } catch (err) {
        console.error('Parse error:', err)
        reject(err)
      }
    }

    reader.onerror = () => reject(new Error('Kon bestand niet lezen'))
    reader.readAsArrayBuffer(file)
  })
}

export function StosaImportDialog({
  open,
  onOpenChange,
  supplierId,
  supplierName,
  onSuccess,
}: StosaImportDialogProps) {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [importStats, setImportStats] = useState<ImportStats | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setParseResult(null)
    setImportStats(null)

    try {
      const result = await parseStosaExcel(file)
      setParseResult(result)
    } catch (err) {
      toast.error('Fout bij verwerken bestand')
      console.error(err)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  })

  const handleImport = async () => {
    if (!parseResult?.isStosa || !parseResult.rows.length) return

    setImporting(true)
    setProgress(0)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Niet ingelogd')

      const modelName = parseResult.series.size === 1
        ? Array.from(parseResult.series)[0]
        : parseResult.series.size > 0
          ? Array.from(parseResult.series).join(', ')
          : undefined

      const CHUNK_SIZE = 2000
      const chunks: any[][] = []
      
      for (let i = 0; i < parseResult.rows.length; i += CHUNK_SIZE) {
        chunks.push(parseResult.rows.slice(i, i + CHUNK_SIZE))
      }

      console.log(`Splitting ${parseResult.rows.length} rows into ${chunks.length} chunks of max ${CHUNK_SIZE}`)

      const combinedStats: ImportStats = {
        total_rows: 0,
        products_created: 0,
        products_updated: 0,
        prices_created: 0,
        prices_updated: 0,
        price_groups_created: 0,
        categories_created: 0,
        discount_groups_created: 0,
        skipped_rows: 0,
        by_category: {},
        by_unit: {},
        by_kitchen_group: {},
        errors: [],
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const chunkNumber = i + 1
        const progressPercent = Math.round((i / chunks.length) * 90)
        setProgress(progressPercent)

        console.log(`Processing chunk ${chunkNumber}/${chunks.length} (${chunk.length} rows)`)

        try {
          const response = await supabase.functions.invoke('stosa-import', {
            body: {
              supplier_id: supplierId,
              rows: chunk,
              file_name: parseResult.fileName,
              model_name: modelName,
              chunk_number: chunkNumber,
              total_chunks: chunks.length,
            },
          })

          if (response.error) {
            console.error(`Chunk ${chunkNumber} failed:`, response.error)
            combinedStats.errors.push(`Chunk ${chunkNumber}: ${response.error.message}`)
            continue
          }

          const stats = response.data?.stats as ImportStats
          if (stats) {
            combinedStats.total_rows += stats.total_rows || 0
            combinedStats.products_created += stats.products_created || 0
            combinedStats.products_updated += stats.products_updated || 0
            combinedStats.prices_created += stats.prices_created || 0
            combinedStats.prices_updated += stats.prices_updated || 0
            combinedStats.skipped_rows += stats.skipped_rows || 0
            
            if (i === 0) {
              combinedStats.price_groups_created = stats.price_groups_created || 0
              combinedStats.categories_created = stats.categories_created || 0
              combinedStats.discount_groups_created = stats.discount_groups_created || 0
            }
            
            if (stats.by_unit) {
              for (const [unit, count] of Object.entries(stats.by_unit)) {
                combinedStats.by_unit[unit] = (combinedStats.by_unit[unit] || 0) + count
              }
            }
            if (stats.by_category) {
              for (const [cat, count] of Object.entries(stats.by_category)) {
                combinedStats.by_category[cat] = (combinedStats.by_category[cat] || 0) + count
              }
            }
            if (stats.by_kitchen_group) {
              for (const [group, count] of Object.entries(stats.by_kitchen_group)) {
                combinedStats.by_kitchen_group[group] = (combinedStats.by_kitchen_group[group] || 0) + count
              }
            }
            if (stats.errors) {
              combinedStats.errors.push(...stats.errors)
            }
          }
        } catch (chunkError) {
          console.error(`Chunk ${chunkNumber} error:`, chunkError)
          combinedStats.errors.push(`Chunk ${chunkNumber}: ${chunkError instanceof Error ? chunkError.message : 'Unknown error'}`)
        }
      }

      setProgress(100)
      setImportStats(combinedStats)

      if (combinedStats.errors.length > 0) {
        toast.warning(
          `Import voltooid met ${combinedStats.errors.length} waarschuwingen. ${combinedStats.products_created} producten aangemaakt.`
        )
      } else {
        toast.success(
          `Import voltooid: ${combinedStats.products_created} nieuwe producten, ${combinedStats.prices_created} prijzen`
        )
      }

      onSuccess?.()
    } catch (err) {
      console.error('Import error:', err)
      toast.error(err instanceof Error ? err.message : 'Import mislukt')
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    setParseResult(null)
    setImportStats(null)
    setProgress(0)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>STOSA Prijslijst Importeren</DialogTitle>
          <DialogDescription>
            Upload de LISTINO VENDITA STOSA Excel voor {supplierName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
            {isDragActive ? (
              <p>Sleep het bestand hier...</p>
            ) : (
              <p className="text-muted-foreground">
                Sleep een Excel bestand hierheen of klik om te selecteren
              </p>
            )}
          </div>

          {parseResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                <span className="font-medium">{parseResult.fileName}</span>
                {parseResult.isStosa ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    STOSA formaat
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Onbekend formaat
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between p-2 bg-muted rounded">
                  <span>Sheet:</span>
                  <span className="font-mono">{parseResult.sheetName}</span>
                </div>
                <div className="flex justify-between p-2 bg-muted rounded">
                  <span>Totaal rijen:</span>
                  <span className="font-mono">{parseResult.totalRows.toLocaleString()}</span>
                </div>
                {parseResult.isStosa && (
                  <>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Unieke producten:</span>
                      <span className="font-mono">{parseResult.uniqueProducts.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>FPC rijen (prijzen):</span>
                      <span className="font-mono">{parseResult.fpcRows.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Prijsgroepen:</span>
                      <span className="font-mono">
                        {parseResult.priceGroups.size > 0
                          ? Array.from(parseResult.priceGroups).sort().join(', ')
                          : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-muted rounded">
                      <span>Series:</span>
                      <span className="font-mono">
                        {parseResult.series.size > 0
                          ? Array.from(parseResult.series).join(', ')
                          : '-'}
                      </span>
                    </div>
                    {parseResult.totalRows > 2000 && (
                      <div className="col-span-2 flex justify-between p-2 bg-blue-50 rounded border border-blue-200">
                        <span className="text-blue-700">Import batches:</span>
                        <span className="font-mono text-blue-700">
                          {Math.ceil(parseResult.totalRows / 2000)} × max 2.000 rijen
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {parseResult.detectedColumns.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Herkende kolommen: {parseResult.detectedColumns.join(', ')}
                </div>
              )}

              {parseResult.warnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {parseResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {parseResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ul className="list-disc list-inside">
                      {parseResult.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {importing && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Importeren... {progress}%
                {parseResult && parseResult.rows.length > 2000 && (
                  <span className="block text-xs">
                    ({Math.ceil(parseResult.rows.length / 2000)} batches van max 2.000 rijen)
                  </span>
                )}
              </p>
            </div>
          )}

          {importStats && (
            <Alert className={importStats.errors.length > 0 ? "bg-yellow-50 border-yellow-200" : "bg-green-50 border-green-200"}>
              <CheckCircle2 className={`h-4 w-4 ${importStats.errors.length > 0 ? 'text-yellow-600' : 'text-green-600'}`} />
              <AlertDescription>
                <div className="space-y-1 text-sm">
                  <p><strong>Import voltooid!</strong></p>
                  <div className="grid grid-cols-2 gap-x-4">
                    <span>Verwerkte rijen:</span>
                    <span className="font-mono">{importStats.total_rows.toLocaleString()}</span>
                    <span>Nieuwe producten:</span>
                    <span className="font-mono">{importStats.products_created.toLocaleString()}</span>
                    <span>Bijgewerkte producten:</span>
                    <span className="font-mono">{importStats.products_updated.toLocaleString()}</span>
                    <span>Nieuwe prijzen:</span>
                    <span className="font-mono">{importStats.prices_created.toLocaleString()}</span>
                    <span>Bijgewerkte prijzen:</span>
                    <span className="font-mono">{importStats.prices_updated.toLocaleString()}</span>
                    {importStats.price_groups_created > 0 && (
                      <>
                        <span>Prijsgroepen:</span>
                        <span className="font-mono">{importStats.price_groups_created}</span>
                      </>
                    )}
                    {importStats.categories_created > 0 && (
                      <>
                        <span>Categorieën:</span>
                        <span className="font-mono">{importStats.categories_created}</span>
                      </>
                    )}
                    {importStats.skipped_rows > 0 && (
                      <>
                        <span>Overgeslagen:</span>
                        <span className="font-mono">{importStats.skipped_rows.toLocaleString()}</span>
                      </>
                    )}
                  </div>
                  {importStats.by_unit && Object.keys(importStats.by_unit).length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <span className="text-muted-foreground">Per eenheid: </span>
                      {Object.entries(importStats.by_unit).map(([unit, count]) => (
                        <Badge key={unit} variant="outline" className="mr-1">
                          {unit}: {count.toLocaleString()}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {importStats.errors.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-yellow-300">
                      <span className="text-yellow-700 font-medium">Waarschuwingen ({importStats.errors.length}):</span>
                      <ul className="list-disc list-inside text-xs text-yellow-600 mt-1">
                        {importStats.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {importStats.errors.length > 5 && (
                          <li>...en {importStats.errors.length - 5} meer</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {importStats ? 'Sluiten' : 'Annuleren'}
          </Button>
          {!importStats && (
            <Button
              onClick={handleImport}
              disabled={!parseResult?.isStosa || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importeren...
                </>
              ) : (
                'Importeren'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
