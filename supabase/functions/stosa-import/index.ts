import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ============================================================
// Abitare ERP - STOSA Product Import Edge Function v5
// 
// Features:
// - 13 prijsgroepen (1-10 + A,B,C)
// - Automatische categorie uit SKU type code
// - Prijseenheid detectie (STUK, ML, M2, SET)
// - Kortingsgroep tracking (GR1/GR2/GR3)
// - Product relaties voor keuken configuratie
// ============================================================

// ══════════════════════════════════════════════════════════
// VARIANT → PRIJSGROEP MAPPING
// ══════════════════════════════════════════════════════════

const VARIANT_TO_PRICE_GROUP: Record<string, { pg: string; door: string; serie: string }> = {
  // LOOK serie
  '401': { pg: '1', door: 'full', serie: 'LOOK' },
  '402': { pg: '2', door: 'full', serie: 'LOOK' },
  '403': { pg: '3', door: 'full', serie: 'LOOK' },
  '404': { pg: '4', door: 'full', serie: 'LOOK' },
  '405': { pg: '5', door: 'full', serie: 'LOOK' },
  '406': { pg: '6', door: 'full', serie: 'LOOK' },
  '407': { pg: '7', door: 'full', serie: 'LOOK' },
  '408': { pg: '8', door: 'full', serie: 'LOOK' },
  '409': { pg: '9', door: 'full', serie: 'LOOK' },
  '410': { pg: '10', door: 'full', serie: 'LOOK' },
  '431': { pg: 'A', door: 'glass', serie: 'LOOK' },
  '432': { pg: 'B', door: 'glass', serie: 'LOOK' },
  '433': { pg: 'C', door: 'glass', serie: 'LOOK' },
  '443': { pg: '3', door: 'glass', serie: 'LOOK' },
  '444': { pg: '4', door: 'glass', serie: 'LOOK' },
  '445': { pg: '5', door: 'glass', serie: 'LOOK' },
  '446': { pg: '6', door: 'glass', serie: 'LOOK' },
  '447': { pg: '7', door: 'glass', serie: 'LOOK' },
  '449': { pg: '9', door: 'glass', serie: 'LOOK' },
  '450': { pg: '10', door: 'full', serie: 'LOOK' },
  // Classic Glamour serie
  '461': { pg: '1', door: 'full', serie: 'CL' },
  '462': { pg: '2', door: 'full', serie: 'CL' },
  '463': { pg: '3', door: 'full', serie: 'CL' },
  '464': { pg: '4', door: 'full', serie: 'CL' },
  '465': { pg: '5', door: 'full', serie: 'CL' },
  '466': { pg: '6', door: 'full', serie: 'CL' },
  '481': { pg: '1', door: 'glass', serie: 'CL' },
  '482': { pg: '2', door: 'glass', serie: 'CL' },
  '483': { pg: '3', door: 'glass', serie: 'CL' },
  '484': { pg: '4', door: 'glass', serie: 'CL' },
  '485': { pg: '5', door: 'glass', serie: 'CL' },
  '486': { pg: '6', door: 'glass', serie: 'CL' },
  '487': { pg: '5', door: 'full', serie: 'CL' },
  '488': { pg: '6', door: 'full', serie: 'CL' },
  '492': { pg: '7', door: 'glass', serie: 'CL' },
  '493': { pg: '7', door: 'full', serie: 'CL' },
}

// ══════════════════════════════════════════════════════════
// SKU TYPE CODE → CATEGORIE MAPPING
// ══════════════════════════════════════════════════════════

