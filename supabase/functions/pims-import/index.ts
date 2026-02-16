import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ============================================================
// PIMS Import Edge Function - Phase 1: Parse & Upsert
// Accepts BMEcat XML or CSV, upserts products, queues images
// for background processing by pims-process-images
// ============================================================

interface PimsProduct {
  article_code: string
  ean_code?: string
  name: string
  description?: string
  specifications?: Record<string, unknown>
  image_urls?: string[]
  cost_price?: number
  base_price?: number
}

interface PimsRequest {
  supplier_id: string
  category_id?: string
  format?: 'bmecat' | 'csv'
  file_content?: string // base64
  file_name?: string
  products?: PimsProduct[]
}

// ── Regex-based XML helpers (no DOMParser needed) ──
function xmlGetTag(xml: string, tagName: string): string | null {
  const re = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i')
  const m = xml.match(re)
  return m ? m[1].trim() : null
}

function xmlGetTagFirst(xml: string, tagNames: string[]): string | null {
  for (const t of tagNames) {
    const v = xmlGetTag(xml, t)
    if (v) return v
  }
  return null
}

function xmlGetAllBlocks(xml: string, tagName: string): string[] {
  const re = new RegExp(`<${tagName}[^>]*>[\\s\\S]*?<\\/${tagName}>`, 'gi')
  return Array.from(xml.matchAll(re)).map(m => m[0])
}

function xmlGetAttr(xml: string, tagName: string, attrName: string): string | null {
  const re = new RegExp(`<${tagName}[^>]*\\b${attrName}="([^"]*)"`, 'i')
  const m = xml.match(re)
  return m ? m[1] : null
}

// ── BMEcat XML Parser ──
function parseBMEcatXml(xmlString: string): PimsProduct[] {
  const products: PimsProduct[] = []

  let articleBlocks = xmlGetAllBlocks(xmlString, 'ARTICLE')
  if (articleBlocks.length === 0) articleBlocks = xmlGetAllBlocks(xmlString, 'PRODUCT')
  if (articleBlocks.length === 0) articleBlocks = xmlGetAllBlocks(xmlString, 'ITEM')

  for (const block of articleBlocks) {
    const code = xmlGetTagFirst(block, ['SUPPLIER_AID', 'SUPPLIER_PID', 'PRODUCT_ID'])
    if (!code) continue

    const product: PimsProduct = {
      article_code: code,
      name: xmlGetTagFirst(block, ['DESCRIPTION_SHORT']) || code,
      description: xmlGetTagFirst(block, ['DESCRIPTION_LONG']) || undefined,
      ean_code: xmlGetTagFirst(block, ['EAN', 'INTERNATIONAL_PID']) || undefined,
    }

    // Parse MIME (images)
    const mimeBlocks = xmlGetAllBlocks(block, 'MIME')
    const imageUrls: string[] = []
    for (const mime of mimeBlocks) {
      const source = xmlGetTag(mime, 'MIME_SOURCE')
      const mimeType = xmlGetTag(mime, 'MIME_TYPE') || ''
      if (source && (mimeType.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|tiff?)$/i.test(source))) {
        imageUrls.push(source)
      }
    }
    if (imageUrls.length > 0) product.image_urls = imageUrls

    // Parse prices
    const priceBlocks = xmlGetAllBlocks(block, 'ARTICLE_PRICE')
      .concat(xmlGetAllBlocks(block, 'PRODUCT_PRICE'))
    for (const priceBlock of priceBlocks) {
      const priceType = xmlGetAttr(priceBlock, 'ARTICLE_PRICE', 'price_type')
        || xmlGetTag(priceBlock, 'PRICE_TYPE') || ''
      const amount = parseFloat(xmlGetTagFirst(priceBlock, ['PRICE_AMOUNT', 'PRICE']) || '0')
      if (amount > 0) {
        if (priceType.toLowerCase().includes('net') || priceType === 'net_list') {
          product.cost_price = amount
        } else if (priceType.toLowerCase().includes('gros') || priceType === 'nrp') {
          product.base_price = amount
        } else if (!product.cost_price) {
          product.cost_price = amount
        }
      }
    }

    // Parse features/specifications
    const featureBlocks = xmlGetAllBlocks(block, 'FEATURE')
    const specs: Record<string, unknown> = {}
    for (const feat of featureBlocks) {
      const fname = xmlGetTagFirst(feat, ['FNAME', 'FEATURE_NAME'])
      const fvalue = xmlGetTagFirst(feat, ['FVALUE', 'FEATURE_VALUE'])
      if (fname && fvalue) specs[fname] = fvalue
    }
    if (Object.keys(specs).length > 0) product.specifications = specs

    products.push(product)
  }

  return products
}

