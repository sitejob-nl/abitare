import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  QuoteData,
  SectionWithLines,
  SECTION_TYPE_LABELS,
  COLORS,
  formatCurrency,
  formatDimension,
  getCustomerName,
  drawHeader,
  drawDocumentTitle,
  drawQuoteDetails,
  drawIntroText,
  drawSectionHeader,
  drawSpecsTable,
  calculateTotals,
  drawTotalsSection,
  drawPaymentTerms,
  drawConditions,
  drawSignatures,
  drawFooter,
} from "./quotePdfHelpers";

// Re-export types for consumers
export type { QuoteData, SectionWithLines };

function createPdfDocument(): jsPDF {
  return new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
}

function renderSections(
  doc: jsPDF,
  sections: SectionWithLines[],
  pageWidth: number,
  pageHeight: number,
  margin: number,
  startY: number
): number {
  let yPos = startY;

  sections.forEach((section) => {
    const sectionLabel =
      section.title ||
      SECTION_TYPE_LABELS[section.section_type] ||
      section.section_type.charAt(0).toUpperCase() + section.section_type.slice(1);

    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      doc.addPage();
      yPos = margin;
    }

    // Section header
    yPos = drawSectionHeader(doc, sectionLabel, pageWidth, margin, yPos);

    // Description if present
    if (section.description) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(...COLORS.text);
      const splitDesc = doc.splitTextToSize(section.description, pageWidth - margin * 2);
      doc.text(splitDesc, margin, yPos);
      yPos += splitDesc.length * 4 + 3;
    }

    // Specs table for meubelen/werkbladen sections
    const hasSpecs =
      section.front_number ||
      section.front_color ||
      section.workbench_material ||
      section.plinth_color ||
      section.corpus_color;

    if (hasSpecs) {
      yPos = drawSpecsTable(doc, section, margin, yPos);
    }

    // Build table data
    const lines = section.quote_lines || [];
    const mainLines = lines.filter((line) => !line.parent_line_id);
    const subLinesMap = new Map<string, typeof lines>();

    lines
      .filter((line) => line.parent_line_id)
      .forEach((subLine) => {
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
          { content: "", styles: { fillColor: COLORS.sectionBg } },
          { content: "", styles: { fillColor: COLORS.sectionBg } },
          {
            content: line.group_title || line.description,
            styles: { fontStyle: "bold", fillColor: COLORS.sectionBg },
          },
          { content: "", styles: { fillColor: COLORS.sectionBg } },
          { content: "", styles: { fillColor: COLORS.sectionBg } },
          { content: "", styles: { fillColor: COLORS.sectionBg } },
          { content: "", styles: { fillColor: COLORS.sectionBg } },
        ]);
      } else {
        lineNum++;
        const desc = line.extra_description
          ? `${line.description}\n${line.extra_description}`
          : line.description;

        tableBody.push([
          lineNum.toString(),
          line.article_code || "-",
          desc,
          formatDimension(line.height_mm),
          formatDimension(line.width_mm),
          line.quantity?.toString() || "1",
          formatCurrency(line.line_total),
        ]);

        // Sub-lines
        const subLines = subLinesMap.get(line.id) || [];
        subLines.forEach((subLine) => {
          tableBody.push([
            {
              content: subLine.sub_line_number || ".",
              styles: { textColor: COLORS.subText, fontSize: 8 },
            },
            {
              content: subLine.article_code || "",
              styles: { textColor: COLORS.subText, fontSize: 8 },
            },
            {
              content: subLine.description,
              styles: { textColor: COLORS.subText, fontSize: 8, cellPadding: { left: 4 } },
            },
            { content: "", styles: { fontSize: 8 } },
            { content: "", styles: { fontSize: 8 } },
            {
              content: subLine.quantity?.toString() || "1",
              styles: { textColor: COLORS.subText, fontSize: 8 },
            },
            {
              content: formatCurrency(subLine.line_total),
              styles: { textColor: COLORS.subText, fontSize: 8 },
            },
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
          fontSize: 9,
          cellPadding: 2,
          textColor: COLORS.text,
          lineColor: COLORS.tableBorder,
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: COLORS.tableHeaderBg,
          textColor: COLORS.text,
          fontStyle: "bold",
          fontSize: 9,
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 22 },
          2: { cellWidth: "auto" },
          3: { cellWidth: 12, halign: "center" },
          4: { cellWidth: 12, halign: "center" },
          5: { cellWidth: 15, halign: "center" },
          6: { cellWidth: 25, halign: "right" },
        },
        tableLineColor: COLORS.sectionBorder,
        tableLineWidth: 0.1,
      });

      yPos = (doc as any).lastAutoTable?.finalY || yPos + 20;
    }

    // Section subtotal with discount
    const sectionTotal = lines.reduce((sum, line) => sum + (line.line_total || 0), 0);
    const sectionDiscount = section.discount_amount || 0;
    const sectionNet = sectionTotal - sectionDiscount;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.text);

    if (sectionDiscount > 0) {
      doc.text(
        `Sectie subtotaal: ${formatCurrency(sectionTotal)}`,
        pageWidth - margin,
        yPos + 5,
        { align: "right" }
      );
      yPos += 5;
      doc.setFont("helvetica", "normal");
      doc.text(
        `Korting: - ${formatCurrency(sectionDiscount)}`,
        pageWidth - margin,
        yPos + 5,
        { align: "right" }
      );
      yPos += 5;
      doc.setFont("helvetica", "bold");
      doc.text(
        `Sectie totaal: ${formatCurrency(sectionNet)}`,
        pageWidth - margin,
        yPos + 5,
        { align: "right" }
      );
    } else {
      doc.text(
        `Sectie totaal: ${formatCurrency(sectionNet)}`,
        pageWidth - margin,
        yPos + 5,
        { align: "right" }
      );
    }

    yPos += 15;
  });

  return yPos;
}