const TYPE_CODE_MAPPING: Record<string, { 
  category: string
  subcategory: string
  name_nl: string
  kitchen_group: string
}> = {
  'BB': { category: 'ONDERKAST', subcategory: 'standaard', name_nl: 'Onderkast met deur + uittrekblad', kitchen_group: 'onderkast' },
  'BD': { category: 'ONDERKAST', subcategory: 'lade', name_nl: 'Onderkast diepe lade', kitchen_group: 'onderkast' },
  'BE': { category: 'ONDERKAST', subcategory: 'lade', name_nl: 'Onderkast met lades', kitchen_group: 'onderkast' },
  'BF': { category: 'ONDERKAST', subcategory: 'combi', name_nl: 'Onderkast combi (lades + deur)', kitchen_group: 'onderkast' },
  'BG': { category: 'ONDERKAST', subcategory: 'ladenblok', name_nl: 'Onderkast ladenblok', kitchen_group: 'onderkast' },
  'BJ': { category: 'ONDERKAST', subcategory: 'hoek', name_nl: 'Hoekkast met plank', kitchen_group: 'onderkast' },
  'BK': { category: 'ONDERKAST', subcategory: 'hoek', name_nl: 'Hoekkast met draaiplateau', kitchen_group: 'onderkast' },
  'BQ': { category: 'ONDERKAST', subcategory: 'hoek', name_nl: 'Hoekkast met uittrek', kitchen_group: 'onderkast' },
  'BR': { category: 'ONDERKAST', subcategory: 'klep', name_nl: 'Onderkast met klep', kitchen_group: 'onderkast' },
  'BT': { category: 'ONDERKAST', subcategory: 'standaard', name_nl: 'Onderkast standaard', kitchen_group: 'onderkast' },
  'BM': { category: 'ONDERKAST', subcategory: 'open', name_nl: 'Onderkast open/nis', kitchen_group: 'onderkast' },
  'LD': { category: 'SPOELBAKKAST', subcategory: 'afvalbak', name_nl: 'Spoelbakkast met afvalbak', kitchen_group: 'onderkast' },
  'LE': { category: 'SPOELBAKKAST', subcategory: 'uittrek', name_nl: 'Spoelbakkast met uittrekbakken', kitchen_group: 'onderkast' },
  'LT': { category: 'SPOELBAKKAST', subcategory: 'standaard', name_nl: 'Spoelbakkast standaard', kitchen_group: 'onderkast' },
  'LQ': { category: 'SPOELBAKKAST', subcategory: 'hoek', name_nl: 'Hoek spoelbakkast', kitchen_group: 'onderkast' },
  'PR': { category: 'BOVENKAST', subcategory: 'deur', name_nl: 'Bovenkast met deuren', kitchen_group: 'bovenkast' },
  'PS': { category: 'BOVENKAST', subcategory: 'klep', name_nl: 'Bovenkast met klepdeuren', kitchen_group: 'bovenkast' },
  'PF': { category: 'BOVENKAST', subcategory: 'vouwklep', name_nl: 'Bovenkast met vouwklep', kitchen_group: 'bovenkast' },
  'PE': { category: 'BOVENKAST', subcategory: 'glas', name_nl: 'Bovenkast met glasschuifdeur', kitchen_group: 'bovenkast' },
  'PH': { category: 'BOVENKAST', subcategory: 'hoek', name_nl: 'Hoek bovenkast 90°', kitchen_group: 'bovenkast' },
  'PA': { category: 'BOVENKAST', subcategory: 'open', name_nl: 'Open bovenkast/rek', kitchen_group: 'bovenkast' },
  'PW': { category: 'BOVENKAST', subcategory: 'magnetron', name_nl: 'Bovenkast voor magnetron', kitchen_group: 'bovenkast' },
  'PG': { category: 'BOVENKAST', subcategory: 'kruidenrek', name_nl: 'Kruidenrek/specerijen', kitchen_group: 'bovenkast' },
  'SR': { category: 'AFDRUIPREK', subcategory: 'deur', name_nl: 'Afdruiprekkast met deuren', kitchen_group: 'bovenkast' },
  'SS': { category: 'AFDRUIPREK', subcategory: 'klep', name_nl: 'Afdruiprekkast met klep', kitchen_group: 'bovenkast' },
  'DS': { category: 'AFZUIGKAPKAST', subcategory: 'uittrek', name_nl: 'Afzuigkapkast uitschuifbaar', kitchen_group: 'bovenkast' },
  'DZ': { category: 'AFZUIGKAPKAST', subcategory: 'standaard', name_nl: 'Afzuigkapkast standaard', kitchen_group: 'bovenkast' },
  'DI': { category: 'AFZUIGKAP', subcategory: 'eiland', name_nl: 'Eiland afzuigkap', kitchen_group: 'apparatuur' },
  'DM': { category: 'AFZUIGKAP', subcategory: 'inbouw', name_nl: 'Inbouw afzuigkap', kitchen_group: 'apparatuur' },
  'DR': { category: 'AFZUIGKAP', subcategory: 'wand', name_nl: 'Wand afzuigkap', kitchen_group: 'apparatuur' },
  'CD': { category: 'HOGE_KAST', subcategory: 'voorraad', name_nl: 'Hoge kast voorraad', kitchen_group: 'hoge_kast' },
  'CH': { category: 'HOGE_KAST', subcategory: 'oven', name_nl: 'Hoge kast voor oven', kitchen_group: 'hoge_kast' },
  'CM': { category: 'HOGE_KAST', subcategory: 'combi', name_nl: 'Hoge kast oven + magnetron', kitchen_group: 'hoge_kast' },
  'CQ': { category: 'HOGE_KAST', subcategory: 'koelkast', name_nl: 'Hoge kast voor koelkast', kitchen_group: 'hoge_kast' },
  'CA': { category: 'HOGE_KAST', subcategory: 'hoek', name_nl: 'Hoek hoge kast', kitchen_group: 'hoge_kast' },
  'CF': { category: 'HOGE_KAST', subcategory: 'hoek_oven', name_nl: 'Hoek hoge kast met oven', kitchen_group: 'hoge_kast' },
  'CB': { category: 'HOGE_KAST', subcategory: 'vulstuk', name_nl: 'Hoge kast vulstuk', kitchen_group: 'hoge_kast' },
  'GL': { category: 'INBOUW_FRONT', subcategory: 'vaatwasser', name_nl: 'Front vaatwasser', kitchen_group: 'front' },
  'GH': { category: 'INBOUW_FRONT', subcategory: 'koelkast', name_nl: 'Front koelkast', kitchen_group: 'front' },
  'FC': { category: 'OVEN_ONDERKAST', subcategory: 'basis', name_nl: 'Onderkast voor inbouwoven', kitchen_group: 'onderkast' },
  'FE': { category: 'OVEN_ONDERKAST', subcategory: 'kookplaat', name_nl: 'Onderkast met kookplaat', kitchen_group: 'onderkast' },
  'FT': { category: 'OVEN_ONDERKAST', subcategory: 'downdraft', name_nl: 'Onderkast met downdraft', kitchen_group: 'onderkast' },
  'OC': { category: 'ACCESSOIRE', subcategory: 'achterwand', name_nl: 'Achterwand paneel', kitchen_group: 'accessoire' },
  'SC': { category: 'ACCESSOIRE', subcategory: 'kruidenrek', name_nl: 'Kruidenrek', kitchen_group: 'accessoire' },
}

