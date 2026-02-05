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
  drawFirstPageHeader,
  drawSubsequentPageHeader,
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
  drawClosingText,
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
  startY: number,
  quote: QuoteData,
  showPrices: boolean
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
      yPos = drawSubsequentPageHeader(doc, quote, pageWidth, margin);
    }

    // Section header - centered with underline
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
      yPos = drawSpecsTable(doc, section, margin, pageWidth, yPos);
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
        // Group header row - bold text, no background
        tableBody.push([
          { content: "", styles: {} },
          { content: "", styles: {} },
          { content: line.group_title || line.description, styles: { fontStyle: "bold" } },
          { content: "", styles: {} },
          { content: "", styles: {} },
          { content: "", styles: {} },
          { content: "", styles: {} },
        ]);
      } else {
        lineNum++;
        
        // Main line
        tableBody.push([
          lineNum.toString(),
          line.article_code || "",
          line.description,
          formatDimension(line.height_mm),
          formatDimension(line.width_mm),
          line.quantity?.toString() || "1",
          showPrices ? formatCurrency(line.line_total) : "",
        ]);

        // Extra description on new line (indented)
        if (line.extra_description) {
          const extraLines = line.extra_description.split('\n');
          extraLines.forEach(extraLine => {
            tableBody.push([
              { content: "", styles: {} },
              { content: "", styles: {} },
              { content: extraLine, styles: { fontSize: 8, textColor: COLORS.subText } },
              { content: "", styles: {} },
              { content: "", styles: {} },
              { content: "", styles: {} },
              { content: "", styles: {} },
            ]);
          });
        }

        // Sub-lines with .1, .2 numbering
        const subLines = subLinesMap.get(line.id) || [];
        subLines.forEach((subLine) => {
          tableBody.push([
            { content: subLine.sub_line_number || ".", styles: { fontSize: 8 } },
            { content: subLine.article_code || "", styles: { fontSize: 8 } },
            { content: subLine.description, styles: { fontSize: 8 } },
            { content: "", styles: { fontSize: 8 } },
            { content: "", styles: { fontSize: 8 } },
            { content: subLine.quantity?.toString() || "1", styles: { fontSize: 8 } },
            { content: showPrices ? formatCurrency(subLine.line_total) : "", styles: { fontSize: 8 } },
          ]);

          // Sub-line extra description
          if (subLine.extra_description) {
            const extraLines = subLine.extra_description.split('\n');
            extraLines.forEach(extraLine => {
              tableBody.push([
                { content: "", styles: {} },
                { content: "", styles: {} },
                { content: extraLine, styles: { fontSize: 7, textColor: COLORS.subText, cellPadding: { left: 4 } } },
                { content: "", styles: {} },
                { content: "", styles: {} },
                { content: "", styles: {} },
                { content: "", styles: {} },
              ]);
            });
          }
        });
      }
    });

    if (tableBody.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [["no", "code", "omschrijving", "hg", "br", "aantal", showPrices ? "bedrag" : ""]],
        body: tableBody,
        margin: { left: margin, right: margin },
        theme: "plain", // No cell borders
        styles: {
          fontSize: 9,
          cellPadding: 1.5,
          textColor: COLORS.text,
          lineWidth: 0,
          overflow: "linebreak",
        },
        headStyles: {
          fontStyle: "bold",
          fontSize: 9,
          textColor: COLORS.text,
          lineWidth: { bottom: 0.2 },
          lineColor: COLORS.text,
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "left" },
          1: { cellWidth: 22 },
          2: { cellWidth: "auto" },
          3: { cellWidth: 12, halign: "center" },
          4: { cellWidth: 12, halign: "center" },
          5: { cellWidth: 15, halign: "center" },
          6: { cellWidth: 25, halign: "right" },
        },
        didDrawPage: (data) => {
          // Draw header on new pages created by the table
          if (data.pageNumber > 1) {
            drawSubsequentPageHeader(doc, quote, pageWidth, margin);
          }
        },
      });

      yPos = (doc as any).lastAutoTable?.finalY || yPos + 20;
    }

    // Section subtotal with discount
    const sectionTotal = lines.reduce((sum, line) => sum + (line.line_total || 0), 0);
    const sectionDiscount = section.discount_amount || 0;
    const sectionNet = sectionTotal - sectionDiscount;

    if (showPrices) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.text);

      if (sectionDiscount > 0) {
        doc.text(`Sectie subtotaal: ${formatCurrency(sectionTotal)}`, pageWidth - margin, yPos + 3, { align: "right" });
        yPos += 4;
        doc.text(`Korting: - ${formatCurrency(sectionDiscount)}`, pageWidth - margin, yPos + 3, { align: "right" });
        yPos += 4;
        doc.setFont("helvetica", "bold");
        doc.text(`Sectie totaal: ${formatCurrency(sectionNet)}`, pageWidth - margin, yPos + 3, { align: "right" });
      } else {
        doc.setFont("helvetica", "bold");
        doc.text(`Sectie totaal: ${formatCurrency(sectionNet)}`, pageWidth - margin, yPos + 3, { align: "right" });
      }
    }

    yPos += 12;
  });

  return yPos;
}

