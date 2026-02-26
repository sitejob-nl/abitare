import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ============================================================
// Abitare ERP - Product Import Edge Function v2-2
// Complete variant mapping for all Stosa collections:
// Evolution, LOOK, Classic Glamour, ART, FRAME
// Safe upsert, price_group_id linking, collection detection
// ============================================================

interface ProductImportRow {
  article_code: string
  name: string
  description?: string
  cost_price?: number
  base_price?: number
  supplier_id: string
  category_id?: string
  vat_rate?: number
  unit?: string
  is_active?: boolean
  ean_code?: string
  manufacturer_product_id?: string
}

interface PriceGroupProduct {
  article_code: string
  name: string
  base_price?: number
  width_mm?: number
  height_mm?: number
  depth_mm?: number
  discount_group?: string
  catalog_code?: string
}

interface PriceGroupRange {
  code: string
  name: string
  type?: string
  collection?: string
}

interface PriceGroupPrice {
  article_code: string
  range_code: string
  price: number
  variant_2_code?: string
  variant_2_name?: string
}

interface ImportRequest {
  products?: ProductImportRow[]
  supplier_id: string
  category_id?: string
  import_mode: 'standard' | 'price_groups'
  price_group_data?: {
    products: PriceGroupProduct[]
    ranges: PriceGroupRange[]
    prices: PriceGroupPrice[]
  }
}