// ── CSV Parser ──
function parseCsv(csvString: string): PimsProduct[] {
  const lines = csvString.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length < 2) return []

  const firstLine = lines[0]
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ','

  const headers = parseCsvLine(firstLine, delimiter).map(h => h.toLowerCase().trim())
  const products: PimsProduct[] = []

  const colMap = {
    article_code: findCol(headers, ['article_code', 'artikelcode', 'supplier_aid', 'ean', 'code', 'sku']),
    name: findCol(headers, ['name', 'naam', 'description_short', 'omschrijving', 'description']),
    description: findCol(headers, ['description_long', 'long_description', 'beschrijving']),
    ean_code: findCol(headers, ['ean', 'ean_code', 'ean13', 'gtin']),
    cost_price: findCol(headers, ['cost_price', 'inkoopprijs', 'netto', 'net_price']),
    base_price: findCol(headers, ['base_price', 'verkoopprijs', 'adviesprijs', 'price', 'prijs']),
    image_url: findCol(headers, ['image_url', 'image', 'afbeelding', 'mime_source', 'picture', 'foto']),
  }

  if (colMap.article_code === -1) return []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i], delimiter)
    const code = values[colMap.article_code]?.trim()
    if (!code) continue

    const product: PimsProduct = {
      article_code: code,
      name: colMap.name !== -1 ? values[colMap.name]?.trim() || code : code,
      description: colMap.description !== -1 ? values[colMap.description]?.trim() || undefined : undefined,
      ean_code: colMap.ean_code !== -1 ? values[colMap.ean_code]?.trim() || undefined : undefined,
      cost_price: colMap.cost_price !== -1 ? parseFloat(values[colMap.cost_price]?.replace(',', '.') || '0') || undefined : undefined,
      base_price: colMap.base_price !== -1 ? parseFloat(values[colMap.base_price]?.replace(',', '.') || '0') || undefined : undefined,
    }

    if (colMap.image_url !== -1) {
      const url = values[colMap.image_url]?.trim()
      if (url) product.image_urls = [url]
    }

    products.push(product)
  }

  return products
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes; continue }
    if (char === delimiter && !inQuotes) { result.push(current); current = ''; continue }
    current += char
  }
  result.push(current)
  return result
}

