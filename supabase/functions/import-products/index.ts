import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ============================================================
// Abitare ERP - Product Import Edge Function v2
// Fixes: price_group_id on prices, safe upsert (no delete-all),
//        proper collection assignment, logging
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
const VARIANT_TO_PRICE_GROUP: Record<string, string> = {
  '701': 'E1', '702': 'E2', '703': 'E3', '704': 'E4', '705': 'E5',
  '706': 'E6', '707': 'E7', '708': 'E8', '709': 'E9', '710': 'E10',
  '731': 'A', '732': 'B', '733': 'C',
  '401': 'E1', '402': 'E2', '403': 'E3', '404': 'E4', '405': 'E5',
  '406': 'E6', '407': 'E7', '408': 'E8', '409': 'E9', '410': 'E10',
}

function getCollectionForPriceGroup(pgCode: string): string {
  if (['E1','E2','E3','E4','E5','E6','E7','E8','E9','E10','A','B','C'].includes(pgCode)) {
    return 'evolution'
  }
  if (['I','II','III','IV','V'].includes(pgCode)) {
    return 'art'
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

    const body: ImportRequest = await req.json()
    const { supplier_id, category_id, import_mode = 'standard' } = body

    if (!supplier_id) {
      return new Response(
        JSON.stringify({ error: 'Supplier ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (import_mode === 'price_groups' && body.price_group_data) {
      return handlePriceGroupImport(supabase, supplier_id, category_id, body.price_group_data)
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

    // Fetch existing products including user_override to protect manual corrections
    const { data: allExisting } = await supabase
      .from('products')
      .select('article_code, user_override')
      .eq('supplier_id', supplier_id)

    const existingMap = new Map<string, any>((allExisting || []).map((e: any) => [e.article_code, e.user_override]))
    const existingCodes = new Set(allExisting?.map((e: any) => e.article_code) || [])

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

    const newProducts = productsToUpsert.filter(p => !existingCodes.has(p.article_code))
    const existingProducts = productsToUpsert.filter(p => existingCodes.has(p.article_code))

    for (let i = 0; i < productsToUpsert.length; i += chunkSize) {
      const chunk = productsToUpsert.slice(i, i + chunkSize).map(p => {
        // If product has user_override, preserve those overridden fields
        const override = existingMap.get(p.article_code)
        if (override && typeof override === 'object') {
          const protected_product = { ...p }
          for (const key of Object.keys(override)) {
            if (key in protected_product) {
              delete (protected_product as any)[key]
            }
          }
          return { ...protected_product, article_code: p.article_code, supplier_id: p.supplier_id }
        }
        return p
      })
      const { error: upsertError } = await supabase
        .from('products')
        .upsert(chunk, { onConflict: 'supplier_id,article_code', ignoreDuplicates: false })
      if (upsertError) {
        errors.push(`Upsert error batch ${Math.floor(i/chunkSize)}: ${upsertError.message}`)
      }
    }

    inserted = newProducts.length
    updated = existingProducts.length

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
  data: { products: PriceGroupProduct[], ranges: PriceGroupRange[], prices: PriceGroupPrice[] }
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

    // STEP 1b: Build price_group lookup (code → id)
    const { data: existingPriceGroups } = await supabase
      .from('price_groups')
      .select('id, code')
      .eq('supplier_id', supplierId)

    const priceGroupMap = new Map<string, string>(
      (existingPriceGroups || []).map((pg: any) => [pg.code, pg.id])
    )
    console.log(`[import] Found ${priceGroupMap.size} price groups for supplier`)

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
      console.log(`[import] Skipped ${skippedPrices} invalid prices`)
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
