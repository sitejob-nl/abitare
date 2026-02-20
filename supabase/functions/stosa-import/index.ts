import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ============================================================
// Abitare ERP - STOSA Product Import Edge Function v3
// 
// STOSA heeft 13 prijsgroepen:
// - 1-10: Volle deuren (prijsgroep bepaald door materiaal/afwerking)
// - A, B, C: Glasdeuren
// ============================================================

const VARIANT_TO_PRICE_GROUP: Record<string, { pg: string; door: string; serie: string }> = {
  // LOOK
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
  // Classic Glamour
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

function extractPriceGroupFromDescription(desc: string): { pg: string; door: string } | null {
  if (!desc) return null
  const match = desc.match(/CATEG\.\s*""([0-9]{1,2}|[ABC])""/i)
  if (!match) return null
  return {
    pg: match[1],
    door: desc.toLowerCase().includes('glass') ? 'glass' : 'full'
  }
}

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
  category_id?: string
  rows: StosaRow[]
  file_name?: string
  model_name?: string
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
    const { supplier_id, category_id, rows, file_name, model_name } = body

    if (!supplier_id || !rows?.length) {
      return new Response(
        JSON.stringify({ error: 'supplier_id and rows are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[stosa-import] Starting: ${rows.length} rows, model: ${model_name || 'auto-detect'}`)

    const stats = {
      total_rows: rows.length,
      products_created: 0,
      products_updated: 0,
      prices_created: 0,
      prices_updated: 0,
      price_groups_created: 0,
      skipped_rows: 0,
      errors: [] as string[],
    }

    // STEP 1: Ensure price_groups exist
    console.log('[stosa-import] Step 1: Ensuring price groups...')
    const priceGroupMap = new Map<string, string>()

    for (const pg of STOSA_PRICE_GROUPS) {
      const { data: existing } = await supabase
        .from('price_groups')
        .select('id')
        .eq('supplier_id', supplier_id)
        .eq('code', pg.code)
        .maybeSingle()

      if (existing) {
        priceGroupMap.set(pg.code, existing.id)
      } else {
        const { data: created, error } = await supabase
          .from('price_groups')
          .insert({
            supplier_id,
            code: pg.code,
            name: pg.name,
            is_glass: pg.is_glass,
            sort_order: pg.sort_order,
            collection: model_name || null,
          })
          .select('id')
          .single()

        if (error) {
          stats.errors.push(`Price group ${pg.code}: ${error.message}`)
        } else if (created) {
          priceGroupMap.set(pg.code, created.id)
          stats.price_groups_created++
        }
      }
    }
    console.log(`[stosa-import] Price groups ready: ${priceGroupMap.size}`)

    // STEP 2: Process FPC rows
    console.log('[stosa-import] Step 2: Processing rows...')
    const productPrices = new Map<string, Map<string, number>>()
    const productInfo = new Map<string, {
      name: string
      catalog_code: string
      discount_group: string
      width_mm: number | null
      height_mm: number | null
      depth_mm: number | null
    }>()

    for (const row of rows) {
      const articleCode = row['Codice gestionale']?.trim()
      if (!articleCode) {
        stats.skipped_rows++
        continue
      }

      if (!productInfo.has(articleCode)) {
        productInfo.set(articleCode, {
          name: row['Descrizione']?.trim() || articleCode,
          catalog_code: row['Codice listino cartaceo']?.trim() || '',
          discount_group: row['Cat. molt.']?.trim() || '',
          width_mm: row['Dimensione 1'] ? Math.round(row['Dimensione 1']) : null,
          height_mm: row['Dimensione 2'] ? Math.round(row['Dimensione 2']) : null,
          depth_mm: row['Dimensione 3'] ? Math.round(row['Dimensione 3']) : null,
        })
      }

      if (row['Variabile 1'] !== 'FPC') continue

      const variantCode = String(row['Variante 1'])?.trim()
      const price = row['Prezzo Listino']
      if (!variantCode || !price || price <= 0) {
        stats.skipped_rows++
        continue
      }

      let pgCode: string | null = null
      const variantInfo = VARIANT_TO_PRICE_GROUP[variantCode]
      if (variantInfo) {
        pgCode = variantInfo.pg
      } else {
        const extracted = extractPriceGroupFromDescription(row['Descrizione 1° variabile - 1°Variante'])
        if (extracted) {
          pgCode = extracted.pg
        }
      }

      if (!pgCode || !priceGroupMap.has(pgCode)) {
        stats.skipped_rows++
        continue
      }

      if (!productPrices.has(articleCode)) {
        productPrices.set(articleCode, new Map())
      }
      productPrices.get(articleCode)!.set(pgCode, price)
    }

    console.log(`[stosa-import] Products with info: ${productInfo.size}, with prices: ${productPrices.size}`)

    // STEP 3: Upsert products
    console.log('[stosa-import] Step 3: Upserting products...')
    const { data: existingProducts } = await supabase
      .from('products')
      .select('id, article_code')
      .eq('supplier_id', supplier_id)

    const existingProductMap = new Map<string, string>(
      (existingProducts || []).map((p: any) => [p.article_code, p.id])
    )

    const productsToInsert: any[] = []
    const productsToUpdate: any[] = []

    for (const [articleCode, info] of productInfo.entries()) {
      const productData = {
        article_code: articleCode,
        name: info.name,
        catalog_code: info.catalog_code,
        discount_group: info.discount_group,
        width_mm: info.width_mm,
        height_mm: info.height_mm,
        depth_mm: info.depth_mm,
        supplier_id,
        category_id: category_id || null,
        is_active: true,
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
        .from('products')
        .insert(chunk)
        .select('id, article_code')

      if (error) {
        stats.errors.push(`Product insert: ${error.message}`)
      } else if (inserted) {
        stats.products_created += inserted.length
        inserted.forEach((p: any) => existingProductMap.set(p.article_code, p.id))
      }
    }

    for (const product of productsToUpdate) {
      const { id, ...updateData } = product
      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)

      if (error) {
        stats.errors.push(`Product update [${product.article_code}]: ${error.message}`)
      } else {
        stats.products_updated++
      }
    }

    console.log(`[stosa-import] Products: ${stats.products_created} new, ${stats.products_updated} updated`)

    // STEP 4: Upsert prices
    console.log('[stosa-import] Step 4: Upserting prices...')
    const productIds = Array.from(existingProductMap.values())
    const existingPriceKeys = new Set<string>()

    for (let i = 0; i < productIds.length; i += 1000) {
      const chunk = productIds.slice(i, i + 1000)
      const { data: existingPrices } = await supabase
        .from('product_prices')
        .select('product_id, price_group_id')
        .in('product_id', chunk)

      if (existingPrices) {
        existingPrices.forEach((ep: any) => {
          existingPriceKeys.add(`${ep.product_id}|${ep.price_group_id}`)
        })
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

        const priceRecord = {
          product_id: productId,
          price_group_id: priceGroupId,
          price,
          valid_from: new Date().toISOString().split('T')[0],
        }

        const key = `${productId}|${priceGroupId}`
        if (existingPriceKeys.has(key)) {
          pricesToUpdate.push(priceRecord)
        } else {
          pricesToInsert.push(priceRecord)
        }
      }
    }

    for (let i = 0; i < pricesToInsert.length; i += 1000) {
      const chunk = pricesToInsert.slice(i, i + 1000)
      const { error } = await supabase
        .from('product_prices')
        .insert(chunk)

      if (error) {
        stats.errors.push(`Price insert: ${error.message}`)
      } else {
        stats.prices_created += chunk.length
      }
    }

    for (const priceRecord of pricesToUpdate) {
      const { error } = await supabase
        .from('product_prices')
        .update({ price: priceRecord.price, valid_from: priceRecord.valid_from })
        .eq('product_id', priceRecord.product_id)
        .eq('price_group_id', priceRecord.price_group_id)

      if (error) {
        stats.errors.push(`Price update: ${error.message}`)
      } else {
        stats.prices_updated++
      }
    }

    console.log(`[stosa-import] Prices: ${stats.prices_created} new, ${stats.prices_updated} updated`)

    // STEP 5: Log import
    try {
      const { data: divisionRow } = await supabase.rpc('get_user_division_id', { _user_id: user.id })
      await supabase.from('import_logs').insert({
        supplier_id,
        division_id: divisionRow || null,
        source: 'stosa_excel',
        file_name: file_name || null,
        total_rows: stats.total_rows,
        inserted: stats.products_created,
        updated: stats.products_updated,
        skipped: stats.skipped_rows,
        errors: stats.errors.length,
        error_details: stats.errors.length > 0 ? stats.errors : null,
        imported_by: user.id,
      })
    } catch (logErr) {
      console.error('[stosa-import] Log error:', logErr)
    }

    console.log('[stosa-import] Complete:', JSON.stringify(stats))

    return new Response(
      JSON.stringify({ success: true, stats }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[stosa-import] Error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
