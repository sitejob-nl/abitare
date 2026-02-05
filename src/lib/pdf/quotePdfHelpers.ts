import jsPDF from "jspdf";
import { QuoteSection } from "@/hooks/useQuoteSections";
import { QuoteLine } from "@/hooks/useQuoteLines";

// ===== TYPES =====
export interface QuoteData {
  quote_number: number;
  quote_date: string | null;
  valid_until: string | null;
  payment_terms_description?: string | null;
  discount_amount?: number | null;
  discount_description?: string | null;
  salesperson_id?: string | null;
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
    mobile?: string | null;
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

export interface SectionWithLines extends QuoteSection {
  quote_lines: QuoteLine[];
}

// ===== CONSTANTS =====
export const SECTION_TYPE_LABELS: Record<string, string> = {
  meubelen: "Meubelen",
  apparatuur: "Apparatuur/Accessoires",
  werkbladen: "Werkblad(en)",
  montage: "Montage",
  transport: "Transport",
  overig: "Overig",
};

// Colors matching the template
export const COLORS = {
  text: [51, 51, 51] as [number, number, number],
  subText: [102, 102, 102] as [number, number, number],
  sectionBg: [240, 240, 240] as [number, number, number],
  sectionBorder: [51, 51, 51] as [number, number, number],
  tableHeaderBg: [245, 245, 245] as [number, number, number],
  tableBorder: [221, 221, 221] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  notesBg: [255, 253, 231] as [number, number, number],
  notesBorder: [255, 213, 79] as [number, number, number],
};

// ===== FORMATTERS =====
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "€ 0,00";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDimension(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return Math.round(value / 10).toString();
}

export function getCustomerName(customer: QuoteData["customer"]): string {
  if (!customer) return "Onbekend";
  if (customer.company_name) return customer.company_name;
  return [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Onbekend";
}

export function getCustomerSalutation(customer: QuoteData["customer"]): string {
  if (!customer) return "";
  const parts: string[] = [];
  if (customer.salutation) parts.push(customer.salutation);
  if (customer.first_name) parts.push(customer.first_name);
  if (customer.last_name) parts.push(customer.last_name);
  return parts.join(" ");
}

// ===== DRAWING HELPERS =====
export function drawHeader(
  doc: jsPDF,
  quote: QuoteData,
  pageWidth: number,
  margin: number
): number {
  let yPos = margin;

  // Customer address (left side)
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const customerName = getCustomerSalutation(quote.customer) || getCustomerName(quote.customer);
  doc.text(customerName, margin, yPos);
  yPos += 5;

  if (quote.customer?.street_address) {
    doc.text(quote.customer.street_address, margin, yPos);
    yPos += 5;
  }

  if (quote.customer?.postal_code || quote.customer?.city) {
    doc.text(
      [quote.customer?.postal_code, quote.customer?.city].filter(Boolean).join(" "),
      margin,
      yPos
    );
    yPos += 5;
  }

  // Company info (right side)
  const companyX = pageWidth - margin;
  let companyY = margin;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("ABITARE", companyX, companyY, { align: "right" });
  companyY += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("keuken en interieurarchitectuur", companyX, companyY, { align: "right" });
  companyY += 4;
  doc.text("-meubelen-verlichting-vloeren-sanitair-", companyX, companyY, { align: "right" });
  companyY += 5;

  // Company address
  const divisionAddress = quote.division?.address || "Stadsweide 35b";
  const divisionPostalCity = [
    quote.division?.postal_code || "6041 TD",
    quote.division?.city || "Roermond"
  ].filter(Boolean).join(" ");

  doc.text(divisionAddress, companyX, companyY, { align: "right" });
  companyY += 4;
  doc.text(divisionPostalCity, companyX, companyY, { align: "right" });
  companyY += 5;

  // Contact info
  doc.text("Tel Roermond: 0475 - 46 11 26", companyX, companyY, { align: "right" });
  companyY += 4;
  doc.text("Tel Geleen: 046 - 474 24 33", companyX, companyY, { align: "right" });
  companyY += 4;

  const email = quote.division?.email || "info@abitare.nl";
  doc.text(`Email: ${email}`, companyX, companyY, { align: "right" });
  companyY += 4;
  doc.text("www.abitare.nl", companyX, companyY, { align: "right" });
  companyY += 5;

  // Bank details
  doc.text("BTW: NL807851917B01", companyX, companyY, { align: "right" });
  companyY += 4;
  doc.text("Bank: ING Bank", companyX, companyY, { align: "right" });
  companyY += 4;
  doc.text("IBAN: NL59INGB0006623053", companyX, companyY, { align: "right" });
  companyY += 4;
  doc.text("BIC: INGBNL2A", companyX, companyY, { align: "right" });
  companyY += 4;
  doc.text("KvK: 13029988", companyX, companyY, { align: "right" });

  return Math.max(yPos, companyY) + 10;
}

export function drawDocumentTitle(
  doc: jsPDF,
  title: string,
  pageWidth: number,
  margin: number,
  yPos: number
): number {
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text(title, margin, yPos);

  // Thick black line under title
  yPos += 3;
  doc.setDrawColor(...COLORS.sectionBorder);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  return yPos + 10;
}

export function drawQuoteDetails(
  doc: jsPDF,
  quote: QuoteData,
  margin: number,
  yPos: number
): number {
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);

  const labelX = margin;
  const valueX = margin + 45;
  const col2LabelX = margin + 100;
  const col2ValueX = margin + 145;
  const lineHeight = 5;

  // Column 1
  doc.text("Offertenummer:", labelX, yPos);
  doc.text(quote.quote_number.toString(), valueX, yPos);

  doc.text("Telefoon klant:", col2LabelX, yPos);
  doc.text(quote.customer?.phone || quote.customer?.mobile || "-", col2ValueX, yPos);
  yPos += lineHeight;

  doc.text("Datum offerte:", labelX, yPos);
  doc.text(formatDate(quote.quote_date), valueX, yPos);

  doc.text("Email-adres:", col2LabelX, yPos);
  const email = quote.customer?.email || "-";
  doc.text(email.length > 30 ? email.substring(0, 27) + "..." : email, col2ValueX, yPos);
  yPos += lineHeight;

  doc.text("Datum afdruk:", labelX, yPos);
  doc.text(formatDate(new Date().toISOString()), valueX, yPos);
  yPos += lineHeight;

  doc.text("Geldig tot:", labelX, yPos);
  doc.text(formatDate(quote.valid_until), valueX, yPos);
  yPos += lineHeight;

  return yPos + 10;
}

export function drawSectionHeader(
  doc: jsPDF,
  title: string,
  pageWidth: number,
  margin: number,
  yPos: number
): number {
  // Gray background
  const sectionWidth = pageWidth - margin * 2;
  doc.setFillColor(...COLORS.sectionBg);
  doc.rect(margin, yPos - 5, sectionWidth, 8, "F");

  // Black left border
  doc.setFillColor(...COLORS.sectionBorder);
  doc.rect(margin, yPos - 5, 2, 8, "F");

  // Section title
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text(title, margin + 6, yPos);

  return yPos + 8;
}

export function drawSpecsTable(
  doc: jsPDF,
  section: SectionWithLines,
  margin: number,
  yPos: number
): number {
  const specs: { label: string; value: string }[][] = [];

  // Build spec pairs (left and right columns)
  const leftSpecs: { label: string; value: string }[] = [];
  const rightSpecs: { label: string; value: string }[] = [];

  if (section.front_number) leftSpecs.push({ label: "Frontnummer:", value: section.front_number });
  if (section.front_color) leftSpecs.push({ label: "Kleur front:", value: section.front_color });
  if (section.corpus_color) leftSpecs.push({ label: "Corpuskleur:", value: section.corpus_color });
  if (section.handle_number) leftSpecs.push({ label: "Greepnummer:", value: section.handle_number });
  if (section.workbench_material) leftSpecs.push({ label: "Uitvoering:", value: section.workbench_material });
  if (section.workbench_edge) leftSpecs.push({ label: "Randafwerking:", value: section.workbench_edge });

  if (section.plinth_color) rightSpecs.push({ label: "Plintkleur:", value: section.plinth_color });
  if (section.column_height_mm) rightSpecs.push({ label: "Kolomkast hoogte:", value: `${section.column_height_mm} mm` });
  if (section.hinge_color) rightSpecs.push({ label: "Scharnier kleur:", value: section.hinge_color });
  if (section.drawer_color) rightSpecs.push({ label: "Lade kleur:", value: section.drawer_color });
  if (section.countertop_height_mm) rightSpecs.push({ label: "Aanrecht hoogte:", value: `${section.countertop_height_mm} mm` });
  if (section.countertop_thickness_mm) rightSpecs.push({ label: "Blad dikte:", value: `${section.countertop_thickness_mm} mm` });
  if (section.workbench_color) rightSpecs.push({ label: "Kleur:", value: section.workbench_color });

  const maxRows = Math.max(leftSpecs.length, rightSpecs.length);
  if (maxRows === 0) return yPos;

  doc.setFontSize(9);
  const labelX1 = margin;
  const valueX1 = margin + 35;
  const labelX2 = margin + 90;
  const valueX2 = margin + 125;

  for (let i = 0; i < maxRows; i++) {
    if (leftSpecs[i]) {
      doc.setFont("helvetica", "bold");
      doc.text(leftSpecs[i].label, labelX1, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(leftSpecs[i].value, valueX1, yPos);
    }
    if (rightSpecs[i]) {
      doc.setFont("helvetica", "bold");
      doc.text(rightSpecs[i].label, labelX2, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(rightSpecs[i].value, valueX2, yPos);
    }
    yPos += 5;
  }

  return yPos + 3;
}

export function drawIntroText(
  doc: jsPDF,
  margin: number,
  pageWidth: number,
  yPos: number
): number {
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);

  doc.text("Geachte heer/mevrouw,", margin, yPos);
  yPos += 6;

  const introText = "Hierbij ontvangt u onze offerte voor de levering van goederen volgens onderstaande specificatie.";
  const splitIntro = doc.splitTextToSize(introText, pageWidth - margin * 2);
  doc.text(splitIntro, margin, yPos);
  yPos += splitIntro.length * 5;

  doc.text("Wij zullen uw opdracht met de grootst mogelijke zorg uitvoeren.", margin, yPos);

  return yPos + 10;
}

export function calculateTotals(
  sections: SectionWithLines[],
  quoteDiscount: number
): {
  subtotalProducts: number;
  subtotalMontage: number;
  discountAmount: number;
  subtotalExclVat: number;
  totalVat: number;
  totalInclVat: number;
} {
  let subtotalProducts = 0;
  let subtotalMontage = 0;

  sections.forEach((section) => {
    const sectionTotal = section.quote_lines?.reduce(
      (sum, line) => sum + (line.line_total || 0),
      0
    ) || 0;

    // Apply section discount
    const sectionDiscount = section.discount_amount || 0;
    const sectionNet = sectionTotal - sectionDiscount;

    if (section.section_type === "montage") {
      subtotalMontage += sectionNet;
    } else {
      subtotalProducts += sectionNet;
    }
  });

  const discountAmount = quoteDiscount;
  const subtotalExclVat = subtotalProducts + subtotalMontage - discountAmount;
  const totalVat = subtotalExclVat * 0.21;
  const totalInclVat = subtotalExclVat + totalVat;

  return {
    subtotalProducts,
    subtotalMontage,
    discountAmount,
    subtotalExclVat,
    totalVat,
    totalInclVat,
  };
}

export function drawTotalsSection(
  doc: jsPDF,
  totals: ReturnType<typeof calculateTotals>,
  pageWidth: number,
  margin: number,
  yPos: number
): number {
  // Draw top border
  doc.setDrawColor(...COLORS.sectionBorder);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  const labelX = pageWidth - margin - 80;
  const valueX = pageWidth - margin;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);

  // Subtotals
  doc.text("Subtotaal producten:", labelX, yPos);
  doc.text(formatCurrency(totals.subtotalProducts), valueX, yPos, { align: "right" });
  yPos += 6;

  if (totals.subtotalMontage > 0) {
    doc.text("Subtotaal montage:", labelX, yPos);
    doc.text(formatCurrency(totals.subtotalMontage), valueX, yPos, { align: "right" });
    yPos += 6;
  }

  if (totals.discountAmount > 0) {
    doc.text("Korting:", labelX, yPos);
    doc.text(`- ${formatCurrency(totals.discountAmount)}`, valueX, yPos, { align: "right" });
    yPos += 6;
  }

  // Separator line
  doc.setLineWidth(0.3);
  doc.line(labelX, yPos, valueX, yPos);
  yPos += 6;

  doc.text("Subtotaal excl. BTW:", labelX, yPos);
  doc.text(formatCurrency(totals.subtotalExclVat), valueX, yPos, { align: "right" });
  yPos += 6;

  doc.text("BTW 21%:", labelX, yPos);
  doc.text(formatCurrency(totals.totalVat), valueX, yPos, { align: "right" });
  yPos += 8;

  // Double line before total
  doc.setLineWidth(0.5);
  doc.line(labelX, yPos - 2, valueX, yPos - 2);
  doc.line(labelX, yPos, valueX, yPos);
  yPos += 6;

  // Final total
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Totaal incl. BTW:", labelX, yPos);
  doc.text(formatCurrency(totals.totalInclVat), valueX, yPos, { align: "right" });

  return yPos + 15;
}

export function drawPaymentTerms(
  doc: jsPDF,
  quote: QuoteData,
  margin: number,
  pageWidth: number,
  yPos: number
): number {
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("Betalingsvoorwaarden:", margin, yPos);
  yPos += 5;

  doc.setFont("helvetica", "normal");
  const terms = quote.payment_terms_description || "25% aanbetaling bij akkoord, 75% voor levering";
  const splitTerms = doc.splitTextToSize(terms, pageWidth - margin * 2);
  doc.text(splitTerms, margin, yPos);

  return yPos + splitTerms.length * 4 + 8;
}

export function drawConditions(
  doc: jsPDF,
  margin: number,
  pageWidth: number,
  yPos: number
): number {
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.subText);

