import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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
}

interface PriceGroupProduct {
  article_code: string
  name: string
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

// Mapping of Stosa variant codes to price group codes
const VARIANT_TO_PRICE_GROUP: Record<string, string> = {
  '701': 'E1', '702': 'E2', '703': 'E3', '704': 'E4', '705': 'E5',
  '706': 'E6', '707': 'E7', '708': 'E8', '709': 'E9', '710': 'E10',
  '731': 'A', '732': 'B', '733': 'C',
  // Also map 4xx variants (older format)
  '401': 'E1', '402': 'E2', '403': 'E3', '404': 'E4', '405': 'E5',
  '406': 'E6', '407': 'E7', '408': 'E8', '409': 'E9', '410': 'E10',
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

    // Standard import mode
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
    })).filter(p => p.article_code && p.article_code.length > 0)

    const chunkSize = 500
    let inserted = 0
    let updated = 0
    const errors: string[] = []

    const { data: allExisting } = await supabase
      .from('products')
      .select('article_code')
      .eq('supplier_id', supplier_id)
    
    const existingCodes = new Set(allExisting?.map(e => e.article_code) || [])
    const newProducts = productsToUpsert.filter(p => !existingCodes.has(p.article_code))
    const existingProducts = productsToUpsert.filter(p => existingCodes.has(p.article_code))

    for (let i = 0; i < productsToUpsert.length; i += chunkSize) {
      const chunk = productsToUpsert.slice(i, i + chunkSize)
      const { error: upsertError } = await supabase
        .from('products')
        .upsert(chunk, { onConflict: 'supplier_id,article_code', ignoreDuplicates: false })
        .select('id')
      
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

async function handlePriceGroupImport(
  supabase: any,
  supplierId: string,
  categoryId: string | undefined,
  data: { products: PriceGroupProduct[], ranges: PriceGroupRange[], prices: PriceGroupPrice[] }
) {
  const errors: string[] = []
  let productsInserted = 0
  let productsUpdated = 0
  let rangesCreated = 0
  let pricesInserted = 0
  let priceGroupsLinked = 0
  let priceBatchesFailed = 0
  let priceBatchesSucceeded = 0

  try {
    // Step 1: Bulk upsert product ranges
    console.log(`Processing ${data.ranges.length} ranges...`)
    const rangeMap = new Map<string, string>()
    
    const { data: existingRanges } = await supabase
      .from('product_ranges')
      .select('id, code')
      .eq('supplier_id', supplierId)
    
    const existingRangeMap = new Map<string, string>((existingRanges || []).map((r: any) => [r.code, r.id]))
    
    const newRanges = data.ranges.filter(r => !existingRangeMap.has(r.code))
    const existingRangeCodes = data.ranges.filter(r => existingRangeMap.has(r.code))
    
    existingRangeCodes.forEach(r => {
      rangeMap.set(r.code, existingRangeMap.get(r.code)!)
    })
    
    if (newRanges.length > 0) {
      const rangesToInsert = newRanges.map(r => ({
        code: r.code,
        name: r.name,
        type: r.type || null,
        supplier_id: supplierId,
        is_active: true,
      }))
      
      const { data: insertedRanges, error: rangeError } = await supabase
        .from('product_ranges')
        .insert(rangesToInsert)
        .select('id, code')
      
      if (rangeError) {
        errors.push(`Range bulk insert error: ${rangeError.message}`)
      } else if (insertedRanges) {
        rangesCreated = insertedRanges.length
        insertedRanges.forEach((r: any) => rangeMap.set(r.code, r.id))
      }
    }

    // Step 1b: Fetch existing price_groups for this supplier to link variant codes
    const { data: existingPriceGroups } = await supabase
      .from('price_groups')
      .select('id, code')
      .eq('supplier_id', supplierId)
    
    const priceGroupMap = new Map<string, string>(
      (existingPriceGroups || []).map((pg: any) => [pg.code, pg.id])
    )

    // Step 2: Bulk upsert products
    console.log(`Processing ${data.products.length} products...`)
    const chunkSize = 500

    const allProductsToUpsert = data.products.map(p => ({
      article_code: p.article_code,
      name: p.name,
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

    let batchesSucceeded = 0
    let batchesFailed = 0
    for (let i = 0; i < allProductsToUpsert.length; i += chunkSize) {
      const chunk = allProductsToUpsert.slice(i, i + chunkSize)
      const { error: upsertError } = await supabase
        .from('products')
        .upsert(chunk, { onConflict: 'supplier_id,article_code', ignoreDuplicates: false })
      
      if (upsertError) {
        batchesFailed++
        console.error(`Product upsert error batch ${Math.floor(i/chunkSize)}: ${upsertError.message}`)
        errors.push(`Product upsert error batch ${Math.floor(i/chunkSize)}: ${upsertError.message}`)
      } else {
        batchesSucceeded++
      }
    }
    console.log(`Product upsert summary: ${batchesSucceeded} batches succeeded, ${batchesFailed} batches failed out of ${Math.ceil(allProductsToUpsert.length / chunkSize)} total`)

    // CRITICAL FIX: Paginated re-fetch of ALL products for this supplier
    // This bypasses both the 1000-row query limit and incomplete upsert responses
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
    
    productsInserted = data.products.length
    productsUpdated = 0
    
    console.log(`productMap size after paginated fetch: ${productMap.size} (fetched ${offset > 0 ? offset - pageSize + (productMap.size % pageSize || pageSize) : 0} rows)`)
    // Log sample to verify 200BA codes are present
    const sampleCodes = Array.from(productMap.keys()).filter(c => c.startsWith('200')).slice(0, 5)
    if (sampleCodes.length > 0) console.log(`Sample 200xx codes in productMap: ${sampleCodes.join(', ')}`)

    // Step 3: Delete existing prices for cleanup
    console.log('Cleaning up existing prices...')
    const rangeIds = Array.from(rangeMap.values())
    const productIds = Array.from(productMap.values())
    
    if (rangeIds.length > 0 && productIds.length > 0) {
      for (let i = 0; i < productIds.length; i += 1000) {
        const productChunk = productIds.slice(i, i + 1000)
        await supabase
          .from('product_prices')
          .delete()
          .in('product_id', productChunk)
          .in('range_id', rangeIds)
      }
    }

    // Step 4: Bulk insert prices
    console.log(`Processing ${data.prices.length} prices...`)
    
    // Debug: log sample prices and match stats
    if (data.prices.length > 0) {
      console.log(`Sample prices (first 3):`, JSON.stringify(data.prices.slice(0, 3)))
      console.log(`rangeMap size: ${rangeMap.size}, productMap size: ${productMap.size}`)
      
      let noProduct = 0, noRange = 0, noPrice = 0
      const missingArticles = new Set<string>()
      const missingRanges = new Set<string>()
      
      data.prices.forEach(p => {
        if (!productMap.has(p.article_code)) { noProduct++; if (missingArticles.size < 5) missingArticles.add(p.article_code) }
        if (!rangeMap.has(p.range_code)) { noRange++; if (missingRanges.size < 5) missingRanges.add(p.range_code) }
        if (p.price <= 0) noPrice++
      })
      
      console.log(`Price filter stats: ${noProduct} missing product, ${noRange} missing range, ${noPrice} zero/negative price`)
      if (missingArticles.size > 0) console.log(`Sample missing articles: ${Array.from(missingArticles).join(', ')}`)
      if (missingRanges.size > 0) console.log(`Sample missing ranges: ${Array.from(missingRanges).join(', ')}`)
    }
    
    const validPrices = data.prices.filter(p => 
      productMap.has(p.article_code) && 
      rangeMap.has(p.range_code) && 
      p.price > 0
    )
    
    console.log(`Valid prices after filtering: ${validPrices.length} of ${data.prices.length}`)

    const priceChunkSize = 1000
    for (let i = 0; i < validPrices.length; i += priceChunkSize) {
      const chunk = validPrices.slice(i, i + priceChunkSize)
      const pricesToInsert = chunk.map(p => ({
        product_id: productMap.get(p.article_code)!,
        range_id: rangeMap.get(p.range_code)!,
        price: p.price,
        variant_2_code: p.variant_2_code || null,
        variant_2_name: p.variant_2_name || null,
        valid_from: new Date().toISOString().split('T')[0],
      }))
      
      const { error: priceError, data: insertedPrices } = await supabase
        .from('product_prices')
        .insert(pricesToInsert)
        .select('id')
      
      if (priceError) {
        console.error(`Price insert error batch ${Math.floor(i/priceChunkSize)}: ${priceError.message}`)
        if (priceBatchesFailed === 0) {
          console.error(`First failing price record sample:`, JSON.stringify(pricesToInsert[0]))
        }
        priceBatchesFailed++
        errors.push(`Price insert error batch ${Math.floor(i/priceChunkSize)}: ${priceError.message}`)
      } else {
        priceBatchesSucceeded++
        pricesInserted += insertedPrices?.length || 0
      }
    }
    console.log(`Price insert summary: ${priceBatchesSucceeded} batches succeeded, ${priceBatchesFailed} batches failed`)

    // Step 5: Link ranges to price_groups via variant code mapping
    // E.g. range code "701" or "401" → price_group "E1"
    if (priceGroupMap.size > 0) {
      console.log('Linking ranges to price groups...')
      for (const [rangeCode, rangeId] of rangeMap.entries()) {
        const pgCode = VARIANT_TO_PRICE_GROUP[rangeCode]
        if (pgCode && priceGroupMap.has(pgCode)) {
          // Update the range's available_price_groups
          const { error: linkError } = await supabase
            .from('product_ranges')
            .update({ 
              available_price_groups: [pgCode],
              collection: 'evolution',
            })
            .eq('id', rangeId)
          
          if (!linkError) priceGroupsLinked++
        }
      }
    }

    console.log(`Import complete: ${productsInserted} inserted, ${productsUpdated} updated, ${rangesCreated} ranges, ${pricesInserted} prices, ${priceGroupsLinked} price groups linked`)

    return new Response(
      JSON.stringify({
        success: true,
        products_inserted: productsInserted,
        products_updated: productsUpdated,
        ranges_created: rangesCreated,
        prices_inserted: pricesInserted,
        price_groups_linked: priceGroupsLinked,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Internal server error'
    console.error('Price group import error:', err)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}
