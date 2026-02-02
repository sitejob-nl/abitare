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

    // Batch upsert in chunks of 100
    const chunkSize = 100
    let inserted = 0
    let updated = 0
    const errors: string[] = []

    for (let i = 0; i < productsToUpsert.length; i += chunkSize) {
      const chunk = productsToUpsert.slice(i, i + chunkSize)
      
      // Get existing article codes for this supplier
      const articleCodes = chunk.map(p => p.article_code)
      const { data: existing } = await supabase
        .from('products')
        .select('article_code')
        .eq('supplier_id', supplier_id)
        .in('article_code', articleCodes)
      
      const existingCodes = new Set(existing?.map(e => e.article_code) || [])
      
      // Separate into insert and update
      const toInsert = chunk.filter(p => !existingCodes.has(p.article_code))
      const toUpdate = chunk.filter(p => existingCodes.has(p.article_code))
      
      // Insert new products
      if (toInsert.length > 0) {
        const { error: insertError, data: insertedData } = await supabase
          .from('products')
          .insert(toInsert)
          .select('id')
        
        if (insertError) {
          errors.push(`Insert error: ${insertError.message}`)
        } else {
          inserted += insertedData?.length || 0
        }
      }
      
      // Update existing products one by one (upsert with conflict)
      for (const product of toUpdate) {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            name: product.name,
            description: product.description,
            cost_price: product.cost_price,
            base_price: product.base_price,
            category_id: product.category_id,
            vat_rate: product.vat_rate,
            unit: product.unit,
            is_active: product.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('supplier_id', supplier_id)
          .eq('article_code', product.article_code)
        
        if (updateError) {
          errors.push(`Update error for ${product.article_code}: ${updateError.message}`)
        } else {
          updated++
        }
      }
    }

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
    // Step 1: Create or get product ranges
    console.log(`Processing ${data.ranges.length} ranges...`)
    const rangeMap = new Map<string, string>() // code -> id
    
    for (const range of data.ranges) {
      // Check if range exists
      const { data: existing } = await supabase
        .from('product_ranges')
        .select('id')
        .eq('supplier_id', supplierId)
        .eq('code', range.code)
        .single()
      
      if (existing) {
        rangeMap.set(range.code, existing.id)
      } else {
        // Insert new range
        const { data: newRange, error: rangeError } = await supabase
          .from('product_ranges')
          .insert({
            code: range.code,
            name: range.name,
            supplier_id: supplierId,
            is_active: true,
          })
          .select('id')
          .single()
        
        if (rangeError) {
          errors.push(`Range insert error for ${range.code}: ${rangeError.message}`)
        } else if (newRange) {
          rangeMap.set(range.code, newRange.id)
          rangesCreated++
        }
      }
    }

    // Step 2: Insert/update products in batches
    console.log(`Processing ${data.products.length} products...`)
    const productMap = new Map<string, string>() // article_code -> id
    const chunkSize = 100

    for (let i = 0; i < data.products.length; i += chunkSize) {
      const chunk = data.products.slice(i, i + chunkSize)
      const articleCodes = chunk.map(p => p.article_code)
      
      // Get existing products
      const { data: existing } = await supabase
        .from('products')
        .select('id, article_code')
        .eq('supplier_id', supplierId)
        .in('article_code', articleCodes)
      
      const existingMap = new Map((existing || []).map((e: any) => [e.article_code, e.id]))
      
      // Separate into insert and update
      const toInsert = chunk.filter(p => !existingMap.has(p.article_code))
      const toUpdate = chunk.filter(p => existingMap.has(p.article_code))
      
      // Set existing IDs in map
      toUpdate.forEach(p => {
        const id = existingMap.get(p.article_code)
        if (id) productMap.set(p.article_code, id as string)
      })
      
      // Insert new products
      if (toInsert.length > 0) {
        const productsToInsert = toInsert.map(p => ({
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
        
        const { data: insertedProducts, error: insertError } = await supabase
          .from('products')
          .insert(productsToInsert)
          .select('id, article_code')
        
        if (insertError) {
          errors.push(`Product insert error: ${insertError.message}`)
        } else if (insertedProducts) {
          productsInserted += insertedProducts.length
          insertedProducts.forEach((p: any) => productMap.set(p.article_code, p.id))
        }
      }
      
      // Update existing products
      for (const product of toUpdate) {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            name: product.name,
            width_mm: product.width_mm || null,
            height_mm: product.height_mm || null,
            depth_mm: product.depth_mm || null,
            updated_at: new Date().toISOString(),
          })
          .eq('supplier_id', supplierId)
          .eq('article_code', product.article_code)
        
        if (updateError) {
          errors.push(`Product update error for ${product.article_code}: ${updateError.message}`)
        } else {
          productsUpdated++
        }
      }
    }

    // Step 3: Delete existing prices for this supplier's products and ranges
    console.log('Cleaning up existing prices...')
    const rangeIds = Array.from(rangeMap.values())
    const productIds = Array.from(productMap.values())
    
    if (rangeIds.length > 0 && productIds.length > 0) {
      // Delete in batches to avoid query limits
      for (let i = 0; i < productIds.length; i += 500) {
        const productChunk = productIds.slice(i, i + 500)
        await supabase
          .from('product_prices')
          .delete()
          .in('product_id', productChunk)
          .in('range_id', rangeIds)
      }
    }

    // Step 4: Insert prices in batches
    console.log(`Processing ${data.prices.length} prices...`)
    const validPrices = data.prices.filter(p => 
      productMap.has(p.article_code) && 
      rangeMap.has(p.range_code) && 
      p.price > 0
    )

    for (let i = 0; i < validPrices.length; i += 500) {
      const chunk = validPrices.slice(i, i + 500)
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
        errors.push(`Price insert error: ${priceError.message}`)
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