// Stosa variant codes → price group codes
// Complete mapping from LISTINO VENDITA STOSA Excel (69.015 rijen, 169 variant codes)
const VARIANT_TO_PRICE_GROUP: Record<string, string> = {
  // ── EVOLUTION (7xx) ── solid door
  '701': 'E1', '702': 'E2', '703': 'E3', '704': 'E4', '705': 'E5',
  '706': 'E6', '707': 'E7', '708': 'E8', '709': 'E9', '710': 'E10',
  // Evolution glass door
  '731': 'A', '732': 'B', '733': 'C',
  '745': 'E5', '747': 'E7', '748': 'E8',
  // Evolution special glass
  '761': 'NATURAL', '762': 'RIBBED', '763': 'SLIM',
  // Evolution combos (piena + vetro)
  '801': 'COMBO_801', '802': 'COMBO_802', '803': 'COMBO_803',
  '806': 'COMBO_806', '807': 'COMBO_807', '808': 'COMBO_808',
  '811': 'COMBO_811', '812': 'COMBO_812', '813': 'COMBO_813',
  '816': 'COMBO_816', '817': 'COMBO_817', '818': 'COMBO_818',
  '821': 'COMBO_821', '822': 'COMBO_822', '823': 'COMBO_823',
  '826': 'COMBO_826', '827': 'COMBO_827', '828': 'COMBO_828',
  '831': 'COMBO_831', '832': 'COMBO_832', '833': 'COMBO_833',
  '836': 'COMBO_836', '837': 'COMBO_837', '838': 'COMBO_838',
  '839': 'COMBO_839', '840': 'COMBO_840', '841': 'COMBO_841',
  '842': 'COMBO_842', '843': 'COMBO_843', '844': 'COMBO_844',
  '845': 'COMBO_845', '846': 'COMBO_846', '847': 'COMBO_847',
  '848': 'COMBO_848', '850': 'COMBO_850', '851': 'COMBO_851',
  '852': 'COMBO_852', '853': 'COMBO_853', '854': 'COMBO_854',
  '855': 'COMBO_855', '856': 'COMBO_856', '857': 'COMBO_857',
  '858': 'COMBO_858', '859': 'COMBO_859',
  '875': 'COMBO_875', '876': 'COMBO_876', '877': 'COMBO_877',
  '878': 'COMBO_878', '879': 'COMBO_879', '880': 'COMBO_880',
  '892': 'COMBO_892', '893': 'COMBO_893',

  // ── LOOK (4xx) ── solid door (1-12)
  '401': 'L1', '402': 'L2', '403': 'L3', '404': 'L4', '405': 'L5',
  '406': 'L6', '407': 'L7', '408': 'L8', '409': 'L9', '410': 'L10',
  '411': 'L11', '412': 'L12',
  // Look glass door
  '431': 'LA', '432': 'LB', '433': 'LC',
  '434': 'LDECOR', '435': 'LNATURAL', '436': 'LRIBBED', '437': 'LSLIM',
  '443': 'L3', '444': 'L4', '445': 'L5', '446': 'L6',
  '447': 'L7', '449': 'L9', '450': 'L10',
  // Look combos (5xx)
  '501': 'COMBO_501', '502': 'COMBO_502', '503': 'COMBO_503',
  '506': 'COMBO_506', '507': 'COMBO_507', '508': 'COMBO_508',
  '511': 'COMBO_511', '512': 'COMBO_512', '513': 'COMBO_513',
  '516': 'COMBO_516', '517': 'COMBO_517', '518': 'COMBO_518',
  '521': 'COMBO_521', '522': 'COMBO_522', '523': 'COMBO_523',
  '526': 'COMBO_526', '527': 'COMBO_527', '528': 'COMBO_528',
  '531': 'COMBO_531', '532': 'COMBO_532', '533': 'COMBO_533',
  '536': 'COMBO_536', '537': 'COMBO_537', '538': 'COMBO_538',
  '541': 'COMBO_541', '542': 'COMBO_542', '543': 'COMBO_543',
  '546': 'COMBO_546', '547': 'COMBO_547', '548': 'COMBO_548',
  '551': 'COMBO_551', '552': 'COMBO_552', '553': 'COMBO_553',
  '554': 'COMBO_554', '555': 'COMBO_555', '556': 'COMBO_556',
  '563': 'COMBO_563', '566': 'COMBO_566', '567': 'COMBO_567', '570': 'COMBO_570',
  '592': 'COMBO_592', '593': 'COMBO_593',

  // ── CLASSIC GLAMOUR (46x-49x) ── solid door
  '461': 'CG1', '462': 'CG2', '463': 'CG3', '464': 'CG4',
  '465': 'CG5', '466': 'CG6', '467': 'CG7',
  // CL.G glass door
  '481': 'CG1', '482': 'CG2', '483': 'CG3', '484': 'CG4',
  '485': 'CG5', '486': 'CG6', '487': 'CG5', '488': 'CG6',
  '492': 'CG7', '493': 'CG7',

  // ── ART (Axx) ── solid door
  'A01': 'ART1', 'A02': 'ART2', 'A03': 'ART3', 'A04': 'ART4', 'A05': 'ART5',
  // ART glass door
  'A21': 'ART1', 'A24': 'ART4',
  // ART combos
  'A51': 'COMBO_A51', 'A55': 'COMBO_A55', 'A59': 'COMBO_A59',

  // ── SPECIAL ──
  '334': 'FRAME', '335': 'FRAME',
  'EQ': 'EQ',
}

// Determine collection from variant code
function getCollectionForVariant(variantCode: string): string {
  const code = variantCode
  if (/^[78]\d{2}$/.test(code)) return 'evolution'
  if (/^4[0-3]\d$/.test(code) || /^5\d{2}$/.test(code)) return 'look'
  if (/^4[6-9]\d$/.test(code)) return 'classic_glamour'
  if (/^A\d{2}$/.test(code)) return 'art'
  if (code === '334' || code === '335') return 'frame'
  return 'unknown'
}