export function generateQuotePdf(quote: QuoteData, sections: SectionWithLines[]): void {
  const doc = createPdfDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header with customer and company info
  let yPos = drawHeader(doc, quote, pageWidth, margin);

  // Document title
  yPos = drawDocumentTitle(doc, "Offerte", pageWidth, margin, yPos);

  // Quote details grid
  yPos = drawQuoteDetails(doc, quote, margin, yPos);

  // Intro text
  yPos = drawIntroText(doc, margin, pageWidth, yPos);

  // Sections with products
  yPos = renderSections(doc, sections, pageWidth, pageHeight, margin, yPos);

  // Check for new page before totals
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = margin;
  }

  // Totals
  const totals = calculateTotals(sections, quote.discount_amount || 0);
  yPos = drawTotalsSection(doc, totals, pageWidth, margin, yPos);

  // Payment terms
  yPos = drawPaymentTerms(doc, quote, margin, pageWidth, yPos);

  // Check for new page before conditions
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }

  // Conditions
  yPos = drawConditions(doc, margin, pageWidth, yPos);

  // Check for new page before signatures
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = margin;
  }

  // Signatures
  yPos = drawSignatures(doc, quote, margin, pageWidth, yPos);

  // Add footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, pageWidth, pageHeight, margin, i, totalPages);
  }

  // Save the PDF
  const customerName = getCustomerName(quote.customer).replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Offerte_${quote.quote_number}_${customerName}.pdf`);
}

export interface GeneratedPdfResult {
  base64: string;
  filename: string;
}

export function generateQuotePdfBase64(
  quote: QuoteData,
  sections: SectionWithLines[]
): GeneratedPdfResult {
  const doc = createPdfDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header with customer and company info
  let yPos = drawHeader(doc, quote, pageWidth, margin);

  // Document title
  yPos = drawDocumentTitle(doc, "Offerte", pageWidth, margin, yPos);

  // Quote details grid
  yPos = drawQuoteDetails(doc, quote, margin, yPos);

  // Intro text
  yPos = drawIntroText(doc, margin, pageWidth, yPos);

  // Sections with products
  yPos = renderSections(doc, sections, pageWidth, pageHeight, margin, yPos);

  // Check for new page before totals
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = margin;
  }

  // Totals
  const totals = calculateTotals(sections, quote.discount_amount || 0);
  yPos = drawTotalsSection(doc, totals, pageWidth, margin, yPos);

  // Payment terms
  yPos = drawPaymentTerms(doc, quote, margin, pageWidth, yPos);

  // Check for new page before conditions
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = margin;
  }

  // Conditions
  yPos = drawConditions(doc, margin, pageWidth, yPos);

  // Check for new page before signatures
  if (yPos > pageHeight - 40) {
    doc.addPage();
    yPos = margin;
  }

  // Signatures
  yPos = drawSignatures(doc, quote, margin, pageWidth, yPos);

  // Add footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, pageWidth, pageHeight, margin, i, totalPages);
  }

  // Return base64
  const customerName = getCustomerName(quote.customer).replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `Offerte_${quote.quote_number}_${customerName}.pdf`;
  const base64 = doc.output("datauristring").split(",")[1];

  return { base64, filename };
}
