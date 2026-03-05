// ============================================================
// types/quote-sections.ts
// Types voor sectie configuratie en STOSA integratie
// ============================================================

export type SectionType =
  | "keukenmeubelen"
  | "apparatuur"
  | "werkbladen"
  | "sanitair"
  | "diversen"
  | "montage";

export const WIZARD_SECTION_TYPES: {
  value: SectionType;
  label: string;
  description: string;
}[] = [
  { value: "keukenmeubelen", label: "Keukenmeubelen", description: "Kasten, fronten, grepen" },
  { value: "apparatuur", label: "Apparatuur", description: "Inbouwapparatuur, witgoed" },
  { value: "werkbladen", label: "Werkbladen", description: "Composiet, natuursteen, hout" },
  { value: "sanitair", label: "Sanitair", description: "Spoelbakken, kranen" },
  { value: "diversen", label: "Diversen & Accessoires", description: "Verlichting, accessoires" },
  { value: "montage", label: "Montage & Diensten", description: "Montage, transport, aansluiting" },
];

// STOSA Configuratie
export interface StosaConfig {
  front_code?: string;
  front_name?: string;
  front_color?: string;
  corpus_color?: string;
  handle_type?: string; // 'greeploos' | 'greep' | 'gola'
  handle_code?: string;
  handle_color?: string;
  plinth_type?: string; // 'PVC' | 'Aluminium' | 'Glas'
  plinth_color?: string;
  plinth_height?: number; // 10, 12, 15, 18 cm
  worktop_height?: number; // mm
  worktop_thickness?: number; // mm
}

// STOSA Model
export interface StosaModel {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  sort_order: number;
}

// STOSA Front Type
export interface StosaFrontType {
  id: string;
  model_code: string;
  code: string;
  name: string;
  price_groups: string[];
  is_active: boolean;
}

// STOSA Kleur
export interface StosaColor {
  id: string;
  code: string;
  name: string;
  hex_color?: string;
  color_type: "front" | "corpus" | "handle" | "plinth";
  is_active: boolean;
  sort_order: number;
}

// Wizard stappen
export type SectionWizardStep =
  | "type"
  | "supplier"
  | "model"
  | "pricegroup"
  | "config";

// Greep types
export const HANDLE_TYPES = [
  { value: "greeploos", label: "Greeploos" },
  { value: "greep", label: "Greep" },
  { value: "gola", label: "Gola profiel" },
] as const;

// Plint types
export const PLINTH_TYPES = [
  { value: "PVC", label: "PVC" },
  { value: "Aluminium", label: "Aluminium" },
  { value: "Glas", label: "Glas" },
] as const;

// Plint hoogtes
export const PLINTH_HEIGHTS = [
  { value: 10, label: "10 cm" },
  { value: 12, label: "12 cm" },
  { value: 15, label: "15 cm" },
  { value: 18, label: "18 cm" },
] as const;

// Werkblad diktes
export const WORKTOP_THICKNESSES = [
  { value: 12, label: "12 mm" },
  { value: 20, label: "20 mm" },
  { value: 30, label: "30 mm" },
  { value: 40, label: "40 mm" },
] as const;