function getCollectionForPriceGroup(pgCode: string): string {
  if (/^E\d{1,2}$/.test(pgCode) || ['A','B','C','NATURAL','RIBBED','SLIM'].includes(pgCode)) return 'evolution'
  if (/^L\d{1,2}$/.test(pgCode) || ['LA','LB','LC','LDECOR','LNATURAL','LRIBBED','LSLIM'].includes(pgCode)) return 'look'
  if (/^CG\d$/.test(pgCode)) return 'classic_glamour'
  if (/^ART\d$/.test(pgCode)) return 'art'
  if (pgCode === 'FRAME') return 'frame'
  if (pgCode.startsWith('COMBO_')) {
    const num = pgCode.replace('COMBO_', '')
    return getCollectionForVariant(num)
  }
  return 'unknown'
}

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

    const body: ImportRequest & { file_name?: string; replace_all?: boolean } = await req.json()
    const { supplier_id, category_id, import_mode = 'standard', file_name, replace_all } = body

    // Store raw payload for audit/debug (truncate if too large)
    const rawPayloadForLog = JSON.stringify(body).length < 5_000_000 ? body : { _truncated: true, supplier_id, import_mode, product_count: body.products?.length || body.price_group_data?.products?.length || 0 }

    if (!supplier_id) {
      return new Response(
        JSON.stringify({ error: 'Supplier ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (import_mode === 'price_groups' && body.price_group_data) {
      return handlePriceGroupImport(supabase, supplier_id, category_id, body.price_group_data, user.id, file_name, rawPayloadForLog)
    }

    // ============================================================
    // STANDARD IMPORT MODE
    // ============================================================
    const products = body.products
    if (!products || !Array.isArray(products) || products.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No products provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const productsToUpsert = products.map(p => ({
      article_code: p.article_code?.trim(),
      name: p.name?.trim() || p.article_code?.trim(),
      description: p.description?.trim() || null,
      cost_price: p.cost_price || null,
      base_price: p.base_price || null,
      supplier_id: supplier_id,
      category_id: category_id || null,
      vat_rate: p.vat_rate ?? 21,
      unit: p.unit || 'stuk',
      is_active: p.is_active ?? true,
      ean_code: p.ean_code || null,
      manufacturer_product_id: p.manufacturer_product_id || null,
    })).filter(p => p.article_code && p.article_code.length > 0)

    const chunkSize = 500
    let inserted = 0
    let updated = 0
    const errors: string[] = []

    const { data: allExisting } = await supabase
      .from('products')
      .select('article_code')
      .eq('supplier_id', supplier_id)

    const existingCodes = new Set(allExisting?.map((e: any) => e.article_code) || [])
    const newProducts = productsToUpsert.filter(p => !existingCodes.has(p.article_code))
    const existingProducts = productsToUpsert.filter(p => existingCodes.has(p.article_code))

    for (let i = 0; i < productsToUpsert.length; i += chunkSize) {
      const chunk = productsToUpsert.slice(i, i + chunkSize)
      const { error: upsertError } = await supabase
        .from('products')
        .upsert(chunk, { onConflict: 'supplier_id,article_code', ignoreDuplicates: false })
      if (upsertError) {
        errors.push(`Upsert error batch ${Math.floor(i/chunkSize)}: ${upsertError.message}`)
      }
    }

    inserted = newProducts.length
    updated = existingProducts.length

    // Soft delete: mark products not in batch as inactive (only when replace_all flag is set)
    if (replace_all) {
      const importedCodes = new Set(productsToUpsert.map(p => p.article_code))
      const codesToDeactivate = allExisting?.filter((e: any) => !importedCodes.has(e.article_code)).map((e: any) => e.article_code) || []
      if (codesToDeactivate.length > 0) {
        for (let i = 0; i < codesToDeactivate.length; i += 500) {
          const chunk = codesToDeactivate.slice(i, i + 500)
          await supabase
            .from('products')
            .update({ is_active: false })
            .eq('supplier_id', supplier_id)
            .in('article_code', chunk)
        }
        console.log(`[import] Soft-deleted ${codesToDeactivate.length} products not in batch`)
      }
    }

    // Log to import_logs
    try {
      const { data: divisionRow } = await supabase.rpc('get_user_division_id', { _user_id: user.id })
      await supabase.from('import_logs').insert({
        supplier_id,
        division_id: divisionRow || null,
        source: 'excel',
        file_name: file_name || null,
        total_rows: inserted + updated,
        inserted,
        updated,
        skipped: 0,
        errors: errors.length,
        error_details: errors.length > 0 ? errors : null,
        imported_by: user.id,
        raw_payload: rawPayloadForLog,
      })
    } catch (logErr) {
      console.error('[import] Failed to write import_log:', logErr)
    }

    return new Response(
      JSON.stringify({ success: true, inserted, updated, total: inserted + updated, errors: errors.length > 0 ? errors : undefined }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Internal server error'
    console.error('Import error:', err)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================================
// PRICE GROUP IMPORT (Stosa / leveranciers met prijsgroepen)
// ============================================================
async function handlePriceGroupImport(
  supabase: any,
  supplierId: string,
  categoryId: string | undefined,
  data: { products: PriceGroupProduct[], ranges: PriceGroupRange[], prices: PriceGroupPrice[] },
  userId: string,
  fileName?: string,
  rawPayload?: any,
) {
  const errors: string[] = []
  const stats = {
    products_inserted: 0,
    products_updated: 0,
    ranges_created: 0,
    ranges_updated: 0,
    prices_inserted: 0,
    prices_updated: 0,
    price_groups_linked: 0,
  }

  try {
    // STEP 1: Upsert product ranges
    console.log(`[import] Processing ${data.ranges.length} ranges...`)
    const rangeMap = new Map<string, string>()

    const { data: existingRanges } = await supabase
      .from('product_ranges')
      .select('id, code')
      .eq('supplier_id', supplierId)

    const existingRangeMap = new Map<string, string>(
      (existingRanges || []).map((r: any) => [r.code, r.id])
    )

    for (const range of data.ranges) {
      const pgCode = VARIANT_TO_PRICE_GROUP[range.code]
      const collection = pgCode ? getCollectionForPriceGroup(pgCode) : (range.collection || null)

      if (existingRangeMap.has(range.code)) {
        const rangeId = existingRangeMap.get(range.code)!
        rangeMap.set(range.code, rangeId)

        await supabase
          .from('product_ranges')
          .update({
            name: range.name || range.code,
            type: range.type || null,
            collection: collection,
            available_price_groups: pgCode ? [pgCode] : [],
          })
          .eq('id', rangeId)

        stats.ranges_updated++
      } else {
        const { data: inserted, error: rangeError } = await supabase
          .from('product_ranges')
          .insert({
            code: range.code,
            name: range.name || range.code,
            type: range.type || null,
            supplier_id: supplierId,
            is_active: true,
            collection: collection,
            available_price_groups: pgCode ? [pgCode] : [],
          })
          .select('id, code')
          .single()

        if (rangeError) {
          errors.push(`Range insert error [${range.code}]: ${rangeError.message}`)
        } else if (inserted) {
          rangeMap.set(inserted.code, inserted.id)
          stats.ranges_created++
        }
      }
    }

    // STEP 1b: Auto-create price_groups from variant mapping
    // Collect all unique price group codes needed
    const neededPgCodes = new Set<string>()
    for (const range of data.ranges) {
      const pgCode = VARIANT_TO_PRICE_GROUP[range.code]
      if (pgCode) neededPgCodes.add(pgCode)
    }
    console.log(`[import] Need ${neededPgCodes.size} unique price groups`)

    // Fetch existing price groups
    const { data: existingPriceGroups } = await supabase
      .from('price_groups')
      .select('id, code')
      .eq('supplier_id', supplierId)

    const priceGroupMap = new Map<string, string>(
      (existingPriceGroups || []).map((pg: any) => [pg.code, pg.id])
    )

    // Create missing price groups
    for (const pgCode of neededPgCodes) {
      if (!priceGroupMap.has(pgCode)) {
        const collection = getCollectionForPriceGroup(pgCode)
        const isGlass = ['A','B','C','LA','LB','LC','NATURAL','RIBBED','SLIM','LDECOR','LNATURAL','LRIBBED','LSLIM'].includes(pgCode)
        const isCombo = pgCode.startsWith('COMBO_')
        
        let name = pgCode
        if (isGlass) name = `Glas ${pgCode}`
        else if (isCombo) name = `Combi ${pgCode.replace('COMBO_', '')}`
        else name = `Prijsgroep ${pgCode}`

        const { data: inserted, error: pgError } = await supabase
          .from('price_groups')
          .insert({
            code: pgCode,
            name,
            supplier_id: supplierId,
            collection,
            is_glass: isGlass,
            sort_order: 0,
          })
          .select('id, code')
          .single()

        if (pgError) {
          console.error(`[import] Failed to create price group ${pgCode}:`, pgError.message)
        } else if (inserted) {
          priceGroupMap.set(inserted.code, inserted.id)
          console.log(`[import] Created price group: ${pgCode} (${collection})`)
        }
      }
    }
    console.log(`[import] Total price groups available: ${priceGroupMap.size}`)

    // STEP 2: Upsert products
    console.log(`[import] Processing ${data.products.length} products...`)
    const chunkSize = 500

    const { data: existingProductCodes } = await supabase
      .from('products')
      .select('article_code')
      .eq('supplier_id', supplierId)
    const existingCodeSet = new Set((existingProductCodes || []).map((p: any) => p.article_code))

    const allProductsToUpsert = data.products.map(p => ({
      article_code: p.article_code,
      name: p.name,
      base_price: p.base_price || null,
      supplier_id: supplierId,
      category_id: categoryId || null,
      width_mm: p.width_mm ? Math.round(p.width_mm) : null,
      height_mm: p.height_mm ? Math.round(p.height_mm) : null,
      depth_mm: p.depth_mm ? Math.round(p.depth_mm) : null,
      discount_group: p.discount_group || null,
      catalog_code: p.catalog_code || null,
      vat_rate: 21,
      unit: 'stuk',
      is_active: true,
    }))

    for (let i = 0; i < allProductsToUpsert.length; i += chunkSize) {
      const chunk = allProductsToUpsert.slice(i, i + chunkSize)
      const { error: upsertError } = await supabase
        .from('products')
        .upsert(chunk, { onConflict: 'supplier_id,article_code', ignoreDuplicates: false })

      if (upsertError) {
        errors.push(`Product upsert error batch ${Math.floor(i/chunkSize)}: ${upsertError.message}`)
      }
    }

    stats.products_inserted = data.products.filter(p => !existingCodeSet.has(p.article_code)).length
    stats.products_updated = data.products.filter(p => existingCodeSet.has(p.article_code)).length

    // STEP 3: Paginated fetch of ALL product IDs
    const productMap = new Map<string, string>()
    let offset = 0
    const pageSize = 1000
    while (true) {
      const { data: page } = await supabase
        .from('products')
        .select('id, article_code')
        .eq('supplier_id', supplierId)
        .range(offset, offset + pageSize - 1)

      if (!page || page.length === 0) break
      page.forEach((p: any) => productMap.set(p.article_code, p.id))
      offset += pageSize
      if (page.length < pageSize) break
    }
    console.log(`[import] Product map: ${productMap.size} products`)

    // STEP 4: SAFE price upsert (NOT delete-all)
    console.log(`[import] Processing ${data.prices.length} prices...`)

    const validPrices = data.prices.filter(p =>
      productMap.has(p.article_code) &&
      rangeMap.has(p.range_code) &&
      p.price > 0
    )

    const skippedPrices = data.prices.length - validPrices.length
    if (skippedPrices > 0) {
      console.log(`[import] Skipped ${skippedPrices} invalid prices (missing product/range or zero price)`)
    }

    // Fetch existing prices to determine insert vs update
    const existingPriceKeys = new Set<string>()
    const supplierProductIds = Array.from(productMap.values())

    for (let i = 0; i < supplierProductIds.length; i += 1000) {
      const chunk = supplierProductIds.slice(i, i + 1000)
      const { data: existingPrices } = await supabase
        .from('product_prices')
        .select('product_id, range_id')
        .in('product_id', chunk)

      if (existingPrices) {
        existingPrices.forEach((ep: any) => {
          existingPriceKeys.add(`${ep.product_id}|${ep.range_id}`)
        })
      }
    }

    const pricesToInsert: any[] = []
    const pricesToUpdate: any[] = []

    for (const p of validPrices) {
      const productId = productMap.get(p.article_code)!
      const rangeId = rangeMap.get(p.range_code)!

      const pgCode = VARIANT_TO_PRICE_GROUP[p.range_code]
      const priceGroupId = pgCode ? priceGroupMap.get(pgCode) || null : null

      const priceRecord = {
        product_id: productId,
        range_id: rangeId,
        price: p.price,
        price_group_id: priceGroupId,
        variant_2_code: p.variant_2_code || null,
        variant_2_name: p.variant_2_name || null,
        valid_from: new Date().toISOString().split('T')[0],
      }

      const key = `${productId}|${rangeId}`
      if (existingPriceKeys.has(key)) {
        pricesToUpdate.push(priceRecord)
      } else {
        pricesToInsert.push(priceRecord)
      }
    }

    console.log(`[import] Prices: ${pricesToInsert.length} to insert, ${pricesToUpdate.length} to update`)

    const priceChunkSize = 1000
    for (let i = 0; i < pricesToInsert.length; i += priceChunkSize) {
      const chunk = pricesToInsert.slice(i, i + priceChunkSize)
      const { error: insertError } = await supabase
        .from('product_prices')
        .insert(chunk)

      if (insertError) {
        errors.push(`Price insert error batch ${Math.floor(i/priceChunkSize)}: ${insertError.message}`)
      } else {
        stats.prices_inserted += chunk.length
      }
    }

    for (const priceRecord of pricesToUpdate) {
      const { error: updateError } = await supabase
        .from('product_prices')
        .update({
          price: priceRecord.price,
          price_group_id: priceRecord.price_group_id,
          variant_2_code: priceRecord.variant_2_code,
          variant_2_name: priceRecord.variant_2_name,
          valid_from: priceRecord.valid_from,
        })
        .eq('product_id', priceRecord.product_id)
        .eq('range_id', priceRecord.range_id)

      if (updateError) {
        errors.push(`Price update error: ${updateError.message}`)
      } else {
        stats.prices_updated++
      }
    }

    // STEP 5: Link ranges to price groups
    if (priceGroupMap.size > 0) {
      console.log('[import] Linking ranges to price groups...')
      for (const [rangeCode, rangeId] of rangeMap.entries()) {
        const pgCode = VARIANT_TO_PRICE_GROUP[rangeCode]
        if (pgCode && priceGroupMap.has(pgCode)) {
          const collection = getCollectionForPriceGroup(pgCode)
          const { error: linkError } = await supabase
            .from('product_ranges')
            .update({
              available_price_groups: [pgCode],
              collection: collection,
            })
            .eq('id', rangeId)

          if (!linkError) stats.price_groups_linked++
        }
      }
    }

    console.log(`[import] Complete:`, JSON.stringify(stats))

    // Log to import_logs
    try {
      const { data: divisionRow } = await supabase.rpc('get_user_division_id', { _user_id: userId })
      await supabase.from('import_logs').insert({
        supplier_id: supplierId,
        division_id: divisionRow || null,
        source: 'json',
        file_name: fileName || null,
        total_rows: stats.products_inserted + stats.products_updated,
        inserted: stats.products_inserted,
        updated: stats.products_updated,
        skipped: 0,
        errors: errors.length,
        error_details: errors.length > 0 ? errors : null,
        imported_by: userId,
        raw_payload: rawPayload || null,
      })
    } catch (logErr) {
      console.error('[import] Failed to write import_log:', logErr)
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...stats,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Internal server error'
    console.error('[import] Price group import error:', err)
    return new Response(
      JSON.stringify({ error: errorMessage, partial_stats: stats }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}
