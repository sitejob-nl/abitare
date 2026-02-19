import { useState } from "react";
import { Plus, Trash2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DamageRecord {
  id?: string;
  description: string;
  position: string;
  measurements: string;
  order_line_id: string | null;
}

interface OrderLine {
  id: string;
  description: string;
  article_code: string | null;
  quantity: number | null;
}

interface DamageRecordFormProps {
  damages: DamageRecord[];
  orderLines: OrderLine[];
  onAdd: (damage: Omit<DamageRecord, "id">) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, damage: DamageRecord) => void;
  disabled?: boolean;
}

export function DamageRecordForm({
  damages,
  orderLines,
  onAdd,
  onRemove,
  onUpdate,
  disabled,
}: DamageRecordFormProps) {
  const [newDamage, setNewDamage] = useState<Omit<DamageRecord, "id">>({
    description: "",
    position: "",
    measurements: "",
    order_line_id: null,
  });

  const handleAdd = () => {
    if (!newDamage.description.trim()) return;
    onAdd(newDamage);
    setNewDamage({ description: "", position: "", measurements: "", order_line_id: null });
  };

  return (
    <div className="space-y-3">
      {damages.map((damage, index) => (
        <Card key={damage.id || index} className="border-destructive/30">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Omschrijving</Label>
                  <p className="text-sm">{damage.description}</p>
                </div>
                {damage.position && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Positie/locatie</Label>
                    <p className="text-sm">{damage.position}</p>
                  </div>
                )}
                {damage.measurements && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Maatvoering</Label>
                    <p className="text-sm">{damage.measurements}</p>
                  </div>
                )}
                {damage.order_line_id && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Package className="h-3 w-3" />
                    {orderLines.find(l => l.id === damage.order_line_id)?.description || "Artikel"}
                  </div>
                )}
              </div>
              {!disabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => onRemove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {!disabled && (
        <Card className="border-dashed">
          <CardContent className="p-3 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="damageDesc">Omschrijving *</Label>
              <Textarea
                id="damageDesc"
                placeholder="Beschrijf de schade..."
                value={newDamage.description}
                onChange={(e) => setNewDamage(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="damagePos" className="text-xs">Positie/locatie</Label>
                <Input
                  id="damagePos"
                  placeholder="bijv. Linkerbovenkast"
                  value={newDamage.position}
                  onChange={(e) => setNewDamage(prev => ({ ...prev, position: e.target.value }))}
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="damageMeas" className="text-xs">Maatvoering</Label>
                <Input
                  id="damageMeas"
                  placeholder="bijv. 10x5cm"
                  value={newDamage.measurements}
                  onChange={(e) => setNewDamage(prev => ({ ...prev, measurements: e.target.value }))}
                  className="min-h-[44px]"
                />
              </div>
            </div>
            {orderLines.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Koppel aan artikelregel</Label>
                <Select
                  value={newDamage.order_line_id || "none"}
                  onValueChange={(val) => setNewDamage(prev => ({ ...prev, order_line_id: val === "none" ? null : val }))}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Selecteer artikel (optioneel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Geen koppeling</SelectItem>
                    {orderLines.map(line => (
                      <SelectItem key={line.id} value={line.id}>
                        {line.article_code ? `${line.article_code} - ` : ""}{line.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleAdd}
              disabled={!newDamage.description.trim()}
              className="w-full min-h-[44px]"
            >
              <Plus className="mr-1 h-4 w-4" />
              Schade toevoegen
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
