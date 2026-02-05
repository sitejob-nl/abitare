// Re-export PDF generation functions from the new modular structure
export {
  generateQuotePdfBase64,
  type GeneratedPdfResult,
  type QuoteData,
  type SectionWithLines,
} from "./pdf/quotePdfGenerator";
