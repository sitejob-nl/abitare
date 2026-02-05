import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Pencil, Trash2, Save, X } from "lucide-react";
import { useSuppliers } from "@/hooks/useSuppliers";
import {
  useSupplierDiscounts,
  useUpsertSupplierDiscount,
  useDeleteSupplierDiscount,
  type SupplierDiscount,
} from "@/hooks/useSupplierDiscounts";
import { toast } from "@/hooks/use-toast";

const DISCOUNT_GROUPS = [
  { code: "GR1", label: "GR1 - Kasten met fronten" },
  { code: "GR2", label: "GR2 - Premium / apparatuur" },
  { code: "GR3", label: "GR3 - Accessoires" },
];

export function SupplierDiscountsSettings() {
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    discount_group: string;
    discount_percent: string;
    description: string;
  }>({ discount_group: "", discount_percent: "", description: "" });
  const [isAdding, setIsAdding] = useState(false);

  const { data: suppliers = [], isLoading: suppliersLoading } = useSuppliers();
  const { data: discounts = [], isLoading: discountsLoading } = useSupplierDiscounts(
    selectedSupplierId || undefined
  );
  const upsertDiscount = useUpsertSupplierDiscount();
  const deleteDiscount = useDeleteSupplierDiscount();

  const handleStartAdd = () => {
    setIsAdding(true);
    setEditForm({ discount_group: "", discount_percent: "", description: "" });
  };

  const handleStartEdit = (discount: SupplierDiscount) => {
    setEditingId(discount.id);
    setEditForm({
      discount_group: discount.discount_group,
      discount_percent: discount.discount_percent?.toString() || "",
      description: discount.description || "",
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
    setEditForm({ discount_group: "", discount_percent: "", description: "" });
  };

  const handleSave = async () => {
    if (!selectedSupplierId || !editForm.discount_group) {
      toast({
        title: "Vul alle verplichte velden in",
        variant: "destructive",
      });
      return;
    }

    try {
      await upsertDiscount.mutateAsync({
        supplier_id: selectedSupplierId,
        discount_group: editForm.discount_group,
        discount_percent: editForm.discount_percent
          ? parseFloat(editForm.discount_percent)
          : null,
        description: editForm.description || null,
      });

      toast({ title: "Korting opgeslagen" });
      handleCancel();
    } catch (error) {
      toast({
        title: "Fout bij opslaan",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDiscount.mutateAsync(id);
      toast({ title: "Korting verwijderd" });
    } catch (error) {
      toast({
        title: "Fout bij verwijderen",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  // Get already used discount groups for this supplier
  const usedGroups = discounts.map((d) => d.discount_group);
  const availableGroups = DISCOUNT_GROUPS.filter(
    (g) => !usedGroups.includes(g.code) || editForm.discount_group === g.code
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leverancier Kortingen</CardTitle>
        <CardDescription>
          Configureer dealerkortingen per leverancier en kortingsgroep (GR1/GR2/GR3)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Supplier selection */}
        <div className="space-y-2">
          <Label>Leverancier</Label>
          <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Selecteer een leverancier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {suppliersLoading || discountsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : selectedSupplierId ? (
          <>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleStartAdd} disabled={isAdding}>
                <Plus className="h-4 w-4 mr-1" />
                Korting toevoegen
              </Button>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kortingsgroep</TableHead>
                    <TableHead>Korting %</TableHead>
                    <TableHead>Omschrijving</TableHead>
                    <TableHead className="w-24">Acties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isAdding && (
                    <TableRow>
                      <TableCell>
                        <Select
                          value={editForm.discount_group}
                          onValueChange={(v) =>
                            setEditForm((prev) => ({ ...prev, discount_group: v }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecteer" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableGroups.map((g) => (
                              <SelectItem key={g.code} value={g.code}>
                                {g.code}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="45.00"
                          value={editForm.discount_percent}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              discount_percent: e.target.value,
                            }))
                          }
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Bijv. Kasten met fronten"
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              description: e.target.value,
                            }))
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleSave}
                            disabled={upsertDiscount.isPending}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={handleCancel}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {discounts.length === 0 && !isAdding ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Geen kortingen ingesteld voor deze leverancier
                      </TableCell>
                    </TableRow>
                  ) : (
                    discounts.map((discount) =>
                      editingId === discount.id ? (
                        <TableRow key={discount.id}>
                          <TableCell>
                            <span className="font-medium">{discount.discount_group}</span>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={editForm.discount_percent}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  discount_percent: e.target.value,
                                }))
                              }
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editForm.description}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  description: e.target.value,
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleSave}
                                disabled={upsertDiscount.isPending}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" onClick={handleCancel}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={discount.id}>
                          <TableCell className="font-medium">
                            {discount.discount_group}
                          </TableCell>
                          <TableCell>
                            {discount.discount_percent != null
                              ? `${discount.discount_percent}%`
                              : "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {discount.description || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleStartEdit(discount)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDelete(discount.id)}
                                disabled={deleteDiscount.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    )
                  )}
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              💡 Inkoopprijs = Adviesprijs × (100 - korting%) / 100
            </p>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Selecteer een leverancier om kortingen te beheren
          </div>
        )}
      </CardContent>
    </Card>
  );
}