const PREFIX_CATEGORY_MAP: Record<string, { 
  category: string
  subcategory: string
  kitchen_group: string
}> = {
  '200': { category: 'VERLICHTING', subcategory: 'spot', kitchen_group: 'verlichting' },
  '201': { category: 'WERKBLAD', subcategory: 'marmer', kitchen_group: 'werkblad' },
  '202': { category: 'WERKBLAD', subcategory: 'graniet', kitchen_group: 'werkblad' },
  '700': { category: 'SPOELBAK', subcategory: 'inox', kitchen_group: 'spoelbak' },
  '7VJ': { category: 'SPOELBAK', subcategory: 'blanco', kitchen_group: 'spoelbak' },
  '7VE': { category: 'SPOELBAK', subcategory: 'elleci', kitchen_group: 'spoelbak' },
  '7VF': { category: 'SPOELBAK', subcategory: 'franke', kitchen_group: 'spoelbak' },
  '7VX': { category: 'SPOELBAK', subcategory: 'foster', kitchen_group: 'spoelbak' },
  '7RF': { category: 'KRAAN', subcategory: 'franke', kitchen_group: 'kraan' },
  '7RE': { category: 'KRAAN', subcategory: 'elleci', kitchen_group: 'kraan' },
  '7RJ': { category: 'KRAAN', subcategory: 'blanco', kitchen_group: 'kraan' },
  '7R1': { category: 'KRAAN', subcategory: 'nobili', kitchen_group: 'kraan' },
  '7AF': { category: 'SPOELBAK_ACC', subcategory: 'bakje', kitchen_group: 'accessoire' },
  '7AE': { category: 'SPOELBAK_ACC', subcategory: 'zeepdispenser', kitchen_group: 'accessoire' },
  '5FM': { category: 'GOLA', subcategory: 'profiel', kitchen_group: 'accessoire' },
  '5RT': { category: 'GREEP', subcategory: 'greeplijst', kitchen_group: 'accessoire' },
  '5RU': { category: 'GREEP', subcategory: 'greep', kitchen_group: 'accessoire' },
  '000': { category: 'ACCESSOIRE', subcategory: 'diversen', kitchen_group: 'accessoire' },
  '100': { category: 'AFZUIGKAP_ACC', subcategory: 'filter', kitchen_group: 'accessoire' },
  'X2M': { category: 'KAST', subcategory: 'onderkast', kitchen_group: 'onderkast' },
  'X3M': { category: 'KAST', subcategory: 'bovenkast', kitchen_group: 'bovenkast' },
  'X0G': { category: 'ACCESSOIRE', subcategory: 'hardware', kitchen_group: 'accessoire' },
}

