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
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
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
}

interface ImportStats {
  total_rows: number
  products_created: number
  products_updated: number
  prices_created: number
  prices_updated: number
  price_groups_created: number
  skipped_rows: number
  errors: string[]
}

interface StosaImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierId: string
  supplierName: string
  onSuccess?: () => void
}

function parseStosaExcel(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        const sheetName = workbook.SheetNames.find(n =>
          n.toLowerCase().includes('inglese') ||
          n.toLowerCase().includes('english')
        ) || workbook.SheetNames[0]

        const worksheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(worksheet) as any[]

        const result: ParseResult = {
          isStosa: false,
          fileName: file.name,
          totalRows: rows.length,
          fpcRows: 0,
          uniqueProducts: 0,
          priceGroups: new Set(),
          series: new Set(),
          rows,
          errors: [],
        }

        if (rows.length === 0) {
          result.errors.push('Bestand is leeg')
          resolve(result)
          return
        }

        const firstRow = rows[0]
        const hasStosaColumns =
          'Codice gestionale' in firstRow &&
          'Variabile 1' in firstRow &&
          'Variante 1' in firstRow &&
          'Prezzo Listino' in firstRow

        if (!hasStosaColumns) {
          result.errors.push('Geen STOSA formaat gedetecteerd (ontbrekende kolommen)')
          resolve(result)
          return
        }

        result.isStosa = true
        const uniqueProducts = new Set<string>()

        for (const row of rows) {
          const articleCode = row['Codice gestionale']
          if (articleCode) {
            uniqueProducts.add(articleCode)
          }

          if (row['Variabile 1'] === 'FPC') {
            result.fpcRows++
            const variantCode = String(row['Variante 1'])
            const variantInfo = VARIANT_TO_PRICE_GROUP[variantCode]

            if (variantInfo) {
              result.priceGroups.add(variantInfo.pg)
              result.series.add(variantInfo.serie)
            } else {
              const desc = row['Descrizione 1° variabile - 1°Variante'] || ''
              const match = desc.match(/CATEG\.\s*""([0-9]{1,2}|[ABC])""/i)
              if (match) {
                result.priceGroups.add(match[1])
              }
            }
          }
        }

        result.uniqueProducts = uniqueProducts.size
        resolve(result)
      } catch (err) {
        reject(err)
      }
    }

    reader.onerror = () => reject(new Error('Fout bij lezen bestand'))
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
  const [importStats, setImportStats] = useState<ImportStats | null>(null)
  const [progress, setProgress] = useState(0)

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
    setProgress(10)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Niet ingelogd')
      }

      setProgress(30)

      const modelName = parseResult.series.size === 1
        ? Array.from(parseResult.series)[0]
        : Array.from(parseResult.series).join(', ')

      const response = await supabase.functions.invoke('stosa-import', {
        body: {
          supplier_id: supplierId,
          rows: parseResult.rows,
          file_name: parseResult.fileName,
          model_name: modelName,
        },
      })

      setProgress(90)

      if (response.error) {
        throw new Error(response.error.message || 'Import mislukt')
      }

      const { stats } = response.data
      setImportStats(stats)
      setProgress(100)

      toast.success(`Import voltooid: ${stats.products_created + stats.products_updated} producten`)

      if (onSuccess) {
        onSuccess()
      }
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
          {!parseResult && (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              `}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              {isDragActive ? (
                <p className="text-primary">Drop het bestand hier...</p>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    Sleep een Excel bestand hierheen, of klik om te selecteren
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Ondersteund: LISTINO_VENDITA_STOSA.xlsx
                  </p>
                </>
              )}
            </div>
          )}

          {parseResult && !importStats && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium">{parseResult.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {parseResult.totalRows.toLocaleString()} rijen
                  </p>
                </div>
                {parseResult.isStosa ? (
                  <Badge variant="default" className="bg-green-600">STOSA</Badge>
                ) : (
                  <Badge variant="destructive">Onbekend formaat</Badge>
                )}
              </div>

              {parseResult.isStosa && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Unieke producten</p>
                    <p className="text-2xl font-bold">{parseResult.uniqueProducts.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Prijsregels (FPC)</p>
                    <p className="text-2xl font-bold">{parseResult.fpcRows.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Prijsgroepen</p>
                    <p className="text-lg font-medium">
                      {Array.from(parseResult.priceGroups).sort((a, b) => {
                        const aNum = parseInt(a)
                        const bNum = parseInt(b)
                        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
                        if (!isNaN(aNum)) return -1
                        if (!isNaN(bNum)) return 1
                        return a.localeCompare(b)
                      }).join(', ')}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Serie(s)</p>
                    <p className="text-lg font-medium">
                      {Array.from(parseResult.series).join(', ') || 'Onbekend'}
                    </p>
                  </div>
                </div>
              )}

              {parseResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {parseResult.errors.join(', ')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {importing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Importeren...</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {importStats && (
            <div className="space-y-4">
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Import succesvol voltooid!
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{importStats.products_created}</p>
                  <p className="text-xs text-muted-foreground">Nieuwe producten</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{importStats.products_updated}</p>
                  <p className="text-xs text-muted-foreground">Bijgewerkt</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-600">{importStats.prices_created}</p>
                  <p className="text-xs text-muted-foreground">Prijzen</p>
                </div>
              </div>

              {importStats.price_groups_created > 0 && (
                <p className="text-sm text-muted-foreground">
                  + {importStats.price_groups_created} prijsgroepen aangemaakt
                </p>
              )}

              {importStats.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    {importStats.errors.length} fout(en): {importStats.errors.slice(0, 3).join(', ')}
                    {importStats.errors.length > 3 && ` (+${importStats.errors.length - 3} meer)`}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!importStats ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Annuleren
              </Button>
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
            </>
          ) : (
            <Button onClick={handleClose}>
              Sluiten
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