function findCol(headers: string[], patterns: string[]): number {
  for (const pattern of patterns) {
    const idx = headers.findIndex(h => h.includes(pattern))
    if (idx !== -1) return idx
  }
  return -1
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const contentType = (req.headers.get('content-type') || '').toLowerCase()
    const isRawXml = contentType.includes('xml')

    let userId: string | null = null

    if (!isRawXml) {
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
      userId = user.id
    }

    let supplier_id: string
    let category_id: string | undefined
    let file_name: string | undefined
    let products: PimsProduct[] = []

    if (isRawXml) {
      category_id = url.searchParams.get('category_id') || undefined
      file_name = url.searchParams.get('file_name') || 'tradeplace-push.xml'

      const xmlText = await req.text()
      console.log(`[pims] Received raw XML (${xmlText.length} bytes)`)

      const xmlSupplierName = xmlGetTagFirst(xmlText, ['SUPPLIER_NAME', 'SUPPLIER_ID', 'PARTY_ID'])
      const qsSupplierId = url.searchParams.get('supplier_id')

      if (qsSupplierId) {
        supplier_id = qsSupplierId
      } else if (xmlSupplierName) {
        const normalizedName = xmlSupplierName.trim().toLowerCase()
        console.log(`[pims] Auto-detecting supplier from XML: "${xmlSupplierName}"`)

        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('id, name, code')
          .eq('is_active', true)

        const match = (suppliers || []).find((s: any) => {
          const sName = s.name.toLowerCase()
          const sCode = (s.code || '').toLowerCase()
          return normalizedName.includes(sName) || sName.includes(normalizedName)
            || normalizedName.includes(sCode) || sCode === normalizedName
        })

        if (match) {
          supplier_id = match.id
          console.log(`[pims] Matched supplier: ${match.name} (${match.id})`)
        } else {
          return new Response(
            JSON.stringify({ error: `Leverancier "${xmlSupplierName}" niet gevonden in het systeem.` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        return new Response(
          JSON.stringify({ error: 'Geen leverancier gevonden in XML en geen supplier_id meegegeven.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      products = parseBMEcatXml(xmlText)
    } else {
      const body: PimsRequest = await req.json()
      supplier_id = body.supplier_id
      category_id = body.category_id
      file_name = body.file_name

      if (!supplier_id) {
        return new Response(
          JSON.stringify({ error: 'supplier_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (body.products && body.products.length > 0) {
        products = body.products
      } else if (body.file_content && body.format) {
        const decoded = atob(body.file_content)
        const text = new TextDecoder().decode(Uint8Array.from(decoded.split('').map(c => c.charCodeAt(0))))

        if (body.format === 'bmecat') {
          products = parseBMEcatXml(text)
        } else if (body.format === 'csv') {
          products = parseCsv(text)
        }
      }
    }

    if (products.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No products found in input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[pims] Processing ${products.length} products for supplier ${supplier_id}`)

    // Fetch existing products for safe upsert
    const existingMap = new Map<string, { id: string; user_override: Record<string, boolean> | null }>()
    let offset = 0
    while (true) {
      const { data: page } = await supabase
        .from('products')
        .select('id, article_code, user_override')
        .eq('supplier_id', supplier_id)
        .range(offset, offset + 999)
      if (!page || page.length === 0) break
      page.forEach((p: any) => existingMap.set(p.article_code, { id: p.id, user_override: p.user_override }))
      offset += 1000
      if (page.length < 1000) break
    }

    let inserted = 0
    let updated = 0
    let imagesQueued = 0
    const errors: string[] = []
    const imageQueueRows: any[] = []

    // Process products in chunks
    const chunkSize = 50
    for (let i = 0; i < products.length; i += chunkSize) {
      const chunk = products.slice(i, i + chunkSize)

      for (const p of chunk) {
        const existing = existingMap.get(p.article_code)
        const overrides = existing?.user_override || {}

        const productData: Record<string, unknown> = {
          article_code: p.article_code,
          supplier_id,
          category_id: category_id || null,
          is_active: true,
          pims_last_synced: new Date().toISOString(),
        }

        if (!overrides['name']) productData.name = p.name
        if (!overrides['description'] && p.description) productData.description = p.description
        if (!overrides['ean_code'] && p.ean_code) productData.ean_code = p.ean_code
        if (!overrides['cost_price'] && p.cost_price) productData.cost_price = p.cost_price
        if (!overrides['base_price'] && p.base_price) productData.base_price = p.base_price
        if (p.specifications && !overrides['specifications']) productData.specifications = p.specifications

        if (!existing) {
          productData.name = p.name
          productData.vat_rate = 21
          productData.unit = 'stuk'
        }

        const { data: upsertedProduct, error: upsertError } = await supabase
          .from('products')
          .upsert(productData, { onConflict: 'supplier_id,article_code' })
          .select('id')
          .single()

        if (upsertError) {
          errors.push(`Product ${p.article_code}: ${upsertError.message}`)
          continue
        }

        const productId = upsertedProduct?.id || existing?.id
        if (!productId) continue

        if (existing) updated++
        else inserted++

        // Queue images instead of downloading them
        if (p.image_urls && p.image_urls.length > 0) {
          const maxImages = Math.min(p.image_urls.length, 5)
          for (let imgIdx = 0; imgIdx < maxImages; imgIdx++) {
            imageQueueRows.push({
              product_id: productId,
              supplier_id,
              article_code: p.article_code,
              image_url: p.image_urls[imgIdx],
              image_index: imgIdx,
              status: 'pending',
            })
          }
        }
      }
    }

    // Bulk insert image queue in batches of 500
    for (let i = 0; i < imageQueueRows.length; i += 500) {
      const batch = imageQueueRows.slice(i, i + 500)
      const { error: queueError } = await supabase.from('pims_image_queue').insert(batch)
      if (queueError) {
        console.error(`[pims] Queue insert error: ${queueError.message}`)
      } else {
        imagesQueued += batch.length
      }
    }

    // Log import
    try {
      let divisionId: string | null = null
      if (userId) {
        const { data: divisionRow } = await supabase.rpc('get_user_division_id', { _user_id: userId })
        divisionId = divisionRow || null
      }
      await supabase.from('import_logs').insert({
        supplier_id,
        division_id: divisionId,
        source: 'pims',
        file_name: file_name || null,
        total_rows: inserted + updated,
        inserted,
        updated,
        skipped: 0,
        errors: errors.length,
        error_details: errors.length > 0 ? errors : null,
        imported_by: userId,
      })
    } catch (logErr) {
      console.error('[pims] Failed to log import:', logErr)
    }

    console.log(`[pims] Done: ${inserted} inserted, ${updated} updated, ${imagesQueued} images queued`)

    // Fire-and-forget: trigger background image processing
    if (imagesQueued > 0) {
      try {
        fetch(`${supabaseUrl}/functions/v1/pims-process-images`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ supplier_id }),
        }).catch(err => console.warn('[pims] Failed to trigger image processor:', err))
      } catch {
        // Fire and forget - don't block response
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted,
        updated,
        total: inserted + updated,
        images_queued: imagesQueued,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[pims] Error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