// ══════════════════════════════════════════════════════════
// PRIJSEENHEID DETECTIE
// ══════════════════════════════════════════════════════════

type PricingUnit = 'STUK' | 'ML' | 'M2' | 'SET'

function detectPricingUnit(description: string): PricingUnit {
  const desc = (description || '').toUpperCase()
  if (/\bM2\b|\bMQ\b|M²|SQ\.?\s*M|BY THE M2|PER\s*M2/.test(desc)) return 'M2'
  if (/L\.?\s*MET|\bML\b|M\.L\.|BY THE M\b|LINEAR|\/M\b|PER\s*M\b|METRE/.test(desc)) return 'ML'
  if (/\bSET\b|\bKIT\b|\bPAIR\b|COPPIA|\bCONF\.|PAAR/.test(desc)) return 'SET'
  return 'STUK'
}

// ══════════════════════════════════════════════════════════
// CATEGORIE DETECTIE UIT SKU
// ══════════════════════════════════════════════════════════

interface CategoryInfo {
  category: string
  subcategory: string
  type_code: string
  type_name_nl: string
  kitchen_group: string
}

function detectCategory(articleCode: string, description: string): CategoryInfo {
  const sku = articleCode || ''
  const prefix = sku.substring(0, 3)
  const typeCode = sku.length >= 5 ? sku.substring(3, 5) : ''
  
  if (TYPE_CODE_MAPPING[typeCode]) {
    const info = TYPE_CODE_MAPPING[typeCode]
    return { category: info.category, subcategory: info.subcategory, type_code: typeCode, type_name_nl: info.name_nl, kitchen_group: info.kitchen_group }
  }
  
  if (PREFIX_CATEGORY_MAP[prefix]) {
    const info = PREFIX_CATEGORY_MAP[prefix]
    return { category: info.category, subcategory: info.subcategory, type_code: typeCode, type_name_nl: '', kitchen_group: info.kitchen_group }
  }
  
  const desc = (description || '').toUpperCase()
  if (/PLINTH|ZOCCOLO|PLINT/.test(desc)) return { category: 'PLINT', subcategory: 'pvc', type_code: '', type_name_nl: 'Plint', kitchen_group: 'plint' }
  if (/CORNICE|KROONLIJST/.test(desc)) return { category: 'AFWERKING', subcategory: 'cornice', type_code: '', type_name_nl: 'Kroonlijst', kitchen_group: 'accessoire' }
  if (/BOISERIE|PANEL/.test(desc)) return { category: 'ACHTERWAND', subcategory: 'boiserie', type_code: '', type_name_nl: 'Boiserie paneel', kitchen_group: 'achterwand' }
  if (/SIDE|FIANCO|ZIJWAND/.test(desc)) return { category: 'ZIJWAND', subcategory: 'side', type_code: '', type_name_nl: 'Zijwand', kitchen_group: 'werkblad' }
  if (/TOP|WORKTOP|PIANO|WERKBLAD/.test(desc)) return { category: 'WERKBLAD', subcategory: 'top', type_code: '', type_name_nl: 'Werkblad', kitchen_group: 'werkblad' }
  
  return { category: 'OVERIG', subcategory: '', type_code: typeCode, type_name_nl: '', kitchen_group: 'overig' }
}

function extractWidthFromSku(sku: string): number | null {
  if (!sku || sku.length < 7) return null
  const widthCode = sku.substring(5, 7)
  const widthNum = parseInt(widthCode, 10)
  if (isNaN(widthNum)) return null
  if (widthNum >= 10 && widthNum <= 20) return widthNum * 100
  if (widthNum >= 30 && widthNum <= 99) return widthNum * 10
  return null
}

// ══════════════════════════════════════════════════════════
// PRIJSGROEPEN & KORTINGSGROEPEN & CATEGORIEËN
// ══════════════════════════════════════════════════════════

