import { useState } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import {
  useInstallationRates,
  useCreateInstallationRate,
  useUpdateInstallationRate,
  useDeleteInstallationRate,
  type InstallationRate,
  type InstallationRateInsert,
} from "@/hooks/useInstallationRates";

type FormData = {
  code: string;
  name: string;
  unit: string;
  default_price: string;
  vat_rate: string;
  is_active: boolean;
};

const emptyForm: FormData = {
  code: "",
  name: "",
  unit: "stuk",
  default_price: "0",
  vat_rate: "21",
  is_active: true,
};

function rateToForm(rate: InstallationRate): FormData {
  return {
    code: rate.code,
    name: rate.name,
    unit: rate.unit ?? "stuk",
    default_price: String(rate.default_price ?? 0),
    vat_rate: String(rate.vat_rate ?? 21),
    is_active: rate.is_active ?? true,
  };
}

export function InstallationRatesSettings() {
  const { data: rates, isLoading } = useInstallationRates(false);
  const createRate = useCreateInstallationRate();
  const updateRate = useUpdateInstallationRate();
  const deleteRate = useDeleteInstallationRate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (rate: InstallationRate) => {
    setEditingId(rate.id);
    setForm(rateToForm(rate));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code en naam zijn verplicht");
      return;
    }

    const payload: InstallationRateInsert = {
      code: form.code.trim(),
      name: form.name.trim(),
      unit: form.unit.trim() || "stuk",
      default_price: parseFloat(form.default_price) || 0,
      vat_rate: parseFloat(form.vat_rate) || 21,
      is_active: form.is_active,
    };

    try {
      if (editingId) {
        await updateRate.mutateAsync({ id: editingId, ...payload });
        toast.success("Tarief bijgewerkt");
      } else {
        await createRate.mutateAsync(payload);
        toast.success("Tarief aangemaakt");
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Fout bij opslaan");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteRate.mutateAsync(deleteConfirmId);
      toast.success("Tarief verwijderd");
    } catch (e: any) {
      toast.error(e.message || "Fout bij verwijderen");
    }
    setDeleteConfirmId(null);
  };

  const handleToggleActive = async (rate: InstallationRate) => {
    try {
      await updateRate.mutateAsync({ id: rate.id, is_active: !rate.is_active });
    } catch (e: any) {
      toast.error(e.message || "Fout bij bijwerken");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base">Montagetarieven</CardTitle>
            <CardDescription>
              Beheer standaard montage- en diensttarieven voor offertes en orders
            </CardDescription>
          </div>
          <Button size="sm" onClick={openNew} className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nieuw tarief</span>
          </Button>
        </CardHeader>
        <CardContent>
          {!rates?.length ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nog geen tarieven. Klik op "Nieuw tarief" om te beginnen.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Naam</TableHead>
                  <TableHead>Eenheid</TableHead>
                  <TableHead className="text-right">Prijs</TableHead>
                  <TableHead className="text-right">BTW%</TableHead>
                  <TableHead className="text-center">Actief</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rates.map((rate) => (
                  <TableRow key={rate.id}>
                    <TableCell className="font-mono text-xs">{rate.code}</TableCell>
                    <TableCell>{rate.name}</TableCell>
                    <TableCell className="text-muted-foreground">{rate.unit || "—"}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(rate.default_price)}
                    </TableCell>
                    <TableCell className="text-right">{rate.vat_rate ?? 21}%</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={rate.is_active ?? true}
                        onCheckedChange={() => handleToggleActive(rate)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(rate)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteConfirmId(rate.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Tarief bewerken" : "Nieuw tarief"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Pas de gegevens van dit tarief aan." : "Voeg een nieuw montage- of diensttarief toe."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate-code">Code *</Label>
                <Input id="rate-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="MONTAGE-BASIS" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate-unit">Eenheid</Label>
                <Input id="rate-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="stuk" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate-name">Naam *</Label>
              <Input id="rate-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Basismontage keuken" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rate-price">Standaardprijs (€)</Label>
                <Input id="rate-price" type="number" step="0.01" value={form.default_price} onChange={(e) => setForm({ ...form, default_price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate-vat">BTW %</Label>
                <Input id="rate-vat" type="number" value={form.vat_rate} onChange={(e) => setForm({ ...form, vat_rate: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="rate-active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label htmlFor="rate-active">Actief</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuleren</Button>
            <Button onClick={handleSave} disabled={createRate.isPending || updateRate.isPending}>
              {(createRate.isPending || updateRate.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editingId ? "Opslaan" : "Aanmaken"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tarief verwijderen?</DialogTitle>
            <DialogDescription>
              Dit tarief wordt permanent verwijderd. Dit kan niet ongedaan gemaakt worden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Annuleren</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteRate.isPending}>
              {deleteRate.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Verwijderen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
