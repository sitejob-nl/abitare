import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ============================================================
// PIMS Process Images - URL-only mode
// Stores manufacturer source URLs directly in product_images.
// No downloads to Supabase Storage.
// ============================================================

const BATCH_SIZE = 100
const MAX_RUNTIME_MS = 120_000

function normalizeUrl(imageUrl: string): string {
  if (imageUrl.startsWith('http')) return imageUrl
  if (!imageUrl.includes('/') && !imageUrl.includes('.')) return imageUrl
  return `https://pims.tradeplace.com/${imageUrl.replace(/^\//, '')}`
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

      const ids = batch.map((r: any) => r.id)
      await supabase
        .from('pims_image_queue')
        .update({ status: 'processing' })
        .in('id', ids)

      const results = await Promise.allSettled(
        batch.map(async (item: any) => {
          const mediaType = item.media_type || 'photo'
          const sourceUrl = normalizeUrl(item.image_url)
          const storagePath = `url-ref/${item.supplier_id}/${item.article_code}/${mediaType}-${item.image_index}`

          // Upsert product_images with source URL
          const { error: imgError } = await supabase.from('product_images').upsert({
            product_id: item.product_id,
            url: sourceUrl,
            storage_path: storagePath,
            type: mediaType === 'photo'
              ? (item.image_index === 0 ? 'main' : 'detail')
              : mediaType,
            media_type: mediaType,
            sort_order: item.image_index,
            source: 'pims',
          }, { onConflict: 'product_id,storage_path', ignoreDuplicates: false })

          if (imgError) {
            console.warn(`[pims-img] Upsert failed: ${imgError.message}`)
            await supabase.from('pims_image_queue')
              .update({ status: 'failed', error_message: imgError.message, processed_at: new Date().toISOString() })
              .eq('id', item.id)
            return false
          }

          // Update main image on product (photo index 0 only)
          if (mediaType === 'photo' && item.image_index === 0) {
            const { data: prod } = await supabase
              .from('products')
              .select('user_override')
              .eq('id', item.product_id)
              .single()

            const overrides = prod?.user_override || {}
            if (!(overrides as any)['image_url']) {
              await supabase.from('products')
                .update({ image_url: sourceUrl })
                .eq('id', item.product_id)
            }
          }

          await supabase.from('pims_image_queue')
            .update({ status: 'done', processed_at: new Date().toISOString() })
            .eq('id', item.id)

          return true
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
