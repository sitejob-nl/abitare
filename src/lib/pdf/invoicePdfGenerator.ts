import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ===== TYPES =====
export interface InvoiceData {
  order_number: number;
  order_date: string | null;
  payment_condition: string | null;
  invoice_type: string | null;
  parent_order_number: number | null;
  total_excl_vat: number | null;
  total_vat: number | null;
  total_incl_vat: number | null;
  amount_paid: number | null;
  payment_status: string | null;
  customer: {
    salutation?: string | null;
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
  } | null;
}

export interface InvoiceLine {
  description: string;
  article_code?: string | null;
  quantity: number | null;
  unit?: string | null;
  unit_price: number | null;
  discount_percentage?: number | null;
  line_total: number | null;
  vat_rate: number | null;
  is_group_header?: boolean;
  group_title?: string | null;
  section_type?: string | null;
}

export interface InvoiceSection {
  title: string | null;
  section_type: string;
  sort_order: number | null;
  subtotal: number | null;
  discount_percentage?: number | null;
  discount_amount?: number | null;
  discount_description?: string | null;
}

// ===== CONSTANTS =====
const COLORS = {
  text: [0, 0, 0] as [number, number, number],
  subText: [80, 80, 80] as [number, number, number],
  flagGreen: [0, 140, 69] as [number, number, number],
  flagRed: [205, 33, 42] as [number, number, number],
  accent: [0, 100, 180] as [number, number, number],
};

const INVOICE_TYPE_LABELS: Record<string, string> = {
  standaard: "Factuur",
  aanbetaling: "Aanbetalingsfactuur",
  restbetaling: "Factuur restbetaling",
  meerwerk: "Factuur meerwerk",
  creditnota: "Creditnota",
};

// ===== HELPERS =====
function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "€ 0,00";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(value);
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("nl-NL", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function getCustomerName(customer: InvoiceData["customer"]): string {
  if (!customer) return "Onbekend";
  if (customer.company_name) return customer.company_name;
  return [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Onbekend";
}

function getCustomerSalutation(customer: InvoiceData["customer"]): string {
  if (!customer) return "";
  return [customer.salutation, customer.first_name, customer.last_name].filter(Boolean).join(" ");
}

// ===== DRAW FUNCTIONS =====

function drawLogo(doc: jsPDF, x: number, y: number): number {
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("ABITARE", x, y, { align: "right" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("keuken en interieurarchitectuur", x, y + 4, { align: "right" });
  doc.text("-meubelen-verlichting-vloeren-sanitair-", x, y + 7, { align: "right" });

  return y + 10;
}

function drawHeader(
  doc: jsPDF, invoice: InvoiceData, pageWidth: number, margin: number
): number {
  let yPos = margin;
  const rightX = pageWidth - margin;

  // Right side: Logo + company info
  drawLogo(doc, rightX, yPos);
  let companyY = yPos + 12;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);
  doc.text("Jacob Romenweg 5", rightX, companyY, { align: "right" });
  companyY += 3.5;
  doc.text("6042 EZ Roermond", rightX, companyY, { align: "right" });
  companyY += 5;
  doc.text("Tel Roermond: 0475 - 46 11 26", rightX, companyY, { align: "right" });
  companyY += 3.5;
  doc.text("Tel Geleen: 046 - 474 24 33", rightX, companyY, { align: "right" });
  companyY += 3.5;
  doc.text("Email: info@italiaanse-design-keukens.nl", rightX, companyY, { align: "right" });
  companyY += 3.5;
  doc.text("www.italiaanse-design-keukens.nl", rightX, companyY, { align: "right" });
  companyY += 5;
  doc.text("BTW: NL860907104B01", rightX, companyY, { align: "right" });
  companyY += 3.5;
  doc.text("Bank: ING BANK N.V.", rightX, companyY, { align: "right" });
  companyY += 3.5;
  doc.text("IBAN: NL09INGB0005024907", rightX, companyY, { align: "right" });
  companyY += 3.5;
  doc.text("BIC: INGBNL2A", rightX, companyY, { align: "right" });
  companyY += 3.5;
  doc.text("KvK: 77721799", rightX, companyY, { align: "right" });

  // Left side: Customer address
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const customerName = getCustomerSalutation(invoice.customer) || getCustomerName(invoice.customer);
  doc.text(customerName, margin, yPos);
  yPos += 5;

  if (invoice.customer?.street_address) {
    doc.text(invoice.customer.street_address, margin, yPos);
    yPos += 5;
  }

  if (invoice.customer?.postal_code || invoice.customer?.city) {
    doc.text(
      [invoice.customer?.postal_code, invoice.customer?.city].filter(Boolean).join(" "),
      margin, yPos
    );
    yPos += 5;
  }

  return Math.max(yPos, companyY) + 8;
}

function drawSubsequentHeader(
  doc: jsPDF, invoice: InvoiceData, pageWidth: number, margin: number
): number {
  const yPos = margin;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);
  doc.text(`Factuurnummer ${invoice.order_number}`, margin, yPos);
  doc.text(formatDate(invoice.order_date), margin, yPos + 5);
  drawLogo(doc, pageWidth - margin, yPos);
  return yPos + 15;
}

function drawTitle(
  doc: jsPDF, invoice: InvoiceData, pageWidth: number, margin: number, yPos: number
): number {
  const typeLabel = INVOICE_TYPE_LABELS[invoice.invoice_type || "standaard"] || "Factuur";

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text(typeLabel, margin, yPos);

  yPos += 2;
  doc.setDrawColor(...COLORS.text);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  return yPos + 8;
}

function drawInvoiceDetails(
  doc: jsPDF, invoice: InvoiceData, margin: number, pageWidth: number, yPos: number
): number {
  const details: [string, string][] = [
    ["Factuurnummer:", `${invoice.order_number}`],
    ["Factuurdatum:", formatDate(invoice.order_date)],
  ];

  if (invoice.payment_condition) {
    details.push(["Betaaltermijn:", invoice.payment_condition]);
  }

  if (invoice.parent_order_number) {
    details.push(["Behorend bij order:", `#${invoice.parent_order_number}`]);
  }

  doc.setFontSize(9);
  const labelX = margin;
  const valueX = margin + 45;

  details.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.text);
    doc.text(label, labelX, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(value, valueX, yPos);
    yPos += 5;
  });

  return yPos + 4;
}

