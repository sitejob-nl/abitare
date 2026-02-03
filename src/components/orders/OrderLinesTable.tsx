import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderLine {
  id: string;
  description: string;
  article_code: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number;
  discount_percentage: number | null;
  line_total: number | null;
  is_group_header: boolean | null;
  group_title: string | null;
  section_type: string | null;
}

interface OrderLinesTableProps {
  lines: OrderLine[];
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "€ 0,00";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function OrderLinesTable({ lines }: OrderLinesTableProps) {
  if (!lines || lines.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Orderregels</h3>
        </div>
        <div className="py-8 text-center">
          <Package className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">Geen orderregels</p>
        </div>
      </div>
    );
  }

  // Group lines by section_type or group_title
  const groupedLines: { title: string; lines: OrderLine[] }[] = [];
  let currentGroup: { title: string; lines: OrderLine[] } | null = null;

  lines.forEach((line) => {
    if (line.is_group_header && line.group_title) {
      if (currentGroup) {
        groupedLines.push(currentGroup);
      }
      currentGroup = { title: line.group_title, lines: [] };
    } else if (currentGroup) {
      currentGroup.lines.push(line);
    } else {
      // Lines without a group header
      if (!groupedLines.find((g) => g.title === "Algemeen")) {
        groupedLines.push({ title: "Algemeen", lines: [] });
      }
      groupedLines.find((g) => g.title === "Algemeen")?.lines.push(line);
    }
  });

  if (currentGroup && currentGroup.lines.length > 0) {
    groupedLines.push(currentGroup);
  }

  // If no groups were created, show all lines flat
  const hasGroups = groupedLines.some((g) => g.lines.length > 0);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Orderregels</h3>
            <p className="text-xs text-muted-foreground">{lines.length} regel(s)</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Artikel
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Omschrijving
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Aantal
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Prijs
              </th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Totaal
              </th>
            </tr>
          </thead>
          <tbody>
            {hasGroups ? (
              groupedLines.map((group) => (
                <>
                  <tr key={group.title} className="bg-muted/30">
                    <td colSpan={5} className="px-4 py-2 text-xs font-semibold uppercase text-muted-foreground">
                      {group.title}
                    </td>
                  </tr>
                  {group.lines.map((line) => (
                    <tr key={line.id} className="border-b border-border-light last:border-b-0">
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {line.article_code || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">
                        {line.description}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-foreground">
                        {line.quantity} {line.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-foreground">
                        {formatCurrency(line.unit_price)}
                        {line.discount_percentage && line.discount_percentage > 0 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (-{line.discount_percentage}%)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                        {formatCurrency(line.line_total)}
                      </td>
                    </tr>
                  ))}
                </>
              ))
            ) : (
              lines
                .filter((line) => !line.is_group_header)
                .map((line) => (
                  <tr key={line.id} className="border-b border-border-light last:border-b-0">
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {line.article_code || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {line.description}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-foreground">
                      {line.quantity} {line.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-foreground">
                      {formatCurrency(line.unit_price)}
                      {line.discount_percentage && line.discount_percentage > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (-{line.discount_percentage}%)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                      {formatCurrency(line.line_total)}
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
