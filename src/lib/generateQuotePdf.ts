import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { QuoteSection } from "@/hooks/useQuoteSections";
import { QuoteLine } from "@/hooks/useQuoteLines";

interface QuoteData {
  quote_number: number;
  quote_date: string | null;
  valid_until: string | null;
  payment_terms_description?: string | null;
  discount_amount?: number | null;
  customer: {
    first_name?: string | null;
    last_name?: string | null;
    company_name?: string | null;
    street_address?: string | null;
    postal_code?: string | null;
    city?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  division?: {
    name?: string | null;
    address?: string | null;
    postal_code?: string | null;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
}

interface SectionWithLines extends QuoteSection {
  quote_lines: QuoteLine[];
}

const SECTION_TYPE_LABELS: Record<string, string> = {
  meubelen: "MEUBELEN",
  apparatuur: "APPARATUUR / ACCESSOIRES",
  werkbladen: "WERKBLAD(EN)",
  montage: "MONTAGE",
  transport: "TRANSPORT",
  overig: "OVERIG",
};

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "€ 0,00";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDimension(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return Math.round(value / 10).toString();
}

function getCustomerName(customer: QuoteData["customer"]): string {
  if (!customer) return "Onbekend";
  if (customer.company_name) return customer.company_name;
  return [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Onbekend";
}

export function generateQuotePdf(
  quote: QuoteData,
  sections: SectionWithLines[]
): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Colors
  const primaryColor: [number, number, number] = [30, 58, 95]; // Dark blue
  const accentColor: [number, number, number] = [200, 170, 120]; // Gold
  const textColor: [number, number, number] = [50, 50, 50];
  const lightGray: [number, number, number] = [240, 240, 240];

  // ===== HEADER =====
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 35, "F");

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("ABITARE", margin, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Italiaanse Keukens", margin, 27);

  // Quote info right side
  doc.setFontSize(9);
  doc.text(`Offerte: ${quote.quote_number}`, pageWidth - margin, 15, { align: "right" });
  doc.text(`Datum: ${formatDate(quote.quote_date)}`, pageWidth - margin, 21, { align: "right" });
  doc.text(`Geldig tot: ${formatDate(quote.valid_until)}`, pageWidth - margin, 27, { align: "right" });

  yPos = 45;

  // ===== CUSTOMER INFO =====
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Gegevens klant:", margin, yPos);

  doc.setFont("helvetica", "normal");
  yPos += 6;
  doc.text(getCustomerName(quote.customer), margin, yPos);

  if (quote.customer?.street_address) {
    yPos += 5;
    doc.text(quote.customer.street_address, margin, yPos);
  }
  if (quote.customer?.postal_code || quote.customer?.city) {
    yPos += 5;
    doc.text(
      [quote.customer?.postal_code, quote.customer?.city].filter(Boolean).join(" "),
      margin,
      yPos
    );
  }
  if (quote.customer?.phone) {
    yPos += 5;
    doc.text(`Tel: ${quote.customer.phone}`, margin, yPos);
  }
  if (quote.customer?.email) {
    yPos += 5;
    doc.text(`Email: ${quote.customer.email}`, margin, yPos);
  }

  yPos += 12;

  // ===== SECTIONS =====
  sections.forEach((section, sectionIndex) => {
    const sectionLabel = section.title || SECTION_TYPE_LABELS[section.section_type] || section.section_type.toUpperCase();

    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    // Section header
    doc.setFillColor(...accentColor);
    doc.rect(margin, yPos, pageWidth - margin * 2, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(sectionLabel, margin + 3, yPos + 5.5);
    yPos += 10;

    // Section configuration (if applicable)
    const hasConfig = section.description || section.front_number || section.workbench_material;
    if (hasConfig) {
      doc.setTextColor(...textColor);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");

      if (section.description) {
        doc.text(section.description, margin, yPos + 4);
        yPos += 5;
      }

      const configItems: string[] = [];
      if (section.front_number) configItems.push(`Frontnummer: ${section.front_number}`);
      if (section.front_color) configItems.push(`Kleur front: ${section.front_color}`);
      if (section.plinth_color) configItems.push(`Plintkleur: ${section.plinth_color}`);
      if (section.corpus_color) configItems.push(`Corpuskleur: ${section.corpus_color}`);
      if (section.hinge_color) configItems.push(`Scharnier kleur: ${section.hinge_color}`);
      if (section.drawer_color) configItems.push(`Lade kleur: ${section.drawer_color}`);
      if (section.handle_number) configItems.push(`Greepnummer: ${section.handle_number}`);
      if (section.column_height_mm) configItems.push(`Kolomkast hoogte: ${section.column_height_mm} mm`);
      if (section.countertop_height_mm) configItems.push(`Aanrecht hoogte: ${section.countertop_height_mm} mm`);
      if (section.countertop_thickness_mm) configItems.push(`Blad dikte: ${section.countertop_thickness_mm} mm`);
      if (section.workbench_material) configItems.push(`Uitvoering: ${section.workbench_material}`);
      if (section.workbench_edge) configItems.push(`Randafwerking: ${section.workbench_edge}`);
      if (section.workbench_color) configItems.push(`Kleur: ${section.workbench_color}`);

      if (configItems.length > 0) {
        doc.setFont("helvetica", "normal");
        const configText = configItems.join(" | ");
        const splitConfig = doc.splitTextToSize(configText, pageWidth - margin * 2 - 6);
        doc.text(splitConfig, margin + 3, yPos + 4);
        yPos += splitConfig.length * 4 + 2;
      }

      yPos += 3;
    }

    // Build table data
    const lines = section.quote_lines || [];
    const mainLines = lines.filter((line) => !line.parent_line_id);
    const subLinesMap = new Map<string, QuoteLine[]>();
    lines.filter((line) => line.parent_line_id).forEach((subLine) => {
      const parentId = subLine.parent_line_id!;
      if (!subLinesMap.has(parentId)) {
        subLinesMap.set(parentId, []);
      }
      subLinesMap.get(parentId)!.push(subLine);
    });

    const tableBody: (string | { content: string; styles?: object })[][] = [];
    let lineNum = 0;

    mainLines.forEach((line) => {
      if (line.is_group_header) {
        // Group header row
        tableBody.push([
          { content: "", styles: { fillColor: lightGray } },
          { content: "", styles: { fillColor: lightGray } },
          { content: line.group_title || line.description, styles: { fontStyle: "bold", fillColor: lightGray } },
          { content: "", styles: { fillColor: lightGray } },
          { content: "", styles: { fillColor: lightGray } },
          { content: "", styles: { fillColor: lightGray } },
          { content: "", styles: { fillColor: lightGray } },
        ]);
      } else {
        lineNum++;
        tableBody.push([
          lineNum.toString(),
          line.article_code || "-",
          line.description + (line.extra_description ? `\n${line.extra_description}` : ""),
          formatDimension(line.height_mm),
          formatDimension(line.width_mm),
          line.quantity?.toString() || "1",
          formatCurrency(line.line_total),
        ]);

        // Sub-lines
        const subLines = subLinesMap.get(line.id) || [];
        subLines.forEach((subLine) => {
          tableBody.push([
            { content: subLine.sub_line_number || ".", styles: { textColor: [120, 120, 120], fontSize: 7 } },
            { content: subLine.article_code || "", styles: { textColor: [120, 120, 120], fontSize: 7 } },
            { content: subLine.description, styles: { textColor: [120, 120, 120], fontSize: 7, cellPadding: { left: 3 } } },
            { content: "", styles: { fontSize: 7 } },
            { content: "", styles: { fontSize: 7 } },
            { content: subLine.quantity?.toString() || "1", styles: { textColor: [120, 120, 120], fontSize: 7 } },
            { content: formatCurrency(subLine.line_total), styles: { textColor: [120, 120, 120], fontSize: 7 } },
          ]);
        });
      }
    });

    if (tableBody.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [["no", "code", "omschrijving", "hg", "br", "aantal", "bedrag"]],
        body: tableBody,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          textColor: textColor,
        },
        headStyles: {
          fillColor: [80, 80, 80],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 7,
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 25 },
          2: { cellWidth: "auto" },
          3: { cellWidth: 12, halign: "center" },
          4: { cellWidth: 12, halign: "center" },
          5: { cellWidth: 18, halign: "right" },
          6: { cellWidth: 25, halign: "right" },
        },
        didDrawPage: (data) => {
          // Update yPos after table
        },
      });

      // Get the final Y position after the table
      yPos = (doc as any).lastAutoTable?.finalY || yPos + 20;
    }

    // Section subtotal
    const sectionTotal = lines.reduce((sum, line) => sum + (line.line_total || 0), 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...textColor);
    doc.text(`Sectie totaal: ${formatCurrency(sectionTotal)}`, pageWidth - margin, yPos + 5, { align: "right" });
    yPos += 12;
  });

  // ===== TOTALS =====
  if (yPos > pageHeight - 70) {
    doc.addPage();
    yPos = margin;
  }

  let subtotalProducts = 0;
  let subtotalMontage = 0;

  sections.forEach((section) => {
    const sectionTotal = section.quote_lines?.reduce(
      (sum, line) => sum + (line.line_total || 0),
      0
    ) || 0;

    if (section.section_type === "montage") {
      subtotalMontage += sectionTotal;
    } else {
      subtotalProducts += sectionTotal;
    }
  });

  const discountAmount = quote.discount_amount || 0;
  const subtotalExclVat = subtotalProducts + subtotalMontage - discountAmount;
  const totalVat = subtotalExclVat * 0.21;
  const totalInclVat = subtotalExclVat + totalVat;

  // Totals box
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(pageWidth - margin - 80, yPos, 80, 50, 2, 2, "F");
  doc.setDrawColor(200, 200, 200);
  doc.roundedRect(pageWidth - margin - 80, yPos, 80, 50, 2, 2, "S");

  let totalsY = yPos + 8;
  const totalsX = pageWidth - margin - 75;
  const totalsValueX = pageWidth - margin - 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...textColor);

  doc.text("Subtotaal producten:", totalsX, totalsY);
  doc.text(formatCurrency(subtotalProducts), totalsValueX, totalsY, { align: "right" });
  totalsY += 5;

  if (subtotalMontage > 0) {
    doc.text("Subtotaal montage:", totalsX, totalsY);
    doc.text(formatCurrency(subtotalMontage), totalsValueX, totalsY, { align: "right" });
    totalsY += 5;
  }

  if (discountAmount > 0) {
    doc.setTextColor(0, 128, 0);
    doc.text("Korting:", totalsX, totalsY);
    doc.text(`- ${formatCurrency(discountAmount)}`, totalsValueX, totalsY, { align: "right" });
    totalsY += 5;
    doc.setTextColor(...textColor);
  }

  doc.text("Subtotaal excl. BTW:", totalsX, totalsY);
  doc.text(formatCurrency(subtotalExclVat), totalsValueX, totalsY, { align: "right" });
  totalsY += 5;

  doc.text("BTW 21%:", totalsX, totalsY);
  doc.text(formatCurrency(totalVat), totalsValueX, totalsY, { align: "right" });
  totalsY += 7;

  // Total line
  doc.setDrawColor(...accentColor);
  doc.line(totalsX, totalsY - 2, totalsValueX, totalsY - 2);

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Totaal incl. BTW:", totalsX, totalsY + 3);
  doc.text(formatCurrency(totalInclVat), totalsValueX, totalsY + 3, { align: "right" });

  yPos += 60;

  // ===== PAYMENT TERMS =====
  if (yPos > pageHeight - 30) {
    doc.addPage();
    yPos = margin;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...textColor);
  doc.text("Betalingsvoorwaarden:", margin, yPos);

  doc.setFont("helvetica", "normal");
  const paymentTerms = quote.payment_terms_description || "25% aanbetaling bij akkoord, 75% voor levering";
  doc.text(paymentTerms, margin, yPos + 5);

  // ===== FOOTER =====
  const footerY = pageHeight - 10;
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Abitare Italiaanse Keukens - Deze offerte is vrijblijvend en onder voorbehoud van tussentijdse prijswijzigingen.",
    pageWidth / 2,
    footerY,
    { align: "center" }
  );

  // Save the PDF
  const customerName = getCustomerName(quote.customer).replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Offerte_${quote.quote_number}_${customerName}.pdf`);
}