function drawLinesTable(
  doc: jsPDF,
  lines: InvoiceLine[],
  sections: InvoiceSection[],
  margin: number,
  pageWidth: number,
  yPos: number,
  invoice: InvoiceData
): number {
  const tableBody: (string | { content: string; styles?: object })[][] = [];
  let lineNum = 0;

  const sectionOrder = [...sections].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  if (sectionOrder.length > 0) {
    for (const section of sectionOrder) {
      tableBody.push([
        { content: "", styles: {} },
        { content: section.title || section.section_type, styles: { fontStyle: "bold" } },
        { content: "", styles: {} },
        { content: "", styles: {} },
        { content: "", styles: {} },
      ]);

      const sectionLines = lines.filter((l) => l.section_type === section.section_type);
      for (const line of sectionLines) {
        if (line.is_group_header) continue;
        lineNum++;
        tableBody.push([
          lineNum.toString(),
          line.description,
          (line.quantity || 1).toString(),
          formatCurrency(line.unit_price),
          formatCurrency(line.line_total),
        ]);
      }

      if (section.discount_amount && section.discount_amount > 0) {
        tableBody.push([
          { content: "", styles: {} },
          { content: `Korting: ${section.discount_description || ""}`, styles: { fontSize: 8, textColor: COLORS.subText } },
          { content: "", styles: {} },
          { content: "", styles: {} },
          { content: `- ${formatCurrency(section.discount_amount)}`, styles: { fontSize: 8 } },
        ]);
      }
    }
  } else {
    for (const line of lines) {
      if (line.is_group_header) {
        tableBody.push([
          { content: "", styles: {} },
          { content: line.group_title || line.description, styles: { fontStyle: "bold" } },
          { content: "", styles: {} },
          { content: "", styles: {} },
          { content: "", styles: {} },
        ]);
      } else {
        lineNum++;
        tableBody.push([
          lineNum.toString(),
          line.description,
          (line.quantity || 1).toString(),
          formatCurrency(line.unit_price),
          formatCurrency(line.line_total),
        ]);
      }
    }
  }

  if (tableBody.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [["#", "Omschrijving", "Aantal", "Stukprijs", "Bedrag"]],
      body: tableBody,
      margin: { left: margin, right: margin },
      theme: "plain",
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
        0: { cellWidth: 12, halign: "left" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: 28, halign: "right" },
        4: { cellWidth: 28, halign: "right" },
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          drawSubsequentHeader(doc, invoice, pageWidth, margin);
        }
      },
    });

    yPos = (doc as any).lastAutoTable?.finalY || yPos + 20;
  }

  return yPos + 6;
}

function drawTotals(
  doc: jsPDF,
  invoice: InvoiceData,
  pageWidth: number,
  margin: number,
  yPos: number
): number {
  doc.setDrawColor(...COLORS.text);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  const labelX = pageWidth - margin - 70;
  const valueX = pageWidth - margin;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);

  doc.text("Subtotaal excl. BTW:", labelX, yPos);
  doc.text(formatCurrency(invoice.total_excl_vat), valueX, yPos, { align: "right" });
  yPos += 5;

  doc.text("BTW 21%:", labelX, yPos);
  doc.text(formatCurrency(invoice.total_vat), valueX, yPos, { align: "right" });
  yPos += 5;

  // Double line
  doc.setLineWidth(0.3);
  doc.line(labelX, yPos - 1, valueX, yPos - 1);
  doc.line(labelX, yPos + 1, valueX, yPos + 1);
  yPos += 6;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Totaal incl. BTW:", labelX, yPos);
  doc.text(formatCurrency(invoice.total_incl_vat), valueX, yPos, { align: "right" });
  yPos += 8;

  // Payment info
  const amountPaid = invoice.amount_paid || 0;
  if (amountPaid > 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Reeds betaald:", labelX, yPos);
    doc.text(formatCurrency(amountPaid), valueX, yPos, { align: "right" });
    yPos += 5;

    const remaining = (invoice.total_incl_vat || 0) - amountPaid;
    doc.setFont("helvetica", "bold");
    doc.text("Nog te voldoen:", labelX, yPos);
    doc.text(formatCurrency(remaining), valueX, yPos, { align: "right" });
    yPos += 5;
  }

  return yPos + 6;
}

