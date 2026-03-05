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
    delivery_street_address?: string | null;
    delivery_postal_code?: string | null;
    delivery_city?: string | null;
    delivery_floor?: string | null;
  } | null;
  division?: {
    name?: string | null;
    address?: string | null;
    postal_code?: string | null;
    city?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  // Extra optional fields
  advisor_name?: string | null;
  show_prices?: boolean;
  show_line_prices?: boolean;
  show_article_codes?: boolean;
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

// Colors matching the exact Abitare template
export const COLORS = {
  text: [0, 0, 0] as [number, number, number],
  subText: [80, 80, 80] as [number, number, number],
  lightGray: [128, 128, 128] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  flagGreen: [0, 140, 69] as [number, number, number],
  flagRed: [205, 33, 42] as [number, number, number],
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

/**
 * Draw the Abitare logo text (since we can't embed SVG easily, we use styled text)
 */
export function drawLogo(
  doc: jsPDF,
  x: number,
  y: number,
  align: "left" | "right" = "right"
): number {
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text("ABITARE", x, y, { align });
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("keuken en interieurarchitectuur", x, y + 4, { align });
  doc.text("-meubelen-verlichting-vloeren-sanitair-", x, y + 7, { align });
  
  return y + 10;
}

/**
 * Draw header for page 1 - full customer info and company details
 */
export function drawFirstPageHeader(
  doc: jsPDF,
  quote: QuoteData,
  pageWidth: number,
  margin: number
): number {
  let yPos = margin;
  const rightX = pageWidth - margin;

  // === RIGHT SIDE: Logo + Company Info ===
  drawLogo(doc, rightX, yPos, "right");
  let companyY = yPos + 12;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);

  // Company address
  doc.text("Jacob Romenweg 5", rightX, companyY, { align: "right" });
  companyY += 3.5;
  doc.text("6042 EZ Roermond", rightX, companyY, { align: "right" });
  companyY += 5;

  // Contact info
  doc.text("Tel Roermond: 0475 - 46 11 26", rightX, companyY, { align: "right" });
  companyY += 3.5;
  doc.text("Tel Geleen: 046 - 474 24 33", rightX, companyY, { align: "right" });
  companyY += 3.5;
  doc.text("Email: info@italiaanse-design-keukens.nl", rightX, companyY, { align: "right" });
  companyY += 3.5;
  doc.text("www.italiaanse-design-keukens.nl", rightX, companyY, { align: "right" });
  companyY += 5;

  // Bank details
  doc.text("BTW: NL860907104B01", rightX, companyY, { align: "right" });
  companyY += 3.5;
  doc.text("Bank: ING BANK N.V.", rightX, companyY, { align: "right" });
  companyY += 3.5;
  doc.text("IBAN: NL09INGB0005024907", rightX, companyY, { align: "right" });
  companyY += 3.5;
  doc.text("BIC: INGBNL2A", rightX, companyY, { align: "right" });
  companyY += 3.5;
  doc.text("KvK: 77721799", rightX, companyY, { align: "right" });

  // === LEFT SIDE: Customer address ===
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);

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

  return Math.max(yPos, companyY) + 8;
}

/**
 * Draw header for subsequent pages - reference and date left, logo right
 */
export function drawSubsequentPageHeader(
  doc: jsPDF,
  quote: QuoteData,
  pageWidth: number,
  margin: number
): number {
  const yPos = margin;
  const rightX = pageWidth - margin;

  // Left side: Reference and date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);
  doc.text(`Referentie ${quote.quote_number}`, margin, yPos);
  doc.text(formatDate(quote.quote_date), margin, yPos + 5);

  // Right side: Logo
  drawLogo(doc, rightX, yPos, "right");

  return yPos + 15;
}

/**
 * Draw document title with underline
 */
export function drawDocumentTitle(
  doc: jsPDF,
  title: string,
  pageWidth: number,
  margin: number,
  yPos: number
): number {
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text(title, margin, yPos);

  // Thick black line under title
  yPos += 2;
  doc.setDrawColor(...COLORS.text);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  return yPos + 8;
}

/**
 * Draw quote details grid with delivery address
 */
