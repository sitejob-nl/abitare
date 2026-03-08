import { useMemo } from "react";
import { Package, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

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
  section_id: string | null;
}

interface OrderSection {
  id: string;
  section_type: string;
  title: string | null;
  sort_order: number | null;
  subtotal: number | null;
  discount_percentage: number | null;
  discount_amount: number | null;
  discount_description: string | null;
  range?: { id: string; code: string; name: string | null } | null;
  color?: { id: string; code: string; name: string } | null;
}

interface OrderLinesTableProps {
  lines: OrderLine[];
  sections?: OrderSection[];
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "€ 0,00";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

const SECTION_TYPE_LABELS: Record<string, string> = {
  meubelen: "Keukenmeubelen",
  apparatuur: "Apparatuur",
  werkbladen: "Werkbladen",
  montage: "Montage",
  transport: "Transport",
  overig: "Overig",
};

export function OrderLinesTable({ lines, sections = [] }: OrderLinesTableProps) {
  // Group lines by section
  const groupedData = useMemo(() => {
    if (!sections || sections.length === 0) {
      // Fallback to old grouping by group_title
      return null;
    }

    // Sort sections by sort_order
    const sortedSections = [...sections].sort((a, b) => 
      (a.sort_order || 0) - (b.sort_order || 0)
    );

    return sortedSections.map((section) => {
      const sectionLines = lines
        .filter((line) => line.section_id === section.id)
        .sort((a, b) => {
          // Sort by is_group_header first (headers come first), then by any existing order
          if (a.is_group_header && !b.is_group_header) return -1;
          if (!a.is_group_header && b.is_group_header) return 1;
          return 0;
        });

      const brutoSubtotal = sectionLines.reduce(
        (sum, line) => sum + (line.line_total || 0),
        0
      );

      const discountAmount = section.discount_percentage
        ? (brutoSubtotal * section.discount_percentage) / 100
        : (section.discount_amount || 0);

      const nettoSubtotal = brutoSubtotal - discountAmount;

      return {
        section,
        lines: sectionLines,
        brutoSubtotal,
        discountAmount,
        nettoSubtotal,
      };
    });
  }, [lines, sections]);

  // Lines without a section
  const orphanLines = useMemo(() => {
    if (!sections || sections.length === 0) return lines;
    return lines.filter((line) => !line.section_id);
  }, [lines, sections]);

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

  // If we have sections, render grouped view
  if (groupedData && groupedData.length > 0) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Orderregels</h3>
              <p className="text-xs text-muted-foreground">
                {lines.length} regel(s) in {groupedData.length} sectie(s)
              </p>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border">
          {groupedData.map(({ section, lines: sectionLines, brutoSubtotal, discountAmount, nettoSubtotal }) => (
            <div key={section.id}>
              {/* Section header */}
              <div className="bg-muted/50 px-4 sm:px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-sm uppercase tracking-wide truncate">
                      {section.title || SECTION_TYPE_LABELS[section.section_type] || section.section_type}
                    </h4>
                    {section.range && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {section.range.code}
                        {section.range.name && ` - ${section.range.name}`}
                        {section.color && ` • ${section.color.name}`}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm flex-shrink-0">
                    {discountAmount > 0 && (
                      <div className="flex items-center gap-1 text-green-600 text-xs justify-end">
                        <Percent className="h-3 w-3" />
                        {section.discount_percentage
                          ? `${section.discount_percentage}%`
                          : formatCurrency(discountAmount)}
                      </div>
                    )}
                    <div className="font-semibold">{formatCurrency(nettoSubtotal)}</div>
                  </div>
                </div>
              </div>

              {/* Section lines - Desktop table */}
              {sectionLines.length > 0 ? (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/20">
                          <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Artikel
                          </th>
                          <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Omschrijving
                          </th>
                          <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Aantal
                          </th>
                          <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Prijs
                          </th>
                          <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Totaal
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionLines.map((line) =>
                          line.is_group_header ? (
                            <tr key={line.id} className="bg-muted/10">
                              <td colSpan={5} className="px-4 py-2 text-xs font-medium text-muted-foreground">
                                {line.group_title || line.description}
                              </td>
                            </tr>
                          ) : (
                            <tr key={line.id} className="border-b border-border/50 last:border-b-0">
                              <td className="px-4 py-2.5 text-sm text-muted-foreground">
                                {line.article_code || "-"}
                              </td>
                              <td className="px-4 py-2.5 text-sm text-foreground">
                                {line.description}
                              </td>
                              <td className="px-4 py-2.5 text-right text-sm text-foreground">
                                {line.quantity} {line.unit}
                              </td>
                              <td className="px-4 py-2.5 text-right text-sm text-foreground">
                                {formatCurrency(line.unit_price)}
                                {line.discount_percentage && line.discount_percentage > 0 && (
                                  <span className="ml-1 text-xs text-muted-foreground">
                                    (-{line.discount_percentage}%)
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right text-sm font-medium text-foreground">
                                {formatCurrency(line.line_total)}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Section lines - Mobile cards */}
                  <div className="md:hidden divide-y divide-border/50">
                    {sectionLines.map((line) =>
                      line.is_group_header ? (
                        <div key={line.id} className="px-4 py-2 bg-muted/10">
                          <span className="text-xs font-medium text-muted-foreground">
                            {line.group_title || line.description}
                          </span>
                        </div>
                      ) : (
                        <div key={line.id} className="px-4 py-3">
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <p className="text-sm text-foreground flex-1">{line.description}</p>
                            <span className="text-sm font-medium text-foreground flex-shrink-0">
                              {formatCurrency(line.line_total)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {line.article_code && <span>{line.article_code}</span>}
                            <span>{line.quantity} {line.unit}</span>
                            <span>@ {formatCurrency(line.unit_price)}</span>
                            {line.discount_percentage && line.discount_percentage > 0 && (
                              <span className="text-green-600">-{line.discount_percentage}%</span>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </>
              ) : (
                <div className="px-4 sm:px-5 py-4 text-sm text-muted-foreground text-center">
                  Geen regels in deze sectie
                </div>
              )}

              {/* Section discount row */}
              {discountAmount > 0 && (
                <div className="px-4 sm:px-5 py-2 bg-green-50 dark:bg-green-950/20 border-t border-green-100 dark:border-green-900/30 flex justify-between text-sm">
                  <span className="text-green-700 dark:text-green-400">
                    Sectiekorting
                    {section.discount_description && ` (${section.discount_description})`}
                  </span>
                  <span className="font-medium text-green-700 dark:text-green-400">
                    - {formatCurrency(discountAmount)}
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* Orphan lines (lines without a section) */}
          {orphanLines.length > 0 && (
            <div>
              <div className="bg-muted/30 px-4 sm:px-5 py-3">
                <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
                  Overige regels
                </h4>
              </div>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <tbody>
                    {orphanLines
                      .filter((line) => !line.is_group_header)
                      .map((line) => (
                        <tr key={line.id} className="border-b border-border/50 last:border-b-0">
                          <td className="px-4 py-2.5 text-sm text-muted-foreground">
                            {line.article_code || "-"}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-foreground">
                            {line.description}
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm text-foreground">
                            {line.quantity} {line.unit}
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm text-foreground">
                            {formatCurrency(line.unit_price)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-medium text-foreground">
                            {formatCurrency(line.line_total)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-border/50">
                {orphanLines
                  .filter((line) => !line.is_group_header)
                  .map((line) => (
                    <div key={line.id} className="px-4 py-3">
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <p className="text-sm text-foreground flex-1">{line.description}</p>
                        <span className="text-sm font-medium text-foreground flex-shrink-0">
                          {formatCurrency(line.line_total)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {line.article_code && <span>{line.article_code}</span>}
                        <span>{line.quantity} {line.unit}</span>
                        <span>@ {formatCurrency(line.unit_price)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback: original flat/grouped view for orders without sections
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
      if (!groupedLines.find((g) => g.title === "Algemeen")) {
        groupedLines.push({ title: "Algemeen", lines: [] });
      }
      groupedLines.find((g) => g.title === "Algemeen")?.lines.push(line);
    }
  });

  if (currentGroup && currentGroup.lines.length > 0) {
    groupedLines.push(currentGroup);
  }

  const hasGroups = groupedLines.some((g) => g.lines.length > 0);

  // Helper to render mobile cards for fallback view
  const renderMobileCards = (linesToRender: OrderLine[]) => (
    <div className="md:hidden divide-y divide-border/50">
      {linesToRender
        .filter((line) => !line.is_group_header)
        .map((line) => (
          <div key={line.id} className="px-4 py-3">
            <div className="flex justify-between items-start gap-2 mb-1">
              <p className="text-sm text-foreground flex-1">{line.description}</p>
              <span className="text-sm font-medium text-foreground flex-shrink-0">
                {formatCurrency(line.line_total)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {line.article_code && <span>{line.article_code}</span>}
              <span>{line.quantity} {line.unit}</span>
              <span>@ {formatCurrency(line.unit_price)}</span>
              {line.discount_percentage && line.discount_percentage > 0 && (
                <span className="text-green-600">-{line.discount_percentage}%</span>
              )}
            </div>
          </div>
        ))}
    </div>
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border p-4 sm:p-5">
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

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
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

      {/* Mobile cards */}
      {hasGroups ? (
        <div className="md:hidden divide-y divide-border">
          {groupedLines.map((group) => (
            <div key={group.title}>
              <div className="px-4 py-2 bg-muted/30">
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {group.title}
                </span>
              </div>
              {renderMobileCards(group.lines)}
            </div>
          ))}
        </div>
      ) : (
        renderMobileCards(lines)
      )}
    </div>
  );
}
