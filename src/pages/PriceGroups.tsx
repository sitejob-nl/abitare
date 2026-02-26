import { useState } from "react";
import { Plus, Trash2, Palette, Edit2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useSuppliers } from "@/hooks/useSuppliers";
import {
  useProductRanges, useCreateProductRange, useUpdateProductRange, useDeleteProductRange,
  type ProductRangeWithSupplier,
} from "@/hooks/useProductRanges";
import {
  useProductColors, useCreateProductColor, useDeleteProductColor,
} from "@/hooks/useProductColors";
import {
  usePriceGroups, useCreatePriceGroup, useUpdatePriceGroup, useDeletePriceGroup,
  type PriceGroup,
} from "@/hooks/usePriceGroups";
import {
  usePriceGroupColors, useCreatePriceGroupColor, useDeletePriceGroupColor,
} from "@/hooks/usePriceGroupColors";
import { toast } from "@/hooks/use-toast";

export default function PriceGroups() {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all");
  const [rangeDialogOpen, setRangeDialogOpen] = useState(false);
  const [colorDialogOpen, setColorDialogOpen] = useState(false);
  const [editingRange, setEditingRange] = useState<ProductRangeWithSupplier | null>(null);
  const [selectedRangeForColors, setSelectedRangeForColors] = useState<string | null>(null);

  // Price group state
  const [pgDialogOpen, setPgDialogOpen] = useState(false);
  const [editingPg, setEditingPg] = useState<PriceGroup | null>(null);
  const [pgCode, setPgCode] = useState("");
  const [pgName, setPgName] = useState("");
  const [pgCollection, setPgCollection] = useState("");
  const [pgSortOrder, setPgSortOrder] = useState("");
  const [pgIsGlass, setPgIsGlass] = useState(false);
  const [pgSupplierId, setPgSupplierId] = useState("");

  // Price group colors state
  const [pgColorDialogOpen, setPgColorDialogOpen] = useState(false);
  const [selectedPgForColors, setSelectedPgForColors] = useState<string | null>(null);
  const [pgColorCode, setPgColorCode] = useState("");
  const [pgColorName, setPgColorName] = useState("");
  const [pgColorMaterial, setPgColorMaterial] = useState("");
  const [pgColorFinish, setPgColorFinish] = useState("");

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
  const supplierFilter = selectedSupplierId !== "all" ? selectedSupplierId : undefined;
  const { data: ranges = [], isLoading: rangesLoading } = useProductRanges(supplierFilter);
  const { data: colors = [] } = useProductColors(selectedRangeForColors);
  const { data: priceGroups = [], isLoading: pgLoading } = usePriceGroups(supplierFilter);
  const { data: pgColors = [] } = usePriceGroupColors(selectedPgForColors || undefined);

  const createRange = useCreateProductRange();
  const updateRange = useUpdateProductRange();
  const deleteRange = useDeleteProductRange();
  const createColor = useCreateProductColor();
  const deleteColor = useDeleteProductColor();
  const createPg = useCreatePriceGroup();
  const updatePg = useUpdatePriceGroup();
  const deletePg = useDeletePriceGroup();
  const createPgColor = useCreatePriceGroupColor();
  const deletePgColor = useDeletePriceGroupColor();

  // --- Range handlers ---
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
      setRangeSupplierId(supplierFilter || "");
    }
    setRangeDialogOpen(true);
  };

  const handleSaveRange = async () => {
    if (!rangeCode.trim()) {
      toast({ title: "Code verplicht", variant: "destructive" });
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
        toast({ title: "Prijsgroep bijgewerkt" });
      } else {
        await createRange.mutateAsync({
          code: rangeCode.trim(),
          name: rangeName.trim() || null,
          price_group: rangePriceGroup ? parseInt(rangePriceGroup) : null,
          supplier_id: rangeSupplierId || null,
        });
        toast({ title: "Prijsgroep aangemaakt" });
      }
      setRangeDialogOpen(false);
    } catch {
      toast({ title: "Fout", description: "Er is iets misgegaan.", variant: "destructive" });
    }
  };

  const handleDeleteRange = async (id: string, code: string) => {
    if (!confirm(`Weet je zeker dat je "${code}" wilt verwijderen?`)) return;
    try {
      await deleteRange.mutateAsync(id);
      toast({ title: "Verwijderd" });
    } catch {
      toast({ title: "Fout", variant: "destructive" });
    }
  };

  // --- Color handlers (for ranges) ---
  const handleOpenColorDialog = (rangeId: string) => {
    setSelectedRangeForColors(rangeId);
    setColorCode(""); setColorName(""); setColorHex("");
    setColorDialogOpen(true);
  };

  const handleSaveColor = async () => {
    if (!colorCode.trim() || !colorName.trim()) {
      toast({ title: "Velden verplicht", variant: "destructive" });
      return;
    }
    try {
      await createColor.mutateAsync({
        code: colorCode.trim(),
        name: colorName.trim(),
        hex_color: colorHex.trim() || null,
        range_id: selectedRangeForColors,
      });
      toast({ title: "Kleur toegevoegd" });
      setColorDialogOpen(false);
    } catch {
      toast({ title: "Fout", variant: "destructive" });
    }
  };

  const handleDeleteColor = async (id: string, name: string) => {
    if (!confirm(`Kleur "${name}" verwijderen?`)) return;
    try {
      await deleteColor.mutateAsync(id);
      toast({ title: "Verwijderd" });
    } catch {
      toast({ title: "Fout", variant: "destructive" });
    }
  };

  // --- Price Group handlers ---
  const handleOpenPgDialog = (pg?: PriceGroup) => {
    if (pg) {
      setEditingPg(pg);
      setPgCode(pg.code);
      setPgName(pg.name);
      setPgCollection(pg.collection || "");
      setPgSortOrder(pg.sort_order?.toString() || "");
      setPgIsGlass(pg.is_glass || false);
      setPgSupplierId(pg.supplier_id || "");
    } else {
      setEditingPg(null);
      setPgCode(""); setPgName(""); setPgCollection(""); setPgSortOrder(""); setPgIsGlass(false);
      setPgSupplierId(supplierFilter || "");
    }
    setPgDialogOpen(true);
  };

  const handleSavePg = async () => {
    if (!pgCode.trim() || !pgName.trim()) {
      toast({ title: "Code en naam verplicht", variant: "destructive" });
      return;
    }
    try {
      const payload = {
        code: pgCode.trim(),
        name: pgName.trim(),
        collection: pgCollection.trim() || null,
        sort_order: pgSortOrder ? parseInt(pgSortOrder) : 0,
        is_glass: pgIsGlass,
        supplier_id: pgSupplierId || null,
      };
      if (editingPg) {
        await updatePg.mutateAsync({ id: editingPg.id, ...payload });
        toast({ title: "Prijsgroep bijgewerkt" });
      } else {
        await createPg.mutateAsync(payload);
        toast({ title: "Prijsgroep aangemaakt" });
      }
      setPgDialogOpen(false);
    } catch {
      toast({ title: "Fout", variant: "destructive" });
    }
  };

  const handleDeletePg = async (id: string, code: string) => {
    if (!confirm(`Prijsgroep "${code}" verwijderen?`)) return;
    try {
      await deletePg.mutateAsync(id);
      toast({ title: "Verwijderd" });
    } catch {
      toast({ title: "Fout", variant: "destructive" });
    }
  };

  // --- Price Group Color handlers ---
  const handleOpenPgColorDialog = (pgId: string) => {
    setSelectedPgForColors(pgId);
    setPgColorCode(""); setPgColorName(""); setPgColorMaterial(""); setPgColorFinish("");
    setPgColorDialogOpen(true);
  };

  const handleSavePgColor = async () => {
    if (!pgColorCode.trim() || !pgColorName.trim()) {
      toast({ title: "Code en naam verplicht", variant: "destructive" });
      return;
    }
    try {
      await createPgColor.mutateAsync({
        price_group_id: selectedPgForColors!,
        color_code: pgColorCode.trim(),
        color_name: pgColorName.trim(),
        material_type: pgColorMaterial.trim() || null,
        finish: pgColorFinish.trim() || null,
      });
      toast({ title: "Kleur toegevoegd" });
      setPgColorCode(""); setPgColorName(""); setPgColorMaterial(""); setPgColorFinish("");
    } catch {
      toast({ title: "Fout", variant: "destructive" });
    }
  };

  const handleDeletePgColor = async (id: string, name: string) => {
    if (!confirm(`Kleur "${name}" verwijderen?`)) return;
    try {
      await deletePgColor.mutateAsync(id);
      toast({ title: "Verwijderd" });
    } catch {
      toast({ title: "Fout", variant: "destructive" });
    }
  };

  return (
    <AppLayout title="Prijsgroepen">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Prijsgroepen & Ranges</h1>
            <p className="text-muted-foreground text-sm">
              Beheer ranges, prijsgroepen (E1-E10) en kleuren per leverancier
            </p>
          </div>
        </div>

        {/* Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <Label className="whitespace-nowrap text-sm">Filter op leverancier:</Label>
              <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                <SelectTrigger className="w-full sm:w-[280px]">
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

        {/* Tabs */}
        <Tabs defaultValue="ranges" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ranges">Ranges ({ranges.length})</TabsTrigger>
            <TabsTrigger value="price-groups">Prijsgroepen ({priceGroups.length})</TabsTrigger>
          </TabsList>

          {/* Ranges Tab */}
          <TabsContent value="ranges">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Ranges / Modellen</CardTitle>
                  <CardDescription className="text-xs">
                    Product ranges bepalen de variant/model voor prijzen
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => handleOpenRangeDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nieuwe range
                </Button>
              </CardHeader>
              <CardContent>
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Naam</TableHead>
                        <TableHead>Groep</TableHead>
                        <TableHead>Leverancier</TableHead>
                        <TableHead>Kleuren</TableHead>
                        <TableHead className="w-[100px]">Acties</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rangesLoading ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Laden...</TableCell></TableRow>
                      ) : ranges.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Geen ranges gevonden</TableCell></TableRow>
                      ) : (
                        ranges.map((range) => (
                          <TableRow key={range.id}>
                            <TableCell className="font-mono font-medium">{range.code}</TableCell>
                            <TableCell>{range.name || "-"}</TableCell>
                            <TableCell>
                              {range.price_group ? <Badge variant="secondary">Groep {range.price_group}</Badge> : "-"}
                            </TableCell>
                            <TableCell>{range.supplier?.name || "-"}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => handleOpenColorDialog(range.id)}>
                                <Palette className="h-4 w-4 mr-1" />Kleuren
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenRangeDialog(range)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteRange(range.id, range.code)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {rangesLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Laden...</div>
                  ) : ranges.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">Geen ranges gevonden</div>
                  ) : (
                    ranges.map((range) => (
                      <div key={range.id} className="p-4 rounded-xl border bg-card">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-mono text-sm font-medium">{range.code}</div>
                            <div className="text-sm truncate">{range.name || "-"}</div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenColorDialog(range.id)}><Palette className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenRangeDialog(range)}><Edit2 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteRange(range.id, range.code)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                        <div className="flex gap-3 mt-3 pt-3 border-t text-xs text-muted-foreground">
                          {range.price_group && <Badge variant="secondary" className="text-xs">Groep {range.price_group}</Badge>}
                          <span>{range.supplier?.name || "-"}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Price Groups Tab */}
          <TabsContent value="price-groups">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Prijsgroepen (E1-E10, A, B, C)</CardTitle>
                  <CardDescription className="text-xs">
                    Prijsgroepen voor leveranciers met een prijsgroepensysteem (bijv. Stosa)
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => handleOpenPgDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nieuwe prijsgroep
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Naam</TableHead>
                      <TableHead>Collectie</TableHead>
                      <TableHead>Editie</TableHead>
                      <TableHead>Geldigheid</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Kleuren</TableHead>
                      <TableHead className="w-[100px]">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pgLoading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Laden...</TableCell></TableRow>
                     ) : priceGroups.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Geen prijsgroepen gevonden</TableCell></TableRow>
                    ) : (
                      priceGroups.map((pg) => (
                        <TableRow key={pg.id}>
                          <TableCell className="font-mono font-medium">{pg.code}</TableCell>
                          <TableCell>{pg.name}</TableCell>
                          <TableCell>{pg.collection || "-"}</TableCell>
                          <TableCell className="text-xs">{(pg as any).edition || "-"}</TableCell>
                          <TableCell className="text-xs">
                            {(pg as any).valid_from || (pg as any).valid_until
                              ? `${(pg as any).valid_from || "?"} – ${(pg as any).valid_until || "∞"}`
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {pg.is_glass ? <Badge variant="outline">Glas</Badge> : <Badge variant="secondary">Front</Badge>}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => handleOpenPgColorDialog(pg.id)}>
                              <Palette className="h-4 w-4 mr-1" />Kleuren
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenPgDialog(pg)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeletePg(pg.id, pg.code)}>
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
          </TabsContent>
        </Tabs>

        {/* Range Dialog */}
        <Dialog open={rangeDialogOpen} onOpenChange={setRangeDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingRange ? "Range bewerken" : "Nieuwe range"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Code *</Label>
                <Input placeholder="MPTS GL LB" value={rangeCode} onChange={(e) => setRangeCode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Naam</Label>
                <Input placeholder="Metropolis Greeploos" value={rangeName} onChange={(e) => setRangeName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prijsgroep nummer</Label>
                  <Input type="number" placeholder="5" value={rangePriceGroup} onChange={(e) => setRangePriceGroup(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Leverancier</Label>
                  <Select value={rangeSupplierId || '__none__'} onValueChange={(v) => setRangeSupplierId(v === '__none__' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Geen</SelectItem>
                      {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRangeDialogOpen(false)}>Annuleren</Button>
              <Button onClick={handleSaveRange} disabled={createRange.isPending || updateRange.isPending}>
                {editingRange ? "Bijwerken" : "Aanmaken"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Price Group Dialog */}
        <Dialog open={pgDialogOpen} onOpenChange={setPgDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPg ? "Prijsgroep bewerken" : "Nieuwe prijsgroep"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Code *</Label>
                  <Input placeholder="E5" value={pgCode} onChange={(e) => setPgCode(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Leverancier</Label>
                  <Select value={pgSupplierId || '__none__'} onValueChange={(v) => setPgSupplierId(v === '__none__' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecteer" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Geen</SelectItem>
                      {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Naam *</Label>
                <Input placeholder="Prijsgroep E5 - Legno Frassino" value={pgName} onChange={(e) => setPgName(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Collectie</Label>
                  <Input placeholder="evolution" value={pgCollection} onChange={(e) => setPgCollection(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Sortering</Label>
                  <Input type="number" placeholder="5" value={pgSortOrder} onChange={(e) => setPgSortOrder(e.target.value)} />
                </div>
                <div className="space-y-2 flex items-end">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={pgIsGlass} onChange={(e) => setPgIsGlass(e.target.checked)} className="rounded" />
                    Glas
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPgDialogOpen(false)}>Annuleren</Button>
              <Button onClick={handleSavePg} disabled={createPg.isPending || updatePg.isPending}>
                {editingPg ? "Bijwerken" : "Aanmaken"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Range Color Dialog */}
        <Dialog open={colorDialogOpen} onOpenChange={setColorDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Kleuren beheren (range)</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="space-y-2"><Label>Code *</Label><Input placeholder="RN" value={colorCode} onChange={(e) => setColorCode(e.target.value)} /></div>
                <div className="space-y-2"><Label>Naam *</Label><Input placeholder="Rovere Nodato" value={colorName} onChange={(e) => setColorName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Kleurcode</Label><Input placeholder="#A58B6F" value={colorHex} onChange={(e) => setColorHex(e.target.value)} /></div>
                <Button onClick={handleSaveColor} disabled={createColor.isPending}><Plus className="h-4 w-4 mr-2" />Toevoegen</Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead className="w-[60px]">Kleur</TableHead><TableHead>Code</TableHead><TableHead>Naam</TableHead><TableHead className="w-[60px]"></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {colors.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Nog geen kleuren</TableCell></TableRow>
                    ) : colors.map((color) => (
                      <TableRow key={color.id}>
                        <TableCell>{color.hex_color ? <div className="w-6 h-6 rounded border" style={{ backgroundColor: color.hex_color }} /> : <div className="w-6 h-6 rounded border bg-muted" />}</TableCell>
                        <TableCell className="font-mono">{color.code}</TableCell>
                        <TableCell>{color.name}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteColor(color.id, color.name)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setColorDialogOpen(false)}>Sluiten</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Price Group Color Dialog */}
        <Dialog open={pgColorDialogOpen} onOpenChange={setPgColorDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Kleuren beheren (prijsgroep)</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
                <div className="space-y-2"><Label>Code *</Label><Input placeholder="RNO" value={pgColorCode} onChange={(e) => setPgColorCode(e.target.value)} /></div>
                <div className="space-y-2"><Label>Naam *</Label><Input placeholder="Rovere Nodato" value={pgColorName} onChange={(e) => setPgColorName(e.target.value)} /></div>
                <div className="space-y-2"><Label>Materiaal</Label><Input placeholder="termo_strutturato" value={pgColorMaterial} onChange={(e) => setPgColorMaterial(e.target.value)} /></div>
                <div className="space-y-2"><Label>Afwerking</Label><Input placeholder="opaco" value={pgColorFinish} onChange={(e) => setPgColorFinish(e.target.value)} /></div>
                <Button onClick={handleSavePgColor} disabled={createPgColor.isPending}><Plus className="h-4 w-4 mr-2" />Toevoegen</Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Naam</TableHead><TableHead>Materiaal</TableHead><TableHead>Afwerking</TableHead><TableHead className="w-[60px]"></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {pgColors.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Nog geen kleuren</TableCell></TableRow>
                    ) : pgColors.map((color) => (
                      <TableRow key={color.id}>
                        <TableCell className="font-mono">{color.color_code}</TableCell>
                        <TableCell>{color.color_name}</TableCell>
                        <TableCell className="text-muted-foreground">{color.material_type || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{color.finish || "-"}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeletePgColor(color.id, color.color_name)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setPgColorDialogOpen(false)}>Sluiten</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