export function drawQuoteDetails(
  doc: jsPDF,
  quote: QuoteData,
  margin: number,
  pageWidth: number,
  yPos: number
): number {
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.text);

  const col1LabelX = margin;
  const col1ValueX = margin + 35;
  const col2LabelX = pageWidth / 2 + 5;
  const col2ValueX = pageWidth / 2 + 40;
  const lineHeight = 4.5;

  // Row 1: Offertenummer + Afleveradres label
  doc.setFont("helvetica", "bold");
  doc.text("Offertenummer:", col1LabelX, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(quote.quote_number.toString(), col1ValueX, yPos);

  doc.setFont("helvetica", "bold");
  doc.text("Afleveradres:", col2LabelX, yPos);
  yPos += lineHeight;

  // Row 2: Datum offerte + Delivery salutation
  doc.setFont("helvetica", "bold");
  doc.text("Datum offerte:", col1LabelX, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(formatDate(quote.quote_date), col1ValueX, yPos);

  const deliverySalutation = getCustomerSalutation(quote.customer) || getCustomerName(quote.customer);
  doc.text(deliverySalutation, col2ValueX, yPos);
  yPos += lineHeight;

  // Row 3: Datum afdruk + Delivery street
  doc.setFont("helvetica", "bold");
  doc.text("Datum afdruk:", col1LabelX, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(formatDate(new Date().toISOString()), col1ValueX, yPos);

  const deliveryStreet = quote.customer?.delivery_street_address || quote.customer?.street_address || "";
  if (deliveryStreet) {
    doc.text(deliveryStreet, col2ValueX, yPos);
  }
  yPos += lineHeight;

  // Row 4: Adviseur + Delivery postal/city
  doc.setFont("helvetica", "bold");
  doc.text("Adviseur:", col1LabelX, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(quote.advisor_name || "-", col1ValueX, yPos);

  const deliveryPostal = quote.customer?.delivery_postal_code || quote.customer?.postal_code || "";
  const deliveryCity = quote.customer?.delivery_city || quote.customer?.city || "";
  if (deliveryPostal || deliveryCity) {
    doc.text([deliveryPostal, deliveryCity].filter(Boolean).join(" "), col2ValueX, yPos);
  }
  yPos += lineHeight;

  // Row 5: Telefoon klant + Tel
  doc.setFont("helvetica", "bold");
  doc.text("Telefoon klant:", col1LabelX, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(quote.customer?.phone || quote.customer?.mobile || "-", col1ValueX, yPos);

  doc.setFont("helvetica", "bold");
  doc.text("Tel.:", col2LabelX, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(quote.customer?.phone || quote.customer?.mobile || "-", col2ValueX, yPos);
  yPos += lineHeight;

  // Row 6: Email + Floor
  doc.setFont("helvetica", "bold");
  doc.text("Email-adres:", col1LabelX, yPos);
  doc.setFont("helvetica", "normal");
  const email = quote.customer?.email || "-";
  doc.text(email.length > 30 ? email.substring(0, 27) + "..." : email, col1ValueX, yPos);

  if (quote.customer?.delivery_floor) {
    doc.setFont("helvetica", "bold");
    doc.text("Verdieping:", col2LabelX, yPos);
    doc.setFont("helvetica", "normal");
    doc.text(quote.customer.delivery_floor, col2ValueX, yPos);
  }
  yPos += lineHeight;

  // Row 7: Geldig tot
  doc.setFont("helvetica", "bold");
  doc.text("Geldig tot:", col1LabelX, yPos);
  doc.setFont("helvetica", "normal");
  doc.text(formatDate(quote.valid_until), col1ValueX, yPos);

  return yPos + 10;
}

/**
 * Draw intro text for quote
 */
export function drawIntroText(
  doc: jsPDF,
  quote: QuoteData,
  margin: number,
  pageWidth: number,
  yPos: number
): number {
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);

  const customerName = getCustomerName(quote.customer);
  const salutation = quote.customer?.salutation ? `Geachte ${quote.customer.salutation.toLowerCase()} ${customerName},` : `Geachte heer/mevrouw ${customerName},`;
  doc.text(salutation, margin, yPos);
  yPos += 6;

  const introText = "Hierbij ontvangt u onze offerte voor de levering van goederen volgens onderstaande specificatie.";
  const splitIntro = doc.splitTextToSize(introText, pageWidth - margin * 2);
  doc.text(splitIntro, margin, yPos);
  yPos += splitIntro.length * 5;

  doc.text("Wij zullen uw opdracht met de grootst mogelijke zorg uitvoeren.", margin, yPos);

  return yPos + 10;
}

/**
 * Draw section header - centered bold text with underline
 */
export function drawSectionHeader(
  doc: jsPDF,
  title: string,
  pageWidth: number,
  margin: number,
  yPos: number
): number {
  // Centered bold title
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.text);
  doc.text(title, pageWidth / 2, yPos, { align: "center" });

  // Underline
  yPos += 2;
  doc.setDrawColor(...COLORS.text);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  return yPos + 6;
}

/**
 * Draw specs as 2-column text (not table) - matching exact Abitare format
 */
export function drawSpecsTable(
  doc: jsPDF,
  section: SectionWithLines,
  margin: number,
  pageWidth: number,
  yPos: number
): number {
  // Build spec pairs
  const leftSpecs: { label: string; value: string }[] = [];
  const rightSpecs: { label: string; value: string }[] = [];

  // Extract extra fields from configuration JSON
  const config = (section as any).configuration as Record<string, any> | null;
  const modelName = config?.model_name || config?.modelName;
  const gripColor = config?.grip_color || config?.gripColor;
  const frontTypeName = config?.front_type_name || config?.frontTypeName;

  if (modelName) leftSpecs.push({ label: "Model:", value: modelName });
  if (frontTypeName) leftSpecs.push({ label: "Fronttype:", value: frontTypeName });
  if (section.front_number) leftSpecs.push({ label: "Frontnummer:", value: section.front_number });
  if (section.front_color) leftSpecs.push({ label: "Kleur front:", value: section.front_color });
  if (section.corpus_color) leftSpecs.push({ label: "Corpuskleur:", value: section.corpus_color });
  if (section.handle_number) leftSpecs.push({ label: "Greepnummer:", value: section.handle_number });
  if (gripColor) leftSpecs.push({ label: "Kleur greep:", value: gripColor });
  if (section.workbench_material) leftSpecs.push({ label: "Uitvoering:", value: section.workbench_material });
  if (section.workbench_edge) leftSpecs.push({ label: "Randafwerking:", value: section.workbench_edge });

  if (section.plinth_color) rightSpecs.push({ label: "Plintkleur:", value: section.plinth_color });
  if (section.column_height_mm) rightSpecs.push({ label: "Kolomkast hoogte:", value: `${section.column_height_mm}` });
  if (section.hinge_color) rightSpecs.push({ label: "Scharnier kleur:", value: section.hinge_color });
  if (section.drawer_color) rightSpecs.push({ label: "Lade kleur:", value: section.drawer_color });
  if (section.countertop_height_mm) rightSpecs.push({ label: "Aanrecht hoogte:", value: `${section.countertop_height_mm}` });
  if (section.countertop_thickness_mm) rightSpecs.push({ label: "Blad dikte:", value: `${section.countertop_thickness_mm}` });
  if (section.workbench_color) rightSpecs.push({ label: "Kleur:", value: section.workbench_color });

  const maxRows = Math.max(leftSpecs.length, rightSpecs.length);
  if (maxRows === 0) return yPos;

  doc.setFontSize(9);
  const col1LabelX = margin;
  const col1ValueX = margin + 30;
  const col2LabelX = pageWidth / 2 + 5;
  const col2ValueX = pageWidth / 2 + 38;

  for (let i = 0; i < maxRows; i++) {
    if (leftSpecs[i]) {
      doc.setFont("helvetica", "bold");
      doc.text(leftSpecs[i].label, col1LabelX, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(leftSpecs[i].value, col1ValueX, yPos);
    }
    if (rightSpecs[i]) {
      doc.setFont("helvetica", "bold");
      doc.text(rightSpecs[i].label, col2LabelX, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(rightSpecs[i].value, col2ValueX, yPos);
    }
    yPos += 4.5;
  }

  return yPos + 3;
}

/**
 * Calculate totals from sections
 */
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
  vatBreakdown: { rate: number; base: number; vat: number }[];
} {
  let subtotalProducts = 0;
  let subtotalMontage = 0;
  const vatByRate = new Map<number, number>();

  sections.forEach((section) => {
    const sectionTotal = section.quote_lines?.reduce(
      (sum, line) => sum + (line.line_total || 0),
      0
    ) || 0;

    const sectionDiscount = section.discount_amount || 0;
    const sectionNet = sectionTotal - sectionDiscount;
    const discountFraction = sectionTotal > 0 ? sectionNet / sectionTotal : 1;

    // Accumulate VAT per rate
    section.quote_lines?.forEach((line) => {
      const rate = line.vat_rate ?? 21;
      const lineNetContribution = (line.line_total || 0) * discountFraction;
      vatByRate.set(rate, (vatByRate.get(rate) || 0) + lineNetContribution);
    });

    if (section.section_type === "montage") {
      subtotalMontage += sectionNet;
    } else {
      subtotalProducts += sectionNet;
    }
  });

  const discountAmount = quoteDiscount;
  const subtotalExclVat = subtotalProducts + subtotalMontage - discountAmount;
  const subtotalBeforeDiscount = subtotalProducts + subtotalMontage;
  const quoteFraction = subtotalBeforeDiscount > 0 ? subtotalExclVat / subtotalBeforeDiscount : 1;
  
  let totalVat = 0;
  const vatBreakdown: { rate: number; base: number; vat: number }[] = [];
  vatByRate.forEach((base, rate) => {
    const adjustedBase = base * quoteFraction;
    const vat = adjustedBase * (rate / 100);
    totalVat += vat;
    vatBreakdown.push({ rate, base: adjustedBase, vat });
  });
  const totalInclVat = subtotalExclVat + totalVat;

  return {
    subtotalProducts,
    subtotalMontage,
    discountAmount,
    subtotalExclVat,
    totalVat,
    totalInclVat,
    vatBreakdown,
  };
}

/**
 * Draw totals section
 */
export function drawTotalsSection(
  doc: jsPDF,
  totals: ReturnType<typeof calculateTotals>,
  pageWidth: number,
  margin: number,
  yPos: number
): number {
  // Top separator line
  doc.setDrawColor(...COLORS.text);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 8;

  const labelX = pageWidth - margin - 70;
  const valueX = pageWidth - margin;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);

  // Subtotals
  doc.text("Subtotaal producten:", labelX, yPos);
  doc.text(formatCurrency(totals.subtotalProducts), valueX, yPos, { align: "right" });
  yPos += 5;

  if (totals.subtotalMontage > 0) {
    doc.text("Subtotaal montage:", labelX, yPos);
    doc.text(formatCurrency(totals.subtotalMontage), valueX, yPos, { align: "right" });
    yPos += 5;
  }

  if (totals.discountAmount > 0) {
    doc.text("Korting:", labelX, yPos);
    doc.text(`- ${formatCurrency(totals.discountAmount)}`, valueX, yPos, { align: "right" });
    yPos += 5;
  }

  // Separator
  doc.setLineWidth(0.2);
  doc.line(labelX, yPos, valueX, yPos);
  yPos += 5;

  doc.text("Subtotaal excl. BTW:", labelX, yPos);
  doc.text(formatCurrency(totals.subtotalExclVat), valueX, yPos, { align: "right" });
  yPos += 5;

  const vatBreakdown = totals.vatBreakdown || [{ rate: 21, vat: totals.totalVat }];
  vatBreakdown.forEach(({ rate, vat }) => {
    doc.text(`BTW ${rate}%:`, labelX, yPos);
    doc.text(formatCurrency(vat), valueX, yPos, { align: "right" });
    yPos += 5;
  });

  // Double line before total
  doc.setLineWidth(0.3);
  doc.line(labelX, yPos - 1, valueX, yPos - 1);
  doc.line(labelX, yPos + 1, valueX, yPos + 1);
  yPos += 6;

  // Final total
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Totaal incl. BTW:", labelX, yPos);
  doc.text(formatCurrency(totals.totalInclVat), valueX, yPos, { align: "right" });

  return yPos + 12;
}

/**
 * Draw payment terms
 */
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
  yPos += 4;

  doc.setFont("helvetica", "normal");
  const terms = quote.payment_terms_description || "25% aanbetaling bij opdracht, 50% bij afroep, 25% bij levering/voor montage";
  const splitTerms = doc.splitTextToSize(terms, pageWidth - margin * 2);
  doc.text(splitTerms, margin, yPos);

  return yPos + splitTerms.length * 4 + 6;
}

/**
 * Draw conditions section
 */
export function drawConditions(
  doc: jsPDF,
  margin: number,
  pageWidth: number,
  yPos: number
): number {
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.text);

  const sections = [
    {
      title: "Levering:",
      content: "Onze leveringen zijn franco werk indien niet anders vermeld, exclusief verticaal transport tenzij uitdrukkelijk vermeld en opgenomen."
    },
    {
      title: "Levertijd:",
      content: "Circa 14 werkweken na afroep uwerzijds of indien de montage datum is ingepland is de levertijd niet van toepassing."
    },
    {
      title: "Garantie:",
      content: "De garantie volgens de leverancier ten behoeve van keuken meubelen, werkbladen en apparatuur conform garantievoorwaarden fabrikant."
    },
  ];

  sections.forEach((section) => {
    doc.setFont("helvetica", "bold");
    doc.text(section.title, margin, yPos);
    yPos += 3.5;

    doc.setFont("helvetica", "normal");
    const splitContent = doc.splitTextToSize(`- ${section.content}`, pageWidth - margin * 2);
    doc.text(splitContent, margin, yPos);
    yPos += splitContent.length * 3.5 + 3;
  });

  doc.setFont("helvetica", "normal");
  doc.text("Op deze overeenkomst zijn de Algemene Voorwaarden volgens CBW-erkend van toepassing.", margin, yPos);

  return yPos + 8;
}

/**
 * Draw signatures section
 */
export function drawSignatures(
  doc: jsPDF,
  quote: QuoteData,
  margin: number,
  pageWidth: number,
  yPos: number
): number {
  const sigWidth = (pageWidth - margin * 2 - 40) / 2;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);

  // Left column - Abitare
  doc.text("Akkoord directie:", margin, yPos);
  yPos += 15;

  doc.setDrawColor(...COLORS.text);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, margin + sigWidth, yPos);
  yPos += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Abitare B.V.", margin, yPos);

  // Right column - Customer
  const rightColX = pageWidth - margin - sigWidth;
  doc.setFont("helvetica", "normal");
  doc.text("Voor akkoord:", rightColX, yPos - 19);

  doc.line(rightColX, yPos - 4, pageWidth - margin, yPos - 4);

  const customerName = getCustomerSalutation(quote.customer) || getCustomerName(quote.customer);
  doc.setFont("helvetica", "bold");
  doc.text(customerName, rightColX, yPos);

  return yPos + 12;
}

/**
 * Draw footer with Italian flag and page number
 */
export function drawFooter(
  doc: jsPDF,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  pageNumber: number,
  totalPages: number
): void {
  const footerY = pageHeight - 12;

  // Italian flag icons (green and red rectangles)
  const flagY = footerY;
  const flagWidth = 12;
  const flagHeight = 2.5;
  const flagX = pageWidth - margin - 50;

  doc.setFillColor(...COLORS.flagGreen);
  doc.rect(flagX, flagY, flagWidth, flagHeight, "F");

  doc.setFillColor(...COLORS.flagRed);
  doc.rect(flagX + flagWidth + 3, flagY, flagWidth, flagHeight, "F");

  // Page number
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.subText);
  doc.text(`Pagina ${pageNumber} van ${totalPages}`, pageWidth - margin, footerY + 6, { align: "right" });

  // Greeting on page 1 only (handled in generator)
}

/**
 * Draw closing text before signatures
 */
export function drawClosingText(
  doc: jsPDF,
  margin: number,
  yPos: number
): number {
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.text);
  
  doc.text("Met vriendelijke groet,", margin, yPos);
  yPos += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Abitare keuken en interieurarchitectuur", margin, yPos);

  return yPos + 12;
}
