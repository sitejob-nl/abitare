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

interface ImportRequest {
  products: ProductImportRow[]
  supplier_id: string
  category_id?: string
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
    const { products, supplier_id, category_id } = body

    if (!products || !Array.isArray(products) || products.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No products provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!supplier_id) {
      return new Response(
        JSON.stringify({ error: 'Supplier ID is required' }),
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
    let errors: string[] = []

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
