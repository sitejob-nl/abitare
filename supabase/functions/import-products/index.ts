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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get authorization header for user validation
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user is authenticated
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

    // Handle price groups import mode
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

    // Prepare products for upsert
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

    // Use bulk upsert with onConflict for speed (500 per batch for large imports)
    const chunkSize = 500
    let inserted = 0
    let updated = 0
    const errors: string[] = []

    // First, get all existing article codes for this supplier in one query
    const { data: allExisting } = await supabase
      .from('products')
      .select('article_code')
      .eq('supplier_id', supplier_id)
    
    const existingCodes = new Set(allExisting?.map(e => e.article_code) || [])
    
    // Count what will be inserted vs updated
    const newProducts = productsToUpsert.filter(p => !existingCodes.has(p.article_code))
    const existingProducts = productsToUpsert.filter(p => existingCodes.has(p.article_code))

    // Bulk upsert in larger chunks
    for (let i = 0; i < productsToUpsert.length; i += chunkSize) {
      const chunk = productsToUpsert.slice(i, i + chunkSize)
      
      const { error: upsertError, data: upsertedData } = await supabase
        .from('products')
        .upsert(chunk, {
          onConflict: 'supplier_id,article_code',
          ignoreDuplicates: false,
        })
        .select('id')
      
      if (upsertError) {
        errors.push(`Upsert error batch ${Math.floor(i/chunkSize)}: ${upsertError.message}`)
      }
    }

    inserted = newProducts.length
    updated = existingProducts.length

    return new Response(
      JSON.stringify({
        success: true,
        inserted,
        updated,
        total: inserted + updated,
        errors: errors.length > 0 ? errors : undefined,
      }),
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

  try {
    // Step 1: Bulk upsert product ranges
    console.log(`Processing ${data.ranges.length} ranges...`)
    const rangeMap = new Map<string, string>() // code -> id
    
    // Get existing ranges in one query
    const { data: existingRanges } = await supabase
      .from('product_ranges')
      .select('id, code')
      .eq('supplier_id', supplierId)
    
    const existingRangeMap = new Map<string, string>((existingRanges || []).map((r: any) => [r.code, r.id]))
    
    // Separate into new and existing
    const newRanges = data.ranges.filter(r => !existingRangeMap.has(r.code))
    const existingRangeCodes = data.ranges.filter(r => existingRangeMap.has(r.code))
    
    // Set existing range IDs
    existingRangeCodes.forEach(r => {
      rangeMap.set(r.code, existingRangeMap.get(r.code)!)
    })
    
    // Bulk insert new ranges
    if (newRanges.length > 0) {
      const rangesToInsert = newRanges.map(r => ({
        code: r.code,
        name: r.name,
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

    // Step 2: Bulk upsert products (500 per batch for 15k+ products)
    console.log(`Processing ${data.products.length} products...`)
    const productMap = new Map<string, string>() // article_code -> id
    const chunkSize = 500

    // Get all existing products for this supplier in one query
    const { data: allExistingProducts } = await supabase
      .from('products')
      .select('id, article_code')
      .eq('supplier_id', supplierId)
    
    const existingProductMap = new Map((allExistingProducts || []).map((e: any) => [e.article_code, e.id]))
    
    // Prepare all products for upsert
    const allProductsToUpsert = data.products.map(p => ({
      article_code: p.article_code,
      name: p.name,
      supplier_id: supplierId,
      category_id: categoryId || null,
      width_mm: p.width_mm || null,
      height_mm: p.height_mm || null,
      depth_mm: p.depth_mm || null,
      vat_rate: 21,
      unit: 'stuk',
      is_active: true,
    }))
    
    // Count new vs existing
    const newProductCount = data.products.filter(p => !existingProductMap.has(p.article_code)).length
    const existingProductCount = data.products.filter(p => existingProductMap.has(p.article_code)).length

    // Bulk upsert in chunks
    for (let i = 0; i < allProductsToUpsert.length; i += chunkSize) {
      const chunk = allProductsToUpsert.slice(i, i + chunkSize)
      
      const { data: upsertedProducts, error: upsertError } = await supabase
        .from('products')
        .upsert(chunk, {
          onConflict: 'supplier_id,article_code',
          ignoreDuplicates: false,
        })
        .select('id, article_code')
      
      if (upsertError) {
        errors.push(`Product upsert error batch ${Math.floor(i/chunkSize)}: ${upsertError.message}`)
      } else if (upsertedProducts) {
        upsertedProducts.forEach((p: any) => productMap.set(p.article_code, p.id))
      }
    }
    
    productsInserted = newProductCount
    productsUpdated = existingProductCount

    // Step 3: Delete existing prices for this supplier's products and ranges
    console.log('Cleaning up existing prices...')
    const rangeIds = Array.from(rangeMap.values())
    const productIds = Array.from(productMap.values())
    
    if (rangeIds.length > 0 && productIds.length > 0) {
      // Delete in batches of 1000 for large datasets
      for (let i = 0; i < productIds.length; i += 1000) {
        const productChunk = productIds.slice(i, i + 1000)
        await supabase
          .from('product_prices')
          .delete()
          .in('product_id', productChunk)
          .in('range_id', rangeIds)
      }
    }

    // Step 4: Bulk insert prices in larger batches (1000 per batch)
    console.log(`Processing ${data.prices.length} prices...`)
    const validPrices = data.prices.filter(p => 
      productMap.has(p.article_code) && 
      rangeMap.has(p.range_code) && 
      p.price > 0
    )

    const priceChunkSize = 1000
    for (let i = 0; i < validPrices.length; i += priceChunkSize) {
      const chunk = validPrices.slice(i, i + priceChunkSize)
      const pricesToInsert = chunk.map(p => ({
        product_id: productMap.get(p.article_code)!,
        range_id: rangeMap.get(p.range_code)!,
        price: p.price,
        valid_from: new Date().toISOString().split('T')[0],
      }))
      
      const { error: priceError, data: insertedPrices } = await supabase
        .from('product_prices')
        .insert(pricesToInsert)
        .select('id')
      
      if (priceError) {
        errors.push(`Price insert error batch ${Math.floor(i/priceChunkSize)}: ${priceError.message}`)
      } else {
        pricesInserted += insertedPrices?.length || 0
      }
    }

    console.log(`Import complete: ${productsInserted} inserted, ${productsUpdated} updated, ${rangesCreated} ranges, ${pricesInserted} prices`)

    return new Response(
      JSON.stringify({
        success: true,
        products_inserted: productsInserted,
        products_updated: productsUpdated,
        ranges_created: rangesCreated,
        prices_inserted: pricesInserted,
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
