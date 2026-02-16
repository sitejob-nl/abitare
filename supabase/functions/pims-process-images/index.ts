import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ============================================================
// PIMS Process Images - Phase 2: Background Image Downloader
// Processes queued image downloads in batches, self-chains
// if there are remaining items after ~120s.
// ============================================================

const BATCH_SIZE = 10
const MAX_RUNTIME_MS = 120_000 // 2 minutes, leave buffer before 150s limit

async function downloadAndStoreImage(
  supabase: any,
  imageUrl: string,
  supplierId: string,
  articleCode: string,
  index: number,
): Promise<{ url: string; storage_path: string } | null> {
  try {
    let fullUrl = imageUrl
    if (!imageUrl.startsWith('http')) {
      if (!imageUrl.includes('/') && !imageUrl.includes('.')) return null
      fullUrl = `https://pims.tradeplace.com/${imageUrl.replace(/^\//, '')}`
    }

    const response = await fetch(fullUrl, { signal: AbortSignal.timeout(15000) })
    if (!response.ok) {
      console.warn(`[pims-img] Failed to download: ${fullUrl} (${response.status})`)
      return null
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    const cleanCode = articleCode.replace(/[^a-zA-Z0-9_-]/g, '_')
    const storagePath = `${supplierId}/${cleanCode}/${index === 0 ? 'main' : `detail_${index}`}.${ext}`

    const blob = await response.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(storagePath, blob, { contentType, upsert: true })

    if (uploadError) {
      console.warn(`[pims-img] Upload failed for ${storagePath}: ${uploadError.message}`)
      return null
    }

    const { data: publicUrlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(storagePath)

    return { url: publicUrlData.publicUrl, storage_path: storagePath }
  } catch (err) {
    console.warn(`[pims-img] Error for ${imageUrl}:`, err)
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let processed = 0
    let succeeded = 0
    let failed = 0

    while (Date.now() - startTime < MAX_RUNTIME_MS) {
      // Fetch a batch of pending items
      const { data: batch, error: fetchErr } = await supabase
        .from('pims_image_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(BATCH_SIZE)

      if (fetchErr) {
        console.error('[pims-img] Fetch error:', fetchErr.message)
        break
      }

      if (!batch || batch.length === 0) {
        console.log('[pims-img] Queue empty, done.')
        break
      }

      // Mark as processing
      const ids = batch.map((r: any) => r.id)
      await supabase
        .from('pims_image_queue')
        .update({ status: 'processing' })
        .in('id', ids)

      // Process in parallel
      const results = await Promise.allSettled(
        batch.map(async (item: any) => {
          const result = await downloadAndStoreImage(
            supabase,
            item.image_url,
            item.supplier_id,
            item.article_code,
            item.image_index,
          )

          if (result) {
            // Upsert product_images record
            await supabase.from('product_images').upsert({
              product_id: item.product_id,
              url: result.url,
              storage_path: result.storage_path,
              type: item.image_index === 0 ? 'main' : 'detail',
              sort_order: item.image_index,
              source: 'pims',
            }, { onConflict: 'product_id,storage_path', ignoreDuplicates: false })

            // Update main image on product
            if (item.image_index === 0) {
              // Check user_override first
              const { data: prod } = await supabase
                .from('products')
                .select('user_override')
                .eq('id', item.product_id)
                .single()
              
              const overrides = prod?.user_override || {}
              if (!overrides['image_url']) {
                await supabase.from('products')
                  .update({ image_url: result.url })
                  .eq('id', item.product_id)
              }
            }

            // Mark done
            await supabase.from('pims_image_queue')
              .update({ status: 'done', processed_at: new Date().toISOString() })
              .eq('id', item.id)

            return true
          } else {
            // Mark failed
            await supabase.from('pims_image_queue')
              .update({ status: 'failed', error_message: 'Download failed', processed_at: new Date().toISOString() })
              .eq('id', item.id)

            return false
          }
        })
      )

      for (const r of results) {
        processed++
        if (r.status === 'fulfilled' && r.value) succeeded++
        else failed++
      }

      console.log(`[pims-img] Batch done: ${succeeded} ok, ${failed} failed, ${processed} total`)
    }

    // Check if more items remain
    const { count } = await supabase
      .from('pims_image_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (count && count > 0) {
      console.log(`[pims-img] ${count} items remaining, self-chaining...`)
      fetch(`${supabaseUrl}/functions/v1/pims-process-images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ continuation: true }),
      }).catch(err => console.warn('[pims-img] Self-chain failed:', err))
    }

    return new Response(
      JSON.stringify({ processed, succeeded, failed, remaining: count || 0 }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[pims-img] Error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