  const conditions = [
    "Levering:",
    "- Onze leveringen zijn franco werk indien niet anders vermeld, exclusief verticaal transport tenzij uitdrukkelijk vermeld en opgenomen.",
    "",
    "Levertijd:",
    "- Circa 14 werkweken na afroep uwerzijds of indien de montage datum is ingepland is de levertijd niet van toepassing.",
    "",
    "Garantie:",
    "- De garantie volgens de leverancier ten behoeve van keuken meubelen, werkbladen en apparatuur conform garantievoorwaarden fabrikant.",
    "",
    "Op deze overeenkomst zijn de Algemene Voorwaarden volgens CBW-erkend van toepassing.",
  ];

  conditions.forEach((line) => {
    if (line === "") {
      yPos += 3;
    } else if (line.endsWith(":")) {
      doc.setFont("helvetica", "bold");
      doc.text(line, margin, yPos);
      doc.setFont("helvetica", "normal");
      yPos += 4;
    } else {
      const splitLine = doc.splitTextToSize(line, pageWidth - margin * 2);
      doc.text(splitLine, margin, yPos);
      yPos += splitLine.length * 3.5;
    }
  });

  return yPos + 8;
}

export function drawSignatures(
  doc: jsPDF,
  quote: QuoteData,
  margin: number,
  pageWidth: number,
  yPos: number
): number {
  const sigWidth = (pageWidth - margin * 2 - 20) / 2;

  doc.setDrawColor(...COLORS.sectionBorder);
  doc.setLineWidth(0.3);

  // Left signature
  doc.line(margin, yPos, margin + sigWidth, yPos);
  yPos += 4;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.subText);
  doc.text("Akkoord Abitare:", margin, yPos);

  // Right signature
  doc.line(pageWidth - margin - sigWidth, yPos - 4, pageWidth - margin, yPos - 4);
  doc.text("Voor akkoord klant:", pageWidth - margin - sigWidth, yPos);

  yPos += 4;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("Abitare B.V.", margin, yPos);

  const customerName = getCustomerSalutation(quote.customer) || getCustomerName(quote.customer);
  doc.text(customerName, pageWidth - margin - sigWidth, yPos);

  return yPos + 15;
}

export function drawFooter(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  pageNumber: number,
  totalPages: number
): void {
  const footerY = pageHeight - 10;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.subText);

  doc.text("Met vriendelijke groet,", margin, footerY - 8);
  doc.setFont("helvetica", "bold");
  doc.text("Abitare keuken en bad architectuur", margin, footerY - 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Pagina ${pageNumber} van ${totalPages}`, pageWidth - margin, footerY, { align: "right" });
}