const STOSA_PRICE_GROUPS = [
  { code: '1', name: 'Prijsgroep 1', is_glass: false, sort_order: 1 },
  { code: '2', name: 'Prijsgroep 2', is_glass: false, sort_order: 2 },
  { code: '3', name: 'Prijsgroep 3', is_glass: false, sort_order: 3 },
  { code: '4', name: 'Prijsgroep 4', is_glass: false, sort_order: 4 },
  { code: '5', name: 'Prijsgroep 5', is_glass: false, sort_order: 5 },
  { code: '6', name: 'Prijsgroep 6', is_glass: false, sort_order: 6 },
  { code: '7', name: 'Prijsgroep 7', is_glass: false, sort_order: 7 },
  { code: '8', name: 'Prijsgroep 8', is_glass: false, sort_order: 8 },
  { code: '9', name: 'Prijsgroep 9', is_glass: false, sort_order: 9 },
  { code: '10', name: 'Prijsgroep 10', is_glass: false, sort_order: 10 },
  { code: 'A', name: 'Glas A', is_glass: true, sort_order: 11 },
  { code: 'B', name: 'Glas B', is_glass: true, sort_order: 12 },
  { code: 'C', name: 'Glas C', is_glass: true, sort_order: 13 },
]

const DISCOUNT_GROUPS = [
  { code: 'GR1', name: 'Kortingsgroep 1', default_discount: 0 },
  { code: 'GR2', name: 'Kortingsgroep 2', default_discount: 0 },
  { code: 'GR3', name: 'Kortingsgroep 3', default_discount: 0 },
]

const STOSA_CATEGORIES = [
  { code: 'ONDERKAST', name: 'Onderkasten', parent: null as string | null, kitchen_group: 'onderkast' },
  { code: 'BOVENKAST', name: 'Bovenkasten', parent: null as string | null, kitchen_group: 'bovenkast' },
  { code: 'HOGE_KAST', name: 'Hoge kasten', parent: null as string | null, kitchen_group: 'hoge_kast' },
  { code: 'SPOELBAKKAST', name: 'Spoelbakkasten', parent: 'ONDERKAST', kitchen_group: 'onderkast' },
  { code: 'OVEN_ONDERKAST', name: 'Oven onderkasten', parent: 'ONDERKAST', kitchen_group: 'onderkast' },
  { code: 'AFDRUIPREK', name: 'Afdruiprekkasten', parent: 'BOVENKAST', kitchen_group: 'bovenkast' },
  { code: 'AFZUIGKAPKAST', name: 'Afzuigkapkasten', parent: 'BOVENKAST', kitchen_group: 'bovenkast' },
  { code: 'INBOUW_FRONT', name: 'Inbouwfronten', parent: null as string | null, kitchen_group: 'front' },
  { code: 'WERKBLAD', name: 'Werkbladen', parent: null as string | null, kitchen_group: 'werkblad' },
  { code: 'ZIJWAND', name: 'Zijwanden', parent: 'WERKBLAD', kitchen_group: 'werkblad' },
  { code: 'SPOELBAK', name: 'Spoelbakken', parent: null as string | null, kitchen_group: 'spoelbak' },
  { code: 'KRAAN', name: 'Kranen', parent: null as string | null, kitchen_group: 'kraan' },
  { code: 'SPOELBAK_ACC', name: 'Spoelbak accessoires', parent: 'SPOELBAK', kitchen_group: 'accessoire' },
  { code: 'PLINT', name: 'Plinten', parent: null as string | null, kitchen_group: 'plint' },
  { code: 'ACHTERWAND', name: 'Achterwanden', parent: null as string | null, kitchen_group: 'achterwand' },
  { code: 'AFWERKING', name: 'Afwerking', parent: null as string | null, kitchen_group: 'accessoire' },
  { code: 'GREEP', name: 'Grepen', parent: null as string | null, kitchen_group: 'accessoire' },
  { code: 'GOLA', name: 'Gola profielen', parent: null as string | null, kitchen_group: 'accessoire' },
  { code: 'ACCESSOIRE', name: 'Accessoires', parent: null as string | null, kitchen_group: 'accessoire' },
  { code: 'AFZUIGKAP', name: 'Afzuigkappen', parent: null as string | null, kitchen_group: 'apparatuur' },
  { code: 'AFZUIGKAP_ACC', name: 'Afzuigkap accessoires', parent: 'AFZUIGKAP', kitchen_group: 'accessoire' },
  { code: 'VERLICHTING', name: 'Verlichting', parent: null as string | null, kitchen_group: 'verlichting' },
  { code: 'OVERIG', name: 'Overig', parent: null as string | null, kitchen_group: 'overig' },
  { code: 'KAST', name: 'Kasten (algemeen)', parent: null as string | null, kitchen_group: 'onderkast' },
]

