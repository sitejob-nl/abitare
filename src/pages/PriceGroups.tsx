import { useState } from "react";
import { Plus, Trash2, Palette, Edit2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useSuppliers } from "@/hooks/useSuppliers";
import {
  useProductRanges,
  useCreateProductRange,
  useUpdateProductRange,
  useDeleteProductRange,
  type ProductRangeWithSupplier,
} from "@/hooks/useProductRanges";
import {
  useProductColors,
  useCreateProductColor,
  useDeleteProductColor,
} from "@/hooks/useProductColors";
import { toast } from "@/hooks/use-toast";

export default function PriceGroups() {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all");
  const [rangeDialogOpen, setRangeDialogOpen] = useState(false);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [editingRange, setEditingRange] = useState<ProductRangeWithSupplier | null>(null);
  const [selectedRangeForColors, setSelectedRangeForColors] = useState<string | null>(null);

  // Range form state
  const [rangeCode, setRangeCode] = useState("");
  const [rangeName, setRangeName] = useState("");
  const [rangePriceGroup, setRangePriceGroup] = useState("");
  const [rangeSupplierId, setRangeSupplierId] = useState("");

  // Color form state
  const [colorCode, setColorCode] = useState("");
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("");

  const { data: suppliers = [] } = useSuppliers();
  const { data: ranges = [], isLoading: rangesLoading } = useProductRanges(
    selectedSupplierId !== "all" ? selectedSupplierId : undefined
  );
  const { data: colors = [] } = useProductColors(selectedRangeForColors);

  const createRange = useCreateProductRange();
  const updateRange = useUpdateProductRange();
  const deleteRange = useDeleteProductRange();
  const createColor = useCreateProductColor();
  const deleteColor = useDeleteProductColor();

  const handleOpenRangeDialog = (range?: ProductRangeWithSupplier) => {
    if (range) {
      setEditingRange(range);
      setRangeCode(range.code);
      setRangeName(range.name || "");
      setRangePriceGroup(range.price_group?.toString() || "");
      setRangeSupplierId(range.supplier_id || "");
    } else {
      setEditingRange(null);
      setRangeCode("");
      setRangeName("");
      setRangePriceGroup("");
      setRangeSupplierId(selectedSupplierId !== "all" ? selectedSupplierId : "");
    }
    setRangeDialogOpen(true);
  };

  const handleSaveRange = async () => {
    if (!rangeCode.trim()) {
      toast({
        title: "Code verplicht",
        description: "Vul een code in voor de prijsgroep.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingRange) {
        await updateRange.mutateAsync({
          id: editingRange.id,
          code: rangeCode.trim(),
          name: rangeName.trim() || null,
          price_group: rangePriceGroup ? parseInt(rangePriceGroup) : null,
          supplier_id: rangeSupplierId || null,
        });
        toast({
          title: "Prijsgroep bijgewerkt",
          description: `${rangeCode} is succesvol bijgewerkt.`,
        });
      } else {
        await createRange.mutateAsync({
          code: rangeCode.trim(),
          name: rangeName.trim() || null,
          price_group: rangePriceGroup ? parseInt(rangePriceGroup) : null,
          supplier_id: rangeSupplierId || null,
        });
        toast({
          title: "Prijsgroep aangemaakt",
          description: `${rangeCode} is succesvol aangemaakt.`,
        });
      }
      setRangeDialogOpen(false);
    } catch (error) {
      toast({
        title: "Fout",
        description: "Er is iets misgegaan. Probeer het opnieuw.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRange = async (id: string, code: string) => {
    if (!confirm(`Weet je zeker dat je prijsgroep "${code}" wilt verwijderen?`)) return;

    try {
      await deleteRange.mutateAsync(id);
      toast({
        title: "Prijsgroep verwijderd",
        description: `${code} is verwijderd.`,
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kan prijsgroep niet verwijderen. Mogelijk zijn er nog producten aan gekoppeld.",
        variant: "destructive",
      });
    }
  };

  const handleOpenColorDialog = (rangeId: string) => {
    setSelectedRangeForColors(rangeId);
    setColorCode("");
    setColorName("");
    setColorHex("");
    setColorDialogOpen(true);
  };

  const handleSaveColor = async () => {
    if (!colorCode.trim() || !colorName.trim()) {
      toast({
        title: "Velden verplicht",
        description: "Vul een code en naam in voor de kleur.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createColor.mutateAsync({
        code: colorCode.trim(),
        name: colorName.trim(),
        hex_color: colorHex.trim() || null,
        range_id: selectedRangeForColors,
      });
      toast({
        title: "Kleur toegevoegd",
        description: `${colorName} is toegevoegd.`,
      });
      setColorDialogOpen(false);
    } catch (error) {
      toast({
        title: "Fout",
        description: "Er is iets misgegaan. Probeer het opnieuw.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteColor = async (id: string, name: string) => {
    if (!confirm(`Weet je zeker dat je kleur "${name}" wilt verwijderen?`)) return;

    try {
      await deleteColor.mutateAsync(id);
      toast({
        title: "Kleur verwijderd",
        description: `${name} is verwijderd.`,
      });
    } catch (error) {
      toast({
        title: "Fout",
        description: "Kan kleur niet verwijderen.",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout title="Prijsgroepen">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Prijsgroepen</h1>
            <p className="text-muted-foreground">
              Beheer prijsgroepen en kleuren per leverancier
            </p>
          </div>
          <Button onClick={() => handleOpenRangeDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nieuwe prijsgroep
          </Button>
        </div>

        {/* Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label className="whitespace-nowrap">Filter op leverancier:</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Alle leveranciers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle leveranciers</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name} ({supplier.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Ranges Table */}
        <Card>
          <CardHeader>
            <CardTitle>Prijsgroepen</CardTitle>
            <CardDescription>
              Prijsgroepen bepalen de verkoopprijs van producten. Elk product kan verschillende prijzen hebben per prijsgroep.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Naam</TableHead>
                  <TableHead>Prijsgroep</TableHead>
                  <TableHead>Leverancier</TableHead>
                  <TableHead>Kleuren</TableHead>
                  <TableHead className="w-[120px]">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rangesLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Laden...
                    </TableCell>
                  </TableRow>
                ) : ranges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Geen prijsgroepen gevonden
                    </TableCell>
                  </TableRow>
                ) : (
                  ranges.map((range) => (
                    <TableRow key={range.id}>
                      <TableCell className="font-mono font-medium">{range.code}</TableCell>
                      <TableCell>{range.name || "-"}</TableCell>
                      <TableCell>
                        {range.price_group ? (
                          <Badge variant="secondary">Groep {range.price_group}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {range.supplier ? (
                          <span className="text-sm">
                            {range.supplier.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenColorDialog(range.id)}
                        >
                          <Palette className="h-4 w-4 mr-1" />
                          Kleuren
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenRangeDialog(range)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteRange(range.id, range.code)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Range Dialog */}
        <Dialog open={rangeDialogOpen} onOpenChange={setRangeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRange ? "Prijsgroep bewerken" : "Nieuwe prijsgroep"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input
                  placeholder="MPTS GL LB"
                  value={rangeCode}
                  onChange={(e) => setRangeCode(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Naam</Label>
                <Input
                  placeholder="Metropolis Greeploos Laminaat Bronze"
                  value={rangeName}
                  onChange={(e) => setRangeName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prijsgroep nummer</Label>
                  <Input
                    type="number"
                    placeholder="5"
                    value={rangePriceGroup}
                    onChange={(e) => setRangePriceGroup(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Leverancier</Label>
                  <Select value={rangeSupplierId || '__none__'} onValueChange={(v) => setRangeSupplierId(v === '__none__' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Geen</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRangeDialogOpen(false)}>
                Annuleren
              </Button>
              <Button
                onClick={handleSaveRange}
                disabled={createRange.isPending || updateRange.isPending}
              >
                {editingRange ? "Bijwerken" : "Aanmaken"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Color Dialog */}
        <Dialog open={colorDialogOpen} onOpenChange={setColorDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Kleuren beheren</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Add new color form */}
              <div className="grid grid-cols-4 gap-3 items-end">
                <div className="space-y-2">
                  <Label>Code *</Label>
                  <Input
                    placeholder="RN"
                    value={colorCode}
                    onChange={(e) => setColorCode(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Naam *</Label>
                  <Input
                    placeholder="Rovere Nodato"
                    value={colorName}
                    onChange={(e) => setColorName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kleurcode</Label>
                  <Input
                    placeholder="#A58B6F"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                  />
                </div>
                <Button onClick={handleSaveColor} disabled={createColor.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Toevoegen
                </Button>
              </div>

              {/* Existing colors */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Kleur</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Naam</TableHead>
                      <TableHead className="w-[60px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {colors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                          Nog geen kleuren
                        </TableCell>
                      </TableRow>
                    ) : (
                      colors.map((color) => (
                        <TableRow key={color.id}>
                          <TableCell>
                            {color.hex_color ? (
                              <div
                                className="w-6 h-6 rounded border"
                                style={{ backgroundColor: color.hex_color }}
                              />
                            ) : (
                              <div className="w-6 h-6 rounded border bg-muted" />
                            )}
                          </TableCell>
                          <TableCell className="font-mono">{color.code}</TableCell>
                          <TableCell>{color.name}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDeleteColor(color.id, color.name)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setColorDialogOpen(false)}>
                Sluiten
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