export function generateQuotePdf(quote: QuoteData, sections: SectionWithLines[]): void {
  const doc = createPdfDocument();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const showPrices = quote.show_prices !== false;

  // Page 1: Header with customer and company info
  let yPos = drawFirstPageHeader(doc, quote, pageWidth, margin);

  // Document title
  yPos = drawDocumentTitle(doc, "Offerte", pageWidth, margin, yPos);

  // Quote details grid
  yPos = drawQuoteDetails(doc, quote, margin, pageWidth, yPos);

  // Intro text
  yPos = drawIntroText(doc, quote, margin, pageWidth, yPos);

  // Sections with products
  yPos = renderSections(doc, sections, pageWidth, pageHeight, margin, yPos, quote, showPrices);

  // Check for new page before totals
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = drawSubsequentPageHeader(doc, quote, pageWidth, margin);
  }

  // Totals (only if showing prices)
  if (showPrices) {
    const totals = calculateTotals(sections, quote.discount_amount || 0);
    yPos = drawTotalsSection(doc, totals, pageWidth, margin, yPos);
  }

  // Payment terms
  yPos = drawPaymentTerms(doc, quote, margin, pageWidth, yPos);

  // Check for new page before conditions
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = drawSubsequentPageHeader(doc, quote, pageWidth, margin);
  }

  // Conditions
  yPos = drawConditions(doc, margin, pageWidth, yPos);

  // Check for new page before signatures
  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = drawSubsequentPageHeader(doc, quote, pageWidth, margin);
  }

  // Closing text
  yPos = drawClosingText(doc, margin, yPos);

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
  const showPrices = quote.show_prices !== false;

  // Page 1: Header with customer and company info
  let yPos = drawFirstPageHeader(doc, quote, pageWidth, margin);

  // Document title
  yPos = drawDocumentTitle(doc, "Offerte", pageWidth, margin, yPos);

  // Quote details grid
  yPos = drawQuoteDetails(doc, quote, margin, pageWidth, yPos);

  // Intro text
  yPos = drawIntroText(doc, quote, margin, pageWidth, yPos);

  // Sections with products
  yPos = renderSections(doc, sections, pageWidth, pageHeight, margin, yPos, quote, showPrices);

  // Check for new page before totals
  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = drawSubsequentPageHeader(doc, quote, pageWidth, margin);
  }

  // Totals (only if showing prices)
  if (showPrices) {
    const totals = calculateTotals(sections, quote.discount_amount || 0);
    yPos = drawTotalsSection(doc, totals, pageWidth, margin, yPos);
  }

  // Payment terms
  yPos = drawPaymentTerms(doc, quote, margin, pageWidth, yPos);

  // Check for new page before conditions
  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = drawSubsequentPageHeader(doc, quote, pageWidth, margin);
  }

  // Conditions
  yPos = drawConditions(doc, margin, pageWidth, yPos);

  // Check for new page before signatures
  if (yPos > pageHeight - 50) {
    doc.addPage();
    yPos = drawSubsequentPageHeader(doc, quote, pageWidth, margin);
  }

  // Closing text
  yPos = drawClosingText(doc, margin, yPos);

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