// ══════════════════════════════════════════════════════════
// INTERFACES
// ══════════════════════════════════════════════════════════

interface StosaRow {
  'Codice gestionale': string
  'Codice listino cartaceo': string
  'Descrizione': string
  'Variabile 1': string
  'Variante 1': string
  'Descrizione 1° variabile - 1°Variante': string
  'Prezzo Listino': number
  'Cat. molt.': string
  'Dimensione 1'?: number
  'Dimensione 2'?: number
  'Dimensione 3'?: number
}

interface ImportRequest {
  supplier_id: string
  rows: StosaRow[]
  file_name?: string
  model_name?: string
}

// ══════════════════════════════════════════════════════════
// MAIN HANDLER
// ══════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: ImportRequest = await req.json()
    const { supplier_id, rows, file_name, model_name } = body

    if (!supplier_id || !rows?.length) {
      return new Response(
        JSON.stringify({ error: 'supplier_id and rows are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[stosa-import-v5] Starting: ${rows.length} rows`)

    const stats = {
      total_rows: rows.length,
      products_created: 0,
      products_updated: 0,
      prices_created: 0,
      prices_updated: 0,
      price_groups_created: 0,
      categories_created: 0,
      discount_groups_created: 0,
      skipped_rows: 0,
      by_category: {} as Record<string, number>,
      by_unit: {} as Record<string, number>,
      by_discount_group: {} as Record<string, number>,
      by_kitchen_group: {} as Record<string, number>,
      errors: [] as string[],
    }

    // STEP 1: Create categories
    console.log('[stosa-import-v5] Step 1: Creating categories...')
    const categoryMap = new Map<string, string>()
    
    for (const cat of STOSA_CATEGORIES.filter(c => !c.parent)) {
      const { data: existing } = await supabase
        .from('product_categories').select('id').eq('supplier_id', supplier_id).eq('code', cat.code).maybeSingle()
      if (existing) {
        categoryMap.set(cat.code, existing.id)
      } else {
        const { data: created } = await supabase
          .from('product_categories').insert({ code: cat.code, name: cat.name, supplier_id, parent_id: null, kitchen_group: cat.kitchen_group, is_active: true }).select('id').single()
        if (created) { categoryMap.set(cat.code, created.id); stats.categories_created++ }
      }
    }
    
    for (const cat of STOSA_CATEGORIES.filter(c => c.parent)) {
      const parentId = categoryMap.get(cat.parent!)
      const { data: existing } = await supabase
        .from('product_categories').select('id').eq('supplier_id', supplier_id).eq('code', cat.code).maybeSingle()
      if (existing) {
        categoryMap.set(cat.code, existing.id)
      } else {
        const { data: created } = await supabase
          .from('product_categories').insert({ code: cat.code, name: cat.name, supplier_id, parent_id: parentId, kitchen_group: cat.kitchen_group, is_active: true }).select('id').single()
        if (created) { categoryMap.set(cat.code, created.id); stats.categories_created++ }
      }
    }
    console.log(`[stosa-import-v5] Categories: ${categoryMap.size}`)

    // STEP 2: Create discount groups
    console.log('[stosa-import-v5] Step 2: Creating discount groups...')
    const discountGroupMap = new Map<string, string>()
    for (const dg of DISCOUNT_GROUPS) {
      const { data: existing } = await supabase
        .from('discount_groups').select('id').eq('supplier_id', supplier_id).eq('code', dg.code).maybeSingle()
      if (existing) {
        discountGroupMap.set(dg.code, existing.id)
      } else {
        const { data: created } = await supabase
          .from('discount_groups').insert({ supplier_id, code: dg.code, name: dg.name, default_discount_percent: dg.default_discount }).select('id').single()
        if (created) { discountGroupMap.set(dg.code, created.id); stats.discount_groups_created++ }
      }
    }

    // STEP 3: Create price groups
    console.log('[stosa-import-v5] Step 3: Creating price groups...')
    const priceGroupMap = new Map<string, string>()
    for (const pg of STOSA_PRICE_GROUPS) {
      const { data: existing } = await supabase
        .from('price_groups').select('id').eq('supplier_id', supplier_id).eq('code', pg.code).maybeSingle()
      if (existing) {
        priceGroupMap.set(pg.code, existing.id)
      } else {
        const { data: created } = await supabase
          .from('price_groups').insert({ supplier_id, code: pg.code, name: pg.name, is_glass: pg.is_glass, sort_order: pg.sort_order, collection: model_name || null }).select('id').single()
        if (created) { priceGroupMap.set(pg.code, created.id); stats.price_groups_created++ }
      }
    }
    console.log(`[stosa-import-v5] Price groups: ${priceGroupMap.size}`)

    // STEP 4: Process rows
    console.log('[stosa-import-v5] Step 4: Processing rows...')
    const productPrices = new Map<string, Map<string, number>>()
    const productInfo = new Map<string, {
      name: string; catalog_code: string; discount_group_code: string
      width_mm: number | null; height_mm: number | null; depth_mm: number | null
      category_code: string; subcategory: string; type_code: string
      type_name_nl: string; kitchen_group: string; pricing_unit: PricingUnit
    }>()

    for (const row of rows) {
      const articleCode = row['Codice gestionale']?.trim()
      if (!articleCode) { stats.skipped_rows++; continue }

      const description = row['Descrizione'] || ''
      const catInfo = detectCategory(articleCode, description)
      const pricingUnit = detectPricingUnit(description)
      
      stats.by_category[catInfo.category] = (stats.by_category[catInfo.category] || 0) + 1
      stats.by_unit[pricingUnit] = (stats.by_unit[pricingUnit] || 0) + 1
      stats.by_kitchen_group[catInfo.kitchen_group] = (stats.by_kitchen_group[catInfo.kitchen_group] || 0) + 1
      
      const discountGroupCode = row['Cat. molt.']?.trim() || ''
      if (discountGroupCode) {
        stats.by_discount_group[discountGroupCode] = (stats.by_discount_group[discountGroupCode] || 0) + 1
      }

      if (!productInfo.has(articleCode)) {
        productInfo.set(articleCode, {
          name: description.trim() || articleCode,
          catalog_code: row['Codice listino cartaceo']?.trim() || '',
          discount_group_code: discountGroupCode,
          width_mm: row['Dimensione 1'] ? Math.round(row['Dimensione 1']) : extractWidthFromSku(articleCode),
          height_mm: row['Dimensione 2'] ? Math.round(row['Dimensione 2']) : null,
          depth_mm: row['Dimensione 3'] ? Math.round(row['Dimensione 3']) : null,
          category_code: catInfo.category,
          subcategory: catInfo.subcategory,
          type_code: catInfo.type_code,
          type_name_nl: catInfo.type_name_nl,
          kitchen_group: catInfo.kitchen_group,
          pricing_unit: pricingUnit,
        })
      }

      if (row['Variabile 1'] !== 'FPC') continue

      const variantCode = String(row['Variante 1'] || '')?.trim()
      const price = row['Prezzo Listino']
      if (!variantCode || !price || price <= 0) { stats.skipped_rows++; continue }

      let pgCode: string | null = null
      const variantInfo = VARIANT_TO_PRICE_GROUP[variantCode]
      if (variantInfo) {
        pgCode = variantInfo.pg
      } else {
        const desc = row['Descrizione 1° variabile - 1°Variante'] || ''
        const match = desc.match(/CATEG\.\s*""([0-9]{1,2}|[ABC])""/i)
        if (match) pgCode = match[1]
      }

      if (!pgCode || !priceGroupMap.has(pgCode)) { stats.skipped_rows++; continue }

      if (!productPrices.has(articleCode)) productPrices.set(articleCode, new Map())
      productPrices.get(articleCode)!.set(pgCode, price)
    }

    console.log(`[stosa-import-v5] Products found: ${productInfo.size}`)

    // STEP 5: Upsert products
    console.log('[stosa-import-v5] Step 5: Upserting products...')
    const { data: existingProducts } = await supabase
      .from('products').select('id, article_code').eq('supplier_id', supplier_id)

    const existingProductMap = new Map<string, string>(
      (existingProducts || []).map((p: any) => [p.article_code, p.id])
    )

    const productsToInsert: any[] = []
    const productsToUpdate: any[] = []

    for (const [articleCode, info] of productInfo.entries()) {
      const categoryId = categoryMap.get(info.category_code) || null
      const discountGroupId = discountGroupMap.get(info.discount_group_code) || null

      const productData = {
        article_code: articleCode, name: info.name, catalog_code: info.catalog_code,
        width_mm: info.width_mm, height_mm: info.height_mm, depth_mm: info.depth_mm,
        supplier_id, category_id: categoryId, discount_group_id: discountGroupId,
        type_code: info.type_code, type_name_nl: info.type_name_nl,
        subcategory: info.subcategory, kitchen_group: info.kitchen_group,
        pricing_unit: info.pricing_unit, is_active: true, vat_rate: 21,
      }

      if (existingProductMap.has(articleCode)) {
        productsToUpdate.push({ ...productData, id: existingProductMap.get(articleCode) })
      } else {
        productsToInsert.push(productData)
      }
    }

    const chunkSize = 500
    for (let i = 0; i < productsToInsert.length; i += chunkSize) {
      const chunk = productsToInsert.slice(i, i + chunkSize)
      const { data: inserted, error } = await supabase
        .from('products').insert(chunk).select('id, article_code')
      if (error) {
        stats.errors.push(`Product insert: ${error.message}`)
      } else if (inserted) {
        stats.products_created += inserted.length
        inserted.forEach((p: any) => existingProductMap.set(p.article_code, p.id))
      }
    }

    for (const product of productsToUpdate) {
      const { id, ...updateData } = product
      await supabase.from('products').update(updateData).eq('id', id)
      stats.products_updated++
    }

    console.log(`[stosa-import-v5] Products: ${stats.products_created} new, ${stats.products_updated} updated`)

    // STEP 6: Upsert prices
    console.log('[stosa-import-v5] Step 6: Upserting prices...')
    const productIds = Array.from(existingProductMap.values())
    const existingPriceKeys = new Set<string>()

    for (let i = 0; i < productIds.length; i += 1000) {
      const chunk = productIds.slice(i, i + 1000)
      const { data: existingPrices } = await supabase
        .from('product_prices').select('product_id, price_group_id').in('product_id', chunk)
      if (existingPrices) {
        existingPrices.forEach((ep: any) => existingPriceKeys.add(`${ep.product_id}|${ep.price_group_id}`))
      }
    }

    const pricesToInsert: any[] = []
    const pricesToUpdate: any[] = []

    for (const [articleCode, pricesByPg] of productPrices.entries()) {
      const productId = existingProductMap.get(articleCode)
      if (!productId) continue
      for (const [pgCode, price] of pricesByPg.entries()) {
        const priceGroupId = priceGroupMap.get(pgCode)
        if (!priceGroupId) continue
        const priceRecord = { product_id: productId, price_group_id: priceGroupId, price, valid_from: new Date().toISOString().split('T')[0] }
        const key = `${productId}|${priceGroupId}`
        if (existingPriceKeys.has(key)) { pricesToUpdate.push(priceRecord) } else { pricesToInsert.push(priceRecord) }
      }
    }

    for (let i = 0; i < pricesToInsert.length; i += 1000) {
      const chunk = pricesToInsert.slice(i, i + 1000)
      const { error } = await supabase.from('product_prices').insert(chunk)
      if (!error) stats.prices_created += chunk.length
    }

    for (const priceRecord of pricesToUpdate) {
      await supabase.from('product_prices')
        .update({ price: priceRecord.price, valid_from: priceRecord.valid_from })
        .eq('product_id', priceRecord.product_id)
        .eq('price_group_id', priceRecord.price_group_id)
      stats.prices_updated++
    }

    console.log(`[stosa-import-v5] Prices: ${stats.prices_created} new, ${stats.prices_updated} updated`)

    // STEP 7: Log import
    try {
      await supabase.from('import_logs').insert({
        supplier_id, source: 'stosa_excel_v5', file_name: file_name || null,
        total_rows: stats.total_rows, inserted: stats.products_created,
        updated: stats.products_updated, skipped: stats.skipped_rows,
        errors: stats.errors.length,
        error_details: stats.errors.length > 0 ? stats.errors : null,
        metadata: {
          by_category: stats.by_category, by_unit: stats.by_unit,
          by_discount_group: stats.by_discount_group, by_kitchen_group: stats.by_kitchen_group,
        },
        imported_by: user.id,
      })
    } catch (logErr) {
      console.error('[stosa-import-v5] Log error:', logErr)
    }

    console.log('[stosa-import-v5] Complete:', JSON.stringify(stats))

    return new Response(
      JSON.stringify({ success: true, stats }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[stosa-import-v5] Error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