function drawPaymentInfo(
  doc: jsPDF, invoice: InvoiceData, margin: number, pageWidth: number, yPos: number
): number {
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("Betaalinformatie:", margin, yPos);
  yPos += 5;

  doc.setFont("helvetica", "normal");
  const paymentLines = [
    `Gelieve het bedrag van ${formatCurrency(invoice.total_incl_vat)} binnen ${invoice.payment_condition || "14 dagen"} over te maken op:`,
    "",
    "IBAN: NL09INGB0005024907",
    "BIC: INGBNL2A",
    "t.n.v. Abitare B.V.",
    `o.v.v. Factuurnummer ${invoice.order_number}`,
  ];

  paymentLines.forEach((line) => {
    doc.text(line, margin, yPos);
    yPos += line === "" ? 2 : 4;
  });

  return yPos + 6;
}

function drawFooter(
  doc: jsPDF, pageWidth: number, pageHeight: number, margin: number,
  pageNumber: number, totalPages: number
): void {
  const footerY = pageHeight - 12;

  // Italian flag
  doc.setFillColor(...COLORS.flagGreen);
  doc.rect(pageWidth - margin - 50, footerY, 12, 2.5, "F");
  doc.setFillColor(...COLORS.flagRed);
  doc.rect(pageWidth - margin - 35, footerY, 12, 2.5, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.subText);
  doc.text(`Pagina ${pageNumber} van ${totalPages}`, pageWidth - margin, footerY + 6, { align: "right" });
}

// ===== MAIN EXPORT =====

export function generateInvoicePdf(
  invoice: InvoiceData,
  lines: InvoiceLine[],
  sections: InvoiceSection[] = []
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  let yPos = drawHeader(doc, invoice, pageWidth, margin);
  yPos = drawTitle(doc, invoice, pageWidth, margin, yPos);
  yPos = drawInvoiceDetails(doc, invoice, margin, pageWidth, yPos);
  yPos = drawLinesTable(doc, lines, sections, margin, pageWidth, yPos, invoice);

  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = drawSubsequentHeader(doc, invoice, pageWidth, margin);
  }

  yPos = drawTotals(doc, invoice, pageWidth, margin, yPos);

  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = drawSubsequentHeader(doc, invoice, pageWidth, margin);
  }

  yPos = drawPaymentInfo(doc, invoice, margin, pageWidth, yPos);

  // Closing
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);
  doc.text("Met vriendelijke groet,", margin, yPos);
  yPos += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Abitare keuken en interieurarchitectuur", margin, yPos);

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, pageWidth, pageHeight, margin, i, totalPages);
  }

  const typePrefix = INVOICE_TYPE_LABELS[invoice.invoice_type || "standaard"] || "Factuur";
  const customerName = getCustomerName(invoice.customer).replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`${typePrefix}_${invoice.order_number}_${customerName}.pdf`);
}

export function generateInvoicePdfBase64(
  invoice: InvoiceData,
  lines: InvoiceLine[],
  sections: InvoiceSection[] = []
): { base64: string; filename: string } {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  let yPos = drawHeader(doc, invoice, pageWidth, margin);
  yPos = drawTitle(doc, invoice, pageWidth, margin, yPos);
  yPos = drawInvoiceDetails(doc, invoice, margin, pageWidth, yPos);
  yPos = drawLinesTable(doc, lines, sections, margin, pageWidth, yPos, invoice);

  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = drawSubsequentHeader(doc, invoice, pageWidth, margin);
  }

  yPos = drawTotals(doc, invoice, pageWidth, margin, yPos);

  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = drawSubsequentHeader(doc, invoice, pageWidth, margin);
  }

  yPos = drawPaymentInfo(doc, invoice, margin, pageWidth, yPos);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);
  doc.text("Met vriendelijke groet,", margin, yPos);
  yPos += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Abitare keuken en interieurarchitectuur", margin, yPos);

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(doc, pageWidth, pageHeight, margin, i, totalPages);
  }

  const typePrefix = INVOICE_TYPE_LABELS[invoice.invoice_type || "standaard"] || "Factuur";
  const customerName = getCustomerName(invoice.customer).replace(/[^a-zA-Z0-9]/g, "_");
  const filename = `${typePrefix}_${invoice.order_number}_${customerName}.pdf`;
  const base64 = doc.output("datauristring").split(",")[1];

  return { base64, filename };
}
