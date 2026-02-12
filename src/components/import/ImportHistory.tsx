import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, History, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ImportLog {
  id: string;
  created_at: string;
  source: string;
  file_name: string | null;
  total_rows: number | null;
  inserted: number | null;
  updated: number | null;
  errors: number | null;
  error_details: unknown;
  supplier_id: string | null;
  suppliers: { name: string } | null;
}

export function ImportHistory() {
  const [isOpen, setIsOpen] = useState(false);
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [errorDialog, setErrorDialog] = useState<unknown>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['import_logs', supplierFilter],
    queryFn: async () => {
      let query = supabase
        .from('import_logs')
        .select('id, created_at, source, file_name, total_rows, inserted, updated, errors, error_details, supplier_id, suppliers(name)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (supplierFilter && supplierFilter !== 'all') {
        query = query.eq('supplier_id', supplierFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ImportLog[];
    },
    enabled: isOpen,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center gap-2 text-base">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                <History className="h-4 w-4" />
                Import Geschiedenis
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Filter */}
              <div className="flex items-center gap-2">
                <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Alle leveranciers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle leveranciers</SelectItem>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <p className="text-sm text-muted-foreground">Laden...</p>
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nog geen imports uitgevoerd.</p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead>Bestand</TableHead>
                        <TableHead>Leverancier</TableHead>
                        <TableHead>Bron</TableHead>
                        <TableHead className="text-right">Totaal</TableHead>
                        <TableHead className="text-right">Nieuw</TableHead>
                        <TableHead className="text-right">Bijgewerkt</TableHead>
                        <TableHead className="text-right">Fouten</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {format(new Date(log.created_at), 'dd MMM yyyy HH:mm', { locale: nl })}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">
                            {log.file_name || '—'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.suppliers?.name || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {log.source}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">{log.total_rows ?? 0}</TableCell>
                          <TableCell className="text-right text-sm">{log.inserted ?? 0}</TableCell>
                          <TableCell className="text-right text-sm">{log.updated ?? 0}</TableCell>
                          <TableCell className="text-right">
                            {(log.errors ?? 0) > 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive h-auto p-1"
                                onClick={() => setErrorDialog(log.error_details)}
                              >
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {log.errors}
                              </Button>
                            ) : (
                              <span className="text-sm text-muted-foreground">0</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Error details dialog */}
      <Dialog open={!!errorDialog} onOpenChange={() => setErrorDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Foutmeldingen</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-auto text-sm space-y-1">
            {Array.isArray(errorDialog) ? (
              errorDialog.map((err, i) => (
                <p key={i} className="text-destructive font-mono text-xs">{String(err)}</p>
              ))
            ) : (
              <p className="text-muted-foreground">Geen details beschikbaar.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
