import { cn } from "@/lib/utils";
import type { StosaConfig } from "@/types/quote-sections";

interface CabinetPreviewProps {
  config: StosaConfig;
  modelName?: string | null;
  /** Map of color codes to hex values for front colors */
  frontColors: { code: string; hex?: string | null; name: string }[];
  /** Map of color codes to hex values for corpus colors */
  corpusColors: { code: string; hex?: string | null; name: string }[];
  /** Map of color codes to hex values for handle colors */
  handleColors: { code: string; hex?: string | null; name: string }[];
  /** Map of color codes to hex values for plinth colors */
  plinthColors: { code: string; hex?: string | null; name: string }[];
}

const TYPE_FALLBACKS: Record<string, string> = {
  front: "#D4C5A9",   // warm beige
  corpus: "#F0EDE8",  // light cream
  handle: "#878681",  // titanium grey
  plinth: "#A8A9AD",  // aluminium grey
};

function findHex(
  colors: { code: string; hex?: string | null }[],
  code?: string,
  colorType?: string
): string {
  const fallback = (colorType && TYPE_FALLBACKS[colorType]) || "#e5e7eb";
  if (!code) return fallback;
  return colors.find((c) => c.code === code)?.hex || fallback;
}

function findName(colors: { code: string; name: string }[], code?: string): string | undefined {
  if (!code) return undefined;
  return colors.find((c) => c.code === code)?.name;
}

export function CabinetPreview({
  config,
  modelName,
  frontColors,
  corpusColors,
  handleColors,
  plinthColors,
}: CabinetPreviewProps) {
  const frontHex = findHex(frontColors, config.front_color, "front");
  const corpusHex = findHex(corpusColors, config.corpus_color, "corpus");
  const handleHex = findHex(handleColors, config.handle_color, "handle");
  const plinthHex = findHex(plinthColors, config.plinth_color, "plinth");

  const frontName = findName(frontColors, config.front_color);
  const handleName = findName(handleColors, config.handle_color);

  return (
    <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-center gap-6">
      {/* Cabinet visual */}
      <div className="relative flex-shrink-0">
        {/* Corpus (back layer) */}
        <div
          className="w-28 h-36 rounded-lg border-2 border-border/50 relative overflow-hidden"
          style={{ backgroundColor: corpusHex }}
        >
          {/* Front (overlay) */}
          <div
            className="absolute inset-1 rounded"
            style={{ backgroundColor: frontHex }}
          />
          {/* Handle */}
          {config.handle_type !== "greeploos" && (
            <div
              className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-1.5 rounded-full"
              style={{ backgroundColor: handleHex }}
            />
          )}
        </div>
        {/* Plinth */}
        <div
          className="absolute -bottom-2 left-0 right-0 h-2.5 rounded-sm"
          style={{ backgroundColor: plinthHex }}
        />
      </div>

      {/* Labels */}
      <div className="text-sm min-w-0">
        {modelName && (
          <div className="font-medium text-foreground truncate">{modelName}</div>
        )}
        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
          {frontName && <div>Front: {frontName}</div>}
          {handleName && <div>Greep: {handleName}</div>}
          {config.plinth_height && <div>Plint: {config.plinth_height} cm</div>}
        </div>
      </div>
    </div>
  );
}
