import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useStosaFrontTypes, useStosaColors } from "@/hooks/useStosaData";
import { usePriceGroupColors, useSupplierColors } from "@/hooks/usePriceGroupColors";
import type { StosaConfig } from "@/types/quote-sections";
import { HANDLE_TYPES, PLINTH_TYPES, PLINTH_HEIGHTS, WORKTOP_THICKNESSES } from "@/types/quote-sections";
import { CabinetPreview } from "./CabinetPreview";

interface StosaConfigPanelProps {
  modelCode: string | null;
  supplierId: string;
  priceGroupId: string | null;
  config: StosaConfig;
  onChange: (config: StosaConfig) => void;
}

export function StosaConfigPanel({
  modelCode,
  supplierId,
  priceGroupId,
  config,
  onChange,
}: StosaConfigPanelProps) {
  const { data: frontTypes = [] } = useStosaFrontTypes(modelCode);
  const { data: frontColors = [] } = useStosaColors("front");
  const { data: corpusColors = [] } = useStosaColors("corpus");
  const { data: handleColors = [] } = useStosaColors("handle");
  const { data: plinthColors = [] } = useStosaColors("plinth");

  // Also load price_group_colors for front if available
  const { data: pgFrontColors = [] } = usePriceGroupColors(priceGroupId || undefined, "front");
  const { data: pgCorpusColors = [] } = useSupplierColors(supplierId, "corpus");

  // Prefer price_group_colors over stosa_colors when available
  const activeFrontColors = pgFrontColors.length > 0 ? pgFrontColors : frontColors;
  const activeCorpusColors = pgCorpusColors.length > 0 ? pgCorpusColors : corpusColors;

  const update = (partial: Partial<StosaConfig>) => {
    onChange({ ...config, ...partial });
  };

  // Build color arrays for the cabinet preview
  const previewFrontColors = activeFrontColors.map((c: any) => ({
    code: c.color_code || c.code,
    hex: c.hex_color,
    name: c.color_name || c.name,
  }));
  const previewCorpusColors = activeCorpusColors.map((c: any) => ({
    code: c.color_code || c.code,
    hex: c.hex_color,
    name: c.color_name || c.name,
  }));
  const previewHandleColors = handleColors.map((c: any) => ({
    code: c.code,
    hex: c.hex_color,
    name: c.name,
  }));
  const previewPlinthColors = plinthColors.map((c: any) => ({
    code: c.code,
    hex: c.hex_color,
    name: c.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Configuratie</h3>
        <p className="text-sm text-muted-foreground">
          Stel de uitvoering in voor deze sectie
        </p>
      </div>

      {/* Live Cabinet Preview */}
      {(config.front_color || config.corpus_color || config.handle_color || config.plinth_color) && (
        <CabinetPreview
          config={config}
          frontColors={previewFrontColors}
          corpusColors={previewCorpusColors}
          handleColors={previewHandleColors}
          plinthColors={previewPlinthColors}
        />
      )}

      {/* Front */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Front</h4>

        {frontTypes.length > 0 && (
          <div className="space-y-1.5">
            <Label>Front type</Label>
            <Select
              value={config.front_code || ""}
              onValueChange={(v) => {
                const ft = frontTypes.find((f) => f.code === v);
                update({ front_code: v, front_name: ft?.name || v });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer front type" />
              </SelectTrigger>
              <SelectContent>
                {frontTypes.map((ft) => (
                  <SelectItem key={ft.id} value={ft.code}>
                    {ft.code} - {ft.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Frontkleur</Label>
          {activeFrontColors.length > 0 ? (
            <Select
              value={config.front_color || ""}
              onValueChange={(v) => update({ front_color: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer frontkleur" />
              </SelectTrigger>
              <SelectContent>
                {activeFrontColors.map((c: any) => (
                  <SelectItem key={c.id} value={c.color_code || c.code}>
                    {c.color_code || c.code} - {c.color_name || c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="Bijv. Noce Eucalipto"
              value={config.front_color || ""}
              onChange={(e) => update({ front_color: e.target.value })}
            />
          )}
        </div>
      </div>

      <Separator />

      {/* Corpus */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Corpus</h4>
        <div className="space-y-1.5">
          <Label>Korpuskleur</Label>
          {activeCorpusColors.length > 0 ? (
            <Select
              value={config.corpus_color || ""}
              onValueChange={(v) => update({ corpus_color: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer korpuskleur" />
              </SelectTrigger>
              <SelectContent>
                {activeCorpusColors.map((c: any) => (
                  <SelectItem key={c.id} value={c.color_code || c.code}>
                    {c.color_code || c.code} - {c.color_name || c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="Bijv. Rose"
              value={config.corpus_color || ""}
              onChange={(e) => update({ corpus_color: e.target.value })}
            />
          )}
        </div>
      </div>

      <Separator />

      {/* Greep */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Greep</h4>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select
            value={config.handle_type || ""}
            onValueChange={(v) => update({ handle_type: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecteer greep type" />
            </SelectTrigger>
            <SelectContent>
              {HANDLE_TYPES.map((ht) => (
                <SelectItem key={ht.value} value={ht.value}>
                  {ht.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {config.handle_type && config.handle_type !== "greeploos" && (
          <>
            <div className="space-y-1.5">
              <Label>Greepcode</Label>
              <Input
                placeholder="Bijv. M, MI, GS, Linear..."
                value={config.handle_code || ""}
                onChange={(e) => update({ handle_code: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Greepkleur</Label>
              {handleColors.length > 0 ? (
                <Select
                  value={config.handle_color || ""}
                  onValueChange={(v) => update({ handle_color: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer greepkleur" />
                  </SelectTrigger>
                  <SelectContent>
                    {handleColors.map((c) => (
                      <SelectItem key={c.id} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Bijv. Titanio"
                  value={config.handle_color || ""}
                  onChange={(e) => update({ handle_color: e.target.value })}
                />
              )}
            </div>
          </>
        )}
      </div>

      <Separator />

      {/* Plint */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Plint</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={config.plinth_type || ""}
              onValueChange={(v) => update({ plinth_type: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {PLINTH_TYPES.map((pt) => (
                  <SelectItem key={pt.value} value={pt.value}>
                    {pt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Hoogte</Label>
            <Select
              value={config.plinth_height?.toString() || ""}
              onValueChange={(v) => update({ plinth_height: parseInt(v) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Hoogte" />
              </SelectTrigger>
              <SelectContent>
                {PLINTH_HEIGHTS.map((ph) => (
                  <SelectItem key={ph.value} value={ph.value.toString()}>
                    {ph.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Plintkleur</Label>
          {plinthColors.length > 0 ? (
            <Select
              value={config.plinth_color || ""}
              onValueChange={(v) => update({ plinth_color: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecteer plintkleur" />
              </SelectTrigger>
              <SelectContent>
                {plinthColors.map((c) => (
                  <SelectItem key={c.id} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder="Bijv. PVC Titanio"
              value={config.plinth_color || ""}
              onChange={(e) => update({ plinth_color: e.target.value })}
            />
          )}
        </div>
      </div>

      <Separator />

      {/* Werkblad */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Werkblad</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Hoogte (mm)</Label>
            <Input
              type="number"
              placeholder="Bijv. 922"
              value={config.worktop_height?.toString() || ""}
              onChange={(e) => update({ worktop_height: e.target.value ? parseInt(e.target.value) : undefined })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Dikte</Label>
            <Select
              value={config.worktop_thickness?.toString() || ""}
              onValueChange={(v) => update({ worktop_thickness: parseInt(v) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Dikte" />
              </SelectTrigger>
              <SelectContent>
                {WORKTOP_THICKNESSES.map((wt) => (
                  <SelectItem key={wt.value} value={wt.value.toString()}>
                    {wt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
