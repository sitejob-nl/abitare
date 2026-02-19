import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ============================================================
// PIMS Import Edge Function - Phase 1: Parse & Upsert
// Accepts BMEcat XML, TradePI XML, or CSV
// Upserts products, queues images for background processing
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
  catalog_group_id?: string
  // TradePI enrichment fields
  retail_price?: number
  product_family?: string
  product_series?: string
  product_status?: string
  height_mm?: number
  width_mm?: number
  depth_mm?: number
  depth_open_door_mm?: number
  weight_net_kg?: number
  weight_gross_kg?: number
  niche_height_min_mm?: number
  niche_height_max_mm?: number
  niche_width_min_mm?: number
  niche_width_max_mm?: number
  niche_depth_mm?: number
  energy_class?: string
  energy_consumption_kwh?: number
  water_consumption_l?: number
  noise_db?: number
  noise_class?: string
  construction_type?: string
  installation_type?: string
  connection_power_w?: number
  voltage_v?: number
  current_a?: number
  color_main?: string
  color_basic?: string
  datasheet_url?: string
  // Media with types
  media_items?: MediaItem[]
}

interface MediaItem {
  url: string
  media_type: string // photo, dimension_drawing, energy_label, datasheet, 3d_model
  sort_order: number
}

interface CatalogGroup {
  id: string
  name: string
  parent_id?: string
}

interface PimsRequest {
  supplier_id: string
  category_id?: string
  format?: 'bmecat' | 'csv' | 'tradepi'
  file_content?: string // base64
  file_name?: string
  products?: PimsProduct[]
}

// ── Regex-based XML helpers (namespace-tolerant) ──
function xmlGetTag(xml: string, tagName: string): string | null {
  const re = new RegExp(`<(?:\\w+:)?${tagName}[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tagName}>`, 'i')
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
  const re = new RegExp(`<(?:\\w+:)?${tagName}[^>]*>[\\s\\S]*?<\\/(?:\\w+:)?${tagName}>`, 'gi')
  return Array.from(xml.matchAll(re)).map(m => m[0])
}

function xmlGetAttr(xml: string, tagName: string, attrName: string): string | null {
  const re = new RegExp(`<(?:\\w+:)?${tagName}[^>]*\\b${attrName}="([^"]*)"`, 'i')
  const m = xml.match(re)
  return m ? m[1] : null
}

// ── ZIP Detection & Extraction ──
function isZipFile(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04
}

async function unzipFirstXml(zipBytes: Uint8Array): Promise<string> {
  let offset = 0
  while (offset + 30 < zipBytes.length) {
    if (zipBytes[offset] !== 0x50 || zipBytes[offset + 1] !== 0x4B ||
        zipBytes[offset + 2] !== 0x03 || zipBytes[offset + 3] !== 0x04) {
      break
    }

    const compressionMethod = zipBytes[offset + 8] | (zipBytes[offset + 9] << 8)
    const compressedSize = zipBytes[offset + 18] | (zipBytes[offset + 19] << 8) |
                           (zipBytes[offset + 20] << 16) | (zipBytes[offset + 21] << 24)
    const fileNameLength = zipBytes[offset + 26] | (zipBytes[offset + 27] << 8)
    const extraFieldLength = zipBytes[offset + 28] | (zipBytes[offset + 29] << 8)

    const fileName = new TextDecoder().decode(zipBytes.slice(offset + 30, offset + 30 + fileNameLength))
    const dataStart = offset + 30 + fileNameLength + extraFieldLength

    console.log(`[pims-zip] Entry: "${fileName}", compression=${compressionMethod}, compressed=${compressedSize}`)

    if (fileName.toLowerCase().endsWith('.xml') || fileName.toLowerCase().endsWith('.bmecat')) {
      const compressedData = zipBytes.slice(dataStart, dataStart + compressedSize)

      if (compressionMethod === 0) {
        return new TextDecoder().decode(compressedData)
      } else if (compressionMethod === 8) {
        const ds = new DecompressionStream('deflate-raw')
        const writer = ds.writable.getWriter()
        const reader = ds.readable.getReader()
        writer.write(compressedData).then(() => writer.close())

        const chunks: Uint8Array[] = []
        let totalLength = 0
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(value)
          totalLength += value.length
        }

        const result = new Uint8Array(totalLength)
        let pos = 0
        for (const chunk of chunks) {
          result.set(chunk, pos)
          pos += chunk.length
        }
        return new TextDecoder().decode(result)
      } else {
        throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`)
      }
    }

    offset = dataStart + compressedSize
  }

  throw new Error('No XML file found in ZIP archive')
}

// Extract supplier name with multiple fallback strategies
function extractSupplierNames(xml: string): string[] {
  const candidates: string[] = []

  // Strategy 0: CATALOG_NAME from HEADER (BMEcat)
  const headerBlock = xmlGetTag(xml, 'HEADER')
  if (headerBlock) {
    const catalogName = xmlGetTag(headerBlock, 'CATALOG_NAME')
    if (catalogName) {
      const cleaned = catalogName.replace(/\b(producten|products|catalog(ue)?|prijslijst|price\s?list)\b/gi, '').trim()
      if (cleaned.length > 2) candidates.push(cleaned)
      candidates.push(catalogName)
    }
  }

  // Strategy 0b: TradePI CatalogName
  const tradePiHeader = xmlGetTag(xml, 'CatalogDownloadReplyHeader')
  if (tradePiHeader) {
    const catName = xmlGetTag(tradePiHeader, 'CatalogName')
    if (catName) {
      const cleaned = catName.replace(/\b(producten|products|catalog(ue)?|prijslijst|price\s?list)\b/gi, '').trim()
      if (cleaned.length > 2) candidates.push(cleaned)
      candidates.push(catName)
    }
  }

  // Strategy 1: Direct SUPPLIER_NAME tag
  const directName = xmlGetTagFirst(xml, ['SUPPLIER_NAME', 'SUPPLIER_ID'])
  if (directName) candidates.push(directName)

  // Strategy 2: Inside <SUPPLIER> or <HEADER> block
  const supplierBlock = xmlGetTag(xml, 'SUPPLIER') || headerBlock
  if (supplierBlock) {
    const blockName = xmlGetTagFirst(supplierBlock, ['SUPPLIER_NAME', 'SUPPLIER_ID', 'NAME'])
    if (blockName && !candidates.includes(blockName)) candidates.push(blockName)
  }

  // Strategy 3: PARTY block with supplier role
  const partyBlocks = xmlGetAllBlocks(xml, 'PARTY')
  for (const party of partyBlocks) {
    const role = xmlGetTag(party, 'PARTY_ROLE')
    if (role && role.toLowerCase().includes('supplier')) {
      const partyName = xmlGetTagFirst(party, ['PARTY_ID', 'NAME', 'PARTY_NAME'])
      if (partyName && !candidates.includes(partyName)) candidates.push(partyName)
    }
  }

  // Strategy 4: Try PARTY_ID as last resort
  const partyId = xmlGetTagFirst(xml, ['PARTY_ID'])
  if (partyId && !candidates.includes(partyId)) candidates.push(partyId)

  // Strategy 5: Extract email prefixes from <From> tags (e.g. atag_benelux@tradeplace.com → atag_benelux)
  const fromRe = /<From[^>]*>([^<]+)<\/From>/gi
  let fromMatch: RegExpExecArray | null
  while ((fromMatch = fromRe.exec(xml)) !== null) {
    const fromValue = fromMatch[1].trim()
    const atIdx = fromValue.indexOf('@')
    if (atIdx > 0) {
      const prefix = fromValue.substring(0, atIdx)
      if (prefix.length > 2 && !candidates.includes(prefix)) {
        candidates.push(prefix)
        // Also add normalized version (underscores/hyphens → spaces)
        const normalized = prefix.replace(/[_-]/g, ' ')
        if (normalized !== prefix && !candidates.includes(normalized)) {
          candidates.push(normalized)
        }
      }
    }
  }

  return candidates
}

// Legacy wrapper
function extractSupplierName(xml: string): string | null {
  const names = extractSupplierNames(xml)
  return names.length > 0 ? names[0] : null
}

// ── ETIM Feature Code Mapping ──
const ETIM_MAP: Record<string, string> = {
  'EF000008': 'Breedte (mm)',
  'EF000040': 'Hoogte (mm)',
  'EF000049': 'Diepte (mm)',
  'EF000007': 'Gewicht (kg)',
  'EF002680': 'Diepte met deur (mm)',
  'EF008333': 'Inbouw breedte (mm)',
  'EF008334': 'Inbouw hoogte (mm)',
  'EF008335': 'Inbouw diepte (mm)',
  'EF002065': 'Energielabel',
  'EF004149': 'Bewaartijd bij storing (uur)',
  'EF007823': 'Scharnier type',
  'EF000054': 'Kleur',
  'EF000025': 'Voltage (V)',
  'EF000587': 'Frequentie (Hz)',
  'EF000138': 'Vermogen (W)',
  'EF000104': 'Geluidsniveau (dB)',
  'EF003262': 'Netto inhoud (l)',
  'EF003490': 'Netto inhoud vriezer (l)',
  'EF003489': 'Netto inhoud koeler (l)',
  'EF000661': 'Energieverbruik (kWh/jaar)',
  'EF009879': 'Energieklasse',
  'EF002169': 'Aansluitwaarde (kW)',
  'EF000585': 'Stroom (A)',
  'EF010050': 'Breedte nis (mm)',
  'EF010051': 'Hoogte nis (mm)',
  'EF010052': 'Diepte nis (mm)',
}

const ETIM_EV_MAP: Record<string, string> = {
  'EV000154': 'Links',
  'EV000155': 'Rechts',
  'EV000019': 'Ja',
  'EV000020': 'Nee',
  'EV000073': 'Wit',
  'EV000072': 'Zwart',
  'EV000091': 'RVS',
}

// ── Catalog Group System Parser ──
function parseCatalogGroups(xmlString: string): CatalogGroup[] {
  let groupSystem = xmlGetTag(xmlString, 'CATALOG_GROUP_SYSTEM')
  let structureTag = 'CATALOG_STRUCTURE'
  let idTag = ['GROUP_ID', 'CATALOG_GROUP_ID']
  let nameTag = ['GROUP_NAME', 'GROUP_DESCRIPTION']
  let parentTag = ['PARENT_ID', 'PARENT_GROUP_ID']

  if (!groupSystem) {
    groupSystem = xmlGetTag(xmlString, 'CLASSIFICATION_SYSTEM')
    if (groupSystem) {
      structureTag = 'CLASSIFICATION_GROUP'
      idTag = ['CLASS_ID', 'CLASSIFICATION_GROUP_ID', 'GROUP_ID']
      nameTag = ['CLASS_NAME', 'CLASSIFICATION_GROUP_NAME', 'GROUP_NAME', 'GROUP_DESCRIPTION']
      parentTag = ['PARENT_ID', 'PARENT_CLASS_ID', 'PARENT_GROUP_ID']
      console.log(`[pims] Using CLASSIFICATION_SYSTEM fallback for catalog groups`)
    }
  }

  if (!groupSystem) {
    const topTags = ['CATALOG_GROUP_SYSTEM', 'CLASSIFICATION_SYSTEM', 'CATALOG_STRUCTURE', 
                     'T_NEW_CATALOG', 'HEADER', 'ARTICLE', 'PRODUCT']
    const found = topTags.filter(t => xmlGetTag(xmlString, t) !== null)
    console.warn(`[pims] No catalog group system found. Top-level tags present: ${found.join(', ')}`)
    return []
  }

  let structureBlocks = xmlGetAllBlocks(groupSystem, structureTag)
  if (structureBlocks.length === 0 && structureTag === 'CLASSIFICATION_GROUP') {
    structureBlocks = xmlGetAllBlocks(groupSystem, 'CLASSIFICATION')
  }
  if (structureBlocks.length === 0) {
    structureBlocks = xmlGetAllBlocks(groupSystem, 'CATALOG_STRUCTURE')
  }

  const groups: CatalogGroup[] = []

  for (const block of structureBlocks) {
    const groupId = xmlGetTagFirst(block, idTag)
    const groupName = xmlGetTagFirst(block, nameTag)
    const parentId = xmlGetTagFirst(block, parentTag)
    if (!groupId || !groupName) continue

    groups.push({
      id: groupId,
      name: groupName.trim(),
      parent_id: parentId && parentId !== '0' && parentId !== '' ? parentId : undefined,
    })
  }

  console.log(`[pims] Parsed ${groups.length} catalog groups`)
  return groups
}

function parseProductGroupMapping(xmlString: string): Map<string, string> {
  const mapping = new Map<string, string>()
  const mapBlocks = xmlGetAllBlocks(xmlString, 'ARTICLE_TO_CATALOGGROUP_MAP')
  for (const block of mapBlocks) {
    const articleId = xmlGetTagFirst(block, ['ART_ID', 'SUPPLIER_AID', 'SUPPLIER_PID', 'PRODUCT_ID'])
    const groupId = xmlGetTagFirst(block, ['CATALOG_GROUP_ID', 'GROUP_ID'])
    if (articleId && groupId) {
      mapping.set(articleId, groupId)
    }
  }
  console.log(`[pims] Parsed ${mapping.size} product-to-group mappings`)
  return mapping
}

// ── BMEcat XML Parser ──
function parseBMEcatXml(xmlString: string): { products: PimsProduct[]; catalogGroups: CatalogGroup[]; productGroupMap: Map<string, string> } {
  const products: PimsProduct[] = []
  const catalogGroups = parseCatalogGroups(xmlString)
  const productGroupMap = parseProductGroupMapping(xmlString)

  let articleBlocks = xmlGetAllBlocks(xmlString, 'ARTICLE')
  if (articleBlocks.length === 0) articleBlocks = xmlGetAllBlocks(xmlString, 'PRODUCT')
  if (articleBlocks.length === 0) articleBlocks = xmlGetAllBlocks(xmlString, 'ITEM')

  for (const block of articleBlocks) {
    const code = xmlGetTagFirst(block, ['SUPPLIER_AID', 'SUPPLIER_PID', 'PRODUCT_ID'])
    if (!code) continue

    const rawName = xmlGetTagFirst(block, ['DESCRIPTION_SHORT']) || code
    const name = rawName.startsWith(code + ',') 
      ? rawName.slice(code.length + 1).trim() 
      : rawName.startsWith(code + ' ') 
        ? rawName.slice(code.length + 1).trim() 
        : rawName

    const product: PimsProduct = {
      article_code: code,
      name,
      description: xmlGetTagFirst(block, ['DESCRIPTION_LONG']) || undefined,
      ean_code: xmlGetTagFirst(block, ['EAN', 'INTERNATIONAL_PID']) || undefined,
      catalog_group_id: productGroupMap.get(code) || undefined,
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

    // Parse features/specifications with ETIM translation
    const featureBlocks = xmlGetAllBlocks(block, 'FEATURE')
    const specs: Record<string, unknown> = {}
    for (const feat of featureBlocks) {
      const fname = xmlGetTagFirst(feat, ['FNAME', 'FEATURE_NAME'])
      const fvalue = xmlGetTagFirst(feat, ['FVALUE', 'FEATURE_VALUE'])
      if (!fname || !fvalue) continue
      
      const readableName = ETIM_MAP[fname]
      if (!readableName) continue
      
      const readableValue = ETIM_EV_MAP[fvalue] || fvalue
      specs[readableName] = readableValue
    }
    if (Object.keys(specs).length > 0) product.specifications = specs

    products.push(product)
  }

  return { products, catalogGroups, productGroupMap }
}

// ══════════════════════════════════════════════════════════════
// TradePI XML Parser (Tradeplace Product Information)
// Based on Python TradeplaceParser - handles Miele, BSH, etc.
// ══════════════════════════════════════════════════════════════

const TRADEPI_PROPERTY_MAPPING: Record<string, string> = {
  // Description
  'CODE': 'name',
  'SHORT_DESCRIPTION': 'short_description',
  'LONG_DESCRIPTION': 'long_description',
  'FAMILY': 'product_family',
  'PRODUCT_SERIES': 'product_series',
  // Dimensions
  'HEIGHT': 'height_mm',
  'WIDTH': 'width_mm',
  'DEPTH': 'depth_mm',
  'DEPTH_OPEN_DOOR': 'depth_open_door_mm',
  'WEIGHT_NET': 'weight_net_kg',
  'WEIGHT_GROSS': 'weight_gross_kg',
  // Niche
  'HEIGHT_NICHE_SIZE_MIN': 'niche_height_min_mm',
  'HEIGHT_NICHE_SIZE_MAX': 'niche_height_max_mm',
  'WIDTH_NICHE_SIZE_MIN': 'niche_width_min_mm',
  'WIDTH_NICHE_SIZE_MAX': 'niche_width_max_mm',
  'DEPTH_NICHE_SIZE': 'niche_depth_mm',
  // Energy
  'ENERGY_CLASS_2017': 'energy_class',
  'EPEC_DISH_2017': 'energy_consumption_kwh',
  'WATER_CONS_ECO_2017': 'water_consumption_l',
  'NOISE_2017': 'noise_db',
  'NOISE_CLASS_2017': 'noise_class',
  // Installation
  'CONSTR_TYPE': 'construction_type',
  'INST_TYPE': 'installation_type',
  'CONNECTION': 'connection_power_w',
  'VOLTAGE': 'voltage_v',
  'CURRENT': 'current_a',
  // Color
  'COL_MAIN': 'color_main',
  'COL_BASIC': 'color_basic',
}

const TRADEPI_INT_FIELDS = new Set([
  'height_mm', 'width_mm', 'depth_mm', 'depth_open_door_mm',
  'niche_height_min_mm', 'niche_height_max_mm',
  'niche_width_min_mm', 'niche_width_max_mm', 'niche_depth_mm',
  'noise_db', 'connection_power_w', 'voltage_v', 'current_a',
])

const TRADEPI_FLOAT_FIELDS = new Set([
  'weight_net_kg', 'weight_gross_kg',
  'energy_consumption_kwh', 'water_consumption_l',
])

function convertTradepiValue(fieldName: string, value: string): number | string | null {
  if (!value || value.trim() === '') return null
  value = value.trim()

  if (TRADEPI_INT_FIELDS.has(fieldName)) {
    const n = parseInt(String(parseFloat(value.replace(',', '.'))))
    return isNaN(n) ? null : n
  }
  if (TRADEPI_FLOAT_FIELDS.has(fieldName)) {
    const n = parseFloat(value.replace(',', '.'))
    return isNaN(n) ? null : n
  }
  return value
}

function parseTradepiPrice(otherData: string): number | undefined {
  const rrpBlock = xmlGetTag(otherData, 'RecommendedRetailPrice')
  if (!rrpBlock) return undefined

  const amountStr = xmlGetTag(rrpBlock, 'Amount')
  const decimalsStr = xmlGetTag(rrpBlock, 'NumberOfDecimal')
  if (!amountStr) return undefined

  const amount = parseInt(amountStr)
  const decimals = parseInt(decimalsStr || '2')
  if (isNaN(amount)) return undefined

  // Convert to actual price: e.g. 141900 with 2 decimals = €1419.00
  return amount / Math.pow(10, decimals)
}

function parseTradepiDate(container: string, tagName: string): string | undefined {
  const dateBlock = xmlGetTag(container, tagName)
  if (!dateBlock) return undefined

  const year = xmlGetTag(dateBlock, 'Year')
  const month = (xmlGetTag(dateBlock, 'Month') || '').padStart(2, '0')
  const day = (xmlGetTag(dateBlock, 'Day') || '').padStart(2, '0')
  if (!year) return undefined
  return `${year}-${month}-${day}`
}

function parseTradePlaceCatalog(xmlString: string): { products: PimsProduct[]; familyCodes: Set<string> } {
  const products: PimsProduct[] = []
  const familyCodes = new Set<string>()

  // Parse metadata
  const header = xmlGetTag(xmlString, 'CatalogDownloadReplyHeader')
  if (header) {
    const catName = xmlGetTag(header, 'CatalogName')
    const catDate = parseTradepiDate(header, 'CatalogCreationDate')
    console.log(`[tradepi] Catalog: ${catName}, Date: ${catDate}`)
  }

  const productBlocks = xmlGetAllBlocks(xmlString, 'Product')
  console.log(`[tradepi] Found ${productBlocks.length} Product blocks`)

  for (const productXml of productBlocks) {
    try {
      const piData = xmlGetTag(productXml, 'PIData')
      if (!piData) continue

      const articleCode = xmlGetTag(piData, 'ProductCode') || ''
      if (!articleCode) continue

      const eanCode = xmlGetTag(piData, 'EANArticleCode') || undefined
      const familyName = xmlGetAttr(piData, 'ProductFamily', 'familyName') || ''
      if (familyName) familyCodes.add(familyName)

      const product: PimsProduct = {
        article_code: articleCode,
        ean_code: eanCode,
        name: articleCode, // fallback, overridden by CODE/SHORT_DESCRIPTION property
        catalog_group_id: familyName || undefined,
        media_items: [],
      }

      const specs: Record<string, unknown> = {}
      const usps: string[] = []

      // Parse PIProperty elements
      const propRe = /<PIProperty\s+name="([^"]*)"(?:\s+description="([^"]*)")?[^>]*>([\s\S]*?)<\/PIProperty>/gi
      let propMatch: RegExpExecArray | null
      while ((propMatch = propRe.exec(piData)) !== null) {
        const propName = propMatch[1]
        const propDesc = propMatch[2] || propName
        const propValue = propMatch[3].trim()

        // USPs
        if (propName.startsWith('USP_')) {
          if (propValue) usps.push(propValue)
          continue
        }

        // Media properties
        if (propName === 'PRODUCT_IMAGE' && propValue) {
          product.media_items!.unshift({ url: propValue, media_type: 'photo', sort_order: 0 })
          continue
        }
        if (propName === 'MEASURE_IMAGE' && propValue) {
          product.media_items!.push({ url: propValue, media_type: 'dimension_drawing', sort_order: 50 })
          continue
        }
        if (propName === 'PANEL_IMAGE' && propValue) {
          product.media_items!.push({ url: propValue, media_type: 'photo', sort_order: 10 })
          continue
        }
        if (propName === 'ENERGY_LABEL' && propValue) {
          product.media_items!.push({ url: propValue, media_type: 'energy_label', sort_order: 60 })
          continue
        }
        if (propName === 'PRODUCT_FICHE' && propValue) {
          product.datasheet_url = propValue
          product.media_items!.push({ url: propValue, media_type: 'datasheet', sort_order: 70 })
          continue
        }
        if (propName.startsWith('ADD_IMAGE') && propValue) {
          product.media_items!.push({ url: propValue, media_type: 'photo', sort_order: 20 })
          continue
        }

        // Mapped fields
        if (propName in TRADEPI_PROPERTY_MAPPING) {
          const fieldName = TRADEPI_PROPERTY_MAPPING[propName]
          const converted = convertTradepiValue(fieldName, propValue)
          if (converted !== null) {
            if (fieldName === 'name' || fieldName === 'short_description' || fieldName === 'long_description') {
              if (fieldName === 'name') product.name = String(converted)
              else if (fieldName === 'short_description') product.description = String(converted)
              // long_description appended to description
              else if (fieldName === 'long_description' && converted) {
                product.description = product.description 
                  ? `${product.description}\n\n${converted}` 
                  : String(converted)
              }
            } else {
              (product as any)[fieldName] = converted
            }
          }
          continue
        }

        // Store as specification
        if (propValue) {
          specs[propDesc] = propValue
        }
      }

      // Store USPs in specs
      if (usps.length > 0) specs['USPs'] = usps

      if (Object.keys(specs).length > 0) product.specifications = specs

      // Parse OtherData: prices, dates, assets
      const otherData = xmlGetTag(productXml, 'OtherData')
      if (otherData) {
        // Price
        const price = parseTradepiPrice(otherData)
        if (price) product.retail_price = price

        // Status
        const status = xmlGetTag(otherData, 'ProductStatus')
        if (status) product.product_status = status

        // Assets (additional media)
        const assetRe = /<Asset\s+source="([^"]*)"[^>]*>([\s\S]*?)<\/Asset>/gi
        let assetMatch: RegExpExecArray | null
        while ((assetMatch = assetRe.exec(otherData)) !== null) {
          const assetUrl = assetMatch[1]
          const assetBody = assetMatch[2]

          // Extract AssetProperty elements
          const assetProps: Record<string, string> = {}
          const apRe = /<AssetProperty\s+name="([^"]*)"[^>]*>([\s\S]*?)<\/AssetProperty>/gi
          let apMatch: RegExpExecArray | null
          while ((apMatch = apRe.exec(assetBody)) !== null) {
            assetProps[apMatch[1]] = apMatch[2].trim()
          }

          const format = (assetProps['format'] || '').toLowerCase()
          const subject = (assetProps['subject'] || '').toLowerCase()
          const purpose = (assetProps['purpose'] || '').toLowerCase()

          let mediaType = 'photo'
          let sortOrder = 30

          if (format.includes('image')) {
            if (subject.includes('installation') || subject.includes('diagram')) {
              mediaType = 'dimension_drawing'
              sortOrder = 51
            } else if (subject.includes('energy')) {
              mediaType = 'energy_label'
              sortOrder = 61
            } else if (purpose.includes('main')) {
              sortOrder = 1
            }
          } else if (format.includes('pdf')) {
            if (subject.includes('energy')) {
              mediaType = 'energy_label'
              sortOrder = 62
            } else if (subject.includes('data sheet') || subject.includes('fiche')) {
              mediaType = 'datasheet'
              sortOrder = 71
              if (!product.datasheet_url) product.datasheet_url = assetUrl
            } else {
              mediaType = 'datasheet'
              sortOrder = 72
            }
          } else if (format.includes('zip')) {
            mediaType = '3d_model'
            sortOrder = 80
          }

          product.media_items!.push({ url: assetUrl, media_type: mediaType, sort_order: sortOrder })
        }
      }

      // Parse UnitOfMeasures as fallback for dimensions
      const unitsBlock = xmlGetTag(productXml, 'UnitOfMeasures')
      if (unitsBlock) {
        // Find PCE type unit
        const uomBlocks = xmlGetAllBlocks(unitsBlock, 'UnitOfMeasure')
        for (const uom of uomBlocks) {
          if (!uom.includes('type="PCE"')) continue
          const uomPropRe = /<UnitOfMeasureProperty\s+name="([^"]*)"[^>]*>([\s\S]*?)<\/UnitOfMeasureProperty>/gi
          let uomMatch: RegExpExecArray | null
          while ((uomMatch = uomPropRe.exec(uom)) !== null) {
            const uomName = uomMatch[1]
            const uomValue = uomMatch[2].trim()
            const fieldMapping: Record<string, string> = {
              'HEIGHT': 'height_mm',
              'WIDTH': 'width_mm',
              'DEPTH': 'depth_mm',
              'WEIGHT_NET': 'weight_net_kg',
              'WEIGHT_GROSS': 'weight_gross_kg',
            }
            if (uomName in fieldMapping) {
              const field = fieldMapping[uomName]
              if ((product as any)[field] == null) {
                (product as any)[field] = convertTradepiValue(field, uomValue)
              }
            }
          }
        }
      }

      // Fallback name
      if (product.name === articleCode && product.description) {
        product.name = product.description.split('\n')[0].substring(0, 200)
      }

      // Convert media_items to image_urls for backward compat (photos only)
      const photoUrls = (product.media_items || [])
        .filter(m => m.media_type === 'photo')
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(m => m.url)
      if (photoUrls.length > 0) product.image_urls = photoUrls

      products.push(product)
    } catch (e) {
      console.warn(`[tradepi] Error parsing product:`, e)
      continue
    }
  }

  console.log(`[tradepi] Parsed ${products.length} products, ${familyCodes.size} families`)
  return { products, familyCodes }
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

// ── Format auto-detection ──
function detectXmlFormat(xml: string): 'tradepi' | 'bmecat' {
  // TradePI: has <Product> with <PIData> children
  if (xml.includes('<PIData>') || xml.includes('<CatalogDownloadReply')) {
    return 'tradepi'
  }
  return 'bmecat'
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
    let catalogGroups: CatalogGroup[] = []
    let tradepiFamilyCodes = new Set<string>()
    let isTradepi = false

    if (isRawXml) {
      category_id = url.searchParams.get('category_id') || undefined
      file_name = url.searchParams.get('file_name') || 'tradeplace-push.xml'
      const debug = url.searchParams.get('debug') === 'true'

      const rawBytes = new Uint8Array(await req.arrayBuffer())
      let xmlText: string

      if (isZipFile(rawBytes)) {
        console.log(`[pims] Detected ZIP file (${rawBytes.length} bytes), extracting XML...`)
        xmlText = await unzipFirstXml(rawBytes)
        console.log(`[pims] Extracted XML from ZIP (${xmlText.length} chars), first 500: ${xmlText.substring(0, 500)}`)
      } else {
        xmlText = new TextDecoder().decode(rawBytes)
        console.log(`[pims] Received raw XML (${xmlText.length} chars), first 500: ${xmlText.substring(0, 500)}`)
      }

      // Auto-detect format
      const detectedFormat = detectXmlFormat(xmlText)
      console.log(`[pims] Auto-detected format: ${detectedFormat}`)

      const xmlSupplierNames = extractSupplierNames(xmlText)
      const xmlSupplierName = xmlSupplierNames.length > 0 ? xmlSupplierNames[0] : null
      const qsSupplierId = url.searchParams.get('supplier_id')
      console.log(`[pims] Supplier detection: qs=${qsSupplierId}, candidates=${JSON.stringify(xmlSupplierNames)}`)

      if (qsSupplierId) {
        supplier_id = qsSupplierId
      } else if (xmlSupplierNames.length > 0) {
        console.log(`[pims] Auto-detecting supplier from XML candidates: ${JSON.stringify(xmlSupplierNames)}`)

        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('id, name, code, pims_aliases')
          .eq('is_active', true)

        console.log(`[pims] Active suppliers in DB: ${(suppliers || []).map((s: any) => `${s.name} (${s.code}) aliases=${(s.pims_aliases || []).join(',')}`).join('; ')}`)

        let match: any = null
        let matchedCandidate = ''
        for (const candidate of xmlSupplierNames) {
          const normalizedName = candidate.trim().toLowerCase()
          const normalizedClean = normalizedName.replace(/[_-]/g, ' ')
          match = (suppliers || []).find((s: any) => {
            const sName = s.name.toLowerCase()
            const sCode = (s.code || '').toLowerCase()
            const sNameClean = sName.replace(/[_-]/g, ' ')
            if (normalizedName.includes(sName) || sName.includes(normalizedName)
              || normalizedName.includes(sCode) || sCode === normalizedName
              || normalizedClean.includes(sNameClean) || sNameClean.includes(normalizedClean)) return true
            const aliases: string[] = s.pims_aliases || []
            return aliases.some((alias: string) => {
              const a = alias.toLowerCase()
              const aClean = a.replace(/[_-]/g, ' ')
              return normalizedName.includes(a) || a.includes(normalizedName)
                || normalizedClean.includes(aClean) || aClean.includes(normalizedClean)
            })
          })
          if (match) {
            matchedCandidate = candidate
            break
          }
        }

        if (match) {
          supplier_id = match.id
          console.log(`[pims] Matched supplier: ${match.name} (${match.id}) via candidate "${matchedCandidate}"`)
        } else {
          const availableNames = (suppliers || []).map((s: any) => s.name).join(', ')
          console.error(`[pims] No supplier match for candidates ${JSON.stringify(xmlSupplierNames)}. Available: ${availableNames}`)
          const debugInfo = debug ? { xml_preview: xmlText.substring(0, 500), detected_names: xmlSupplierNames, available_suppliers: (suppliers || []).map((s: any) => ({ name: s.name, code: s.code, aliases: s.pims_aliases })) } : undefined
          return new Response(
            JSON.stringify({ error: `Leverancier "${xmlSupplierName}" niet gevonden. Voeg deze toe via Instellingen → Leveranciers, of configureer een alias in het veld 'pims_aliases'. Beschikbare leveranciers: ${availableNames}`, detected_candidates: xmlSupplierNames, debug: debugInfo }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        console.error(`[pims] No supplier found in XML. First 500 chars: ${xmlText.substring(0, 500)}`)
        const debugInfo = debug ? { xml_preview: xmlText.substring(0, 500) } : undefined
        return new Response(
          JSON.stringify({ error: 'Geen leverancier gevonden in XML en geen supplier_id meegegeven.', debug: debugInfo }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (detectedFormat === 'tradepi') {
        isTradepi = true
        const result = parseTradePlaceCatalog(xmlText)
        products = result.products
        tradepiFamilyCodes = result.familyCodes
      } else {
        const parseResult = parseBMEcatXml(xmlText)
        products = parseResult.products
        catalogGroups = parseResult.catalogGroups
      }
      console.log(`[pims] Parsed ${products.length} products from ${detectedFormat} XML`)
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

        // Auto-detect XML format within uploaded files
        const detectedFormat = body.format === 'bmecat' || body.format === 'tradepi'
          ? detectXmlFormat(text)
          : body.format

        if (detectedFormat === 'tradepi') {
          isTradepi = true
          const result = parseTradePlaceCatalog(text)
          products = result.products
          tradepiFamilyCodes = result.familyCodes
        } else if (detectedFormat === 'bmecat' || body.format === 'bmecat') {
          const parseResult = parseBMEcatXml(text)
          products = parseResult.products
          catalogGroups = parseResult.catalogGroups
        } else if (body.format === 'csv') {
          products = parseCsv(text)
        }
      }
    }

    if (products.length === 0) {
      console.error(`[pims] No products found. Format: ${isRawXml ? 'raw-xml' : 'json-upload'}, supplier_id: ${supplier_id}`)
      return new Response(
        JSON.stringify({ error: 'No products found in input' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[pims] Processing ${products.length} products for supplier ${supplier_id}`)

    // Fetch supplier info
    const { data: supplierData } = await supabase
      .from('suppliers')
      .select('name, price_factor')
      .eq('id', supplier_id)
      .single()
    const priceFactor = supplierData?.price_factor || 1.0
    const supplierName = supplierData?.name || 'Unknown'
    console.log(`[pims] Supplier: ${supplierName}, price_factor: ${priceFactor}`)

    // ── Category mapping for TradePI families ──
    const familyCategoryMap = new Map<string, string>() // familyName -> product_categories.id
    if (isTradepi && tradepiFamilyCodes.size > 0) {
      console.log(`[tradepi] Mapping ${tradepiFamilyCodes.size} families to categories`)

      // Fetch existing seeded categories
      const { data: existingCats } = await supabase
        .from('product_categories')
        .select('id, code')
        .in('code', Array.from(tradepiFamilyCodes))

      for (const cat of existingCats || []) {
        familyCategoryMap.set(cat.code, cat.id)
      }

      // Create missing families under brand category
      const missingFamilies = Array.from(tradepiFamilyCodes).filter(f => !familyCategoryMap.has(f))
      if (missingFamilies.length > 0) {
        // Find or create brand category
        const brandCode = `brand-${supplier_id}`
        let { data: brandRow } = await supabase
          .from('product_categories')
          .select('id')
          .eq('code', brandCode)
          .eq('supplier_id', supplier_id)
          .single()

        if (!brandRow) {
          // Ensure "Apparatuur" parent exists
          let { data: apparatuurRow } = await supabase
            .from('product_categories')
            .select('id')
            .eq('code', 'apparatuur')
            .is('supplier_id', null)
            .single()

          if (!apparatuurRow) {
            const { data: created } = await supabase
              .from('product_categories')
              .insert({ code: 'apparatuur', name: 'Apparatuur', is_active: true })
              .select('id')
              .single()
            apparatuurRow = created
          }

          const { data: created } = await supabase
            .from('product_categories')
            .insert({
              code: brandCode,
              name: supplierName,
              parent_id: apparatuurRow?.id || null,
              supplier_id,
              is_active: true,
            })
            .select('id')
            .single()
          brandRow = created
        }

        for (const familyCode of missingFamilies) {
          const code = `${supplier_id}-${familyCode}`
          const { data: row } = await supabase
            .from('product_categories')
            .upsert({
              code,
              name: familyCode.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
              parent_id: brandRow?.id || null,
              supplier_id,
              is_active: true,
            }, { onConflict: 'code' })
            .select('id')
            .single()
          if (row) familyCategoryMap.set(familyCode, row.id)
        }
      }

      console.log(`[tradepi] Mapped ${familyCategoryMap.size} families to categories`)
    }

    // ── Upsert catalog group hierarchy as product_categories (BMEcat) ──
    const categoryIdMap = new Map<string, string>()
    if (catalogGroups.length > 0) {
      console.log(`[pims] Upserting ${catalogGroups.length} catalog groups for supplier ${supplierName}`)

      let { data: apparatuurRow } = await supabase
        .from('product_categories')
        .select('id')
        .eq('code', 'apparatuur')
        .is('supplier_id', null)
        .single()

      let apparatuurId = apparatuurRow?.id
      if (!apparatuurId) {
        const { data: created } = await supabase
          .from('product_categories')
          .insert({ code: 'apparatuur', name: 'Apparatuur', is_active: true })
          .select('id')
          .single()
        apparatuurId = created?.id
      }

      const brandCode = `brand-${supplier_id}`
      let { data: brandRow } = await supabase
        .from('product_categories')
        .select('id')
        .eq('code', brandCode)
        .eq('supplier_id', supplier_id)
        .single()

      let brandId = brandRow?.id
      if (!brandId) {
        const { data: created } = await supabase
          .from('product_categories')
          .insert({
            code: brandCode,
            name: supplierName,
            parent_id: apparatuurId || null,
            supplier_id,
            is_active: true,
          })
          .select('id')
          .single()
        brandId = created?.id
      }

      const groupParentMap = new Map<string, string | undefined>()
      const groupNameMap = new Map<string, string>()
      for (const g of catalogGroups) {
        groupParentMap.set(g.id, g.parent_id)
        groupNameMap.set(g.id, g.name)
      }

      const rootGroupIds = new Set<string>()
      for (const g of catalogGroups) {
        if (!g.parent_id || !groupNameMap.has(g.parent_id)) {
          rootGroupIds.add(g.id)
        }
      }

      for (const g of catalogGroups) {
        if (!rootGroupIds.has(g.id)) continue
        const code = `${supplier_id}-${g.id}`
        const { data: row } = await supabase
          .from('product_categories')
          .upsert(
            { code, name: g.name, parent_id: brandId, supplier_id, is_active: true },
            { onConflict: 'code' }
          )
          .select('id')
          .single()
        if (row) categoryIdMap.set(g.id, row.id)
      }

      const remaining = catalogGroups.filter(g => !rootGroupIds.has(g.id))
      let maxPasses = 10
      let toProcess = [...remaining]
      while (toProcess.length > 0 && maxPasses-- > 0) {
        const stillUnresolved: typeof toProcess = []
        for (const g of toProcess) {
          const parentDbId = g.parent_id ? categoryIdMap.get(g.parent_id) : brandId
          if (!parentDbId) {
            stillUnresolved.push(g)
            continue
          }
          const code = `${supplier_id}-${g.id}`
          const { data: row } = await supabase
            .from('product_categories')
            .upsert(
              { code, name: g.name, parent_id: parentDbId, supplier_id, is_active: true },
              { onConflict: 'code' }
            )
            .select('id')
            .single()
          if (row) categoryIdMap.set(g.id, row.id)
        }
        if (stillUnresolved.length === toProcess.length) {
          console.warn(`[pims] ${stillUnresolved.length} orphan groups could not be resolved`)
          break
        }
        toProcess = stillUnresolved
      }

      console.log(`[pims] Upserted ${categoryIdMap.size} categories`)
    }

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

        // Resolve category
        let resolvedCategoryId: string | null = null
        if (isTradepi && p.catalog_group_id) {
          resolvedCategoryId = familyCategoryMap.get(p.catalog_group_id) || null
        } else if (p.catalog_group_id && categoryIdMap.has(p.catalog_group_id)) {
          resolvedCategoryId = categoryIdMap.get(p.catalog_group_id) || null
        }
        if (!resolvedCategoryId) resolvedCategoryId = category_id || null

        const productData: Record<string, unknown> = {
          article_code: p.article_code,
          supplier_id,
          category_id: resolvedCategoryId,
          is_active: true,
          pims_last_synced: new Date().toISOString(),
        }

        if (!overrides['name']) productData.name = p.name
        if (!overrides['description'] && p.description) productData.description = p.description
        if (!overrides['ean_code'] && p.ean_code) productData.ean_code = p.ean_code
        if (!overrides['cost_price'] && p.cost_price) productData.cost_price = p.cost_price
        
        // Calculate base_price
        if (!overrides['base_price']) {
          if (p.base_price) {
            productData.base_price = p.base_price
          } else if (p.cost_price && priceFactor > 1.0) {
            productData.base_price = Math.round(p.cost_price * priceFactor * 100) / 100
          }
        }
        
        if (p.specifications && !overrides['specifications']) productData.specifications = p.specifications

        // TradePI enrichment fields
        if (p.retail_price && !overrides['retail_price']) productData.retail_price = p.retail_price
        if (p.product_family && !overrides['product_family']) productData.product_family = p.product_family
        if (p.product_series && !overrides['product_series']) productData.product_series = p.product_series
        if (p.product_status) productData.product_status = p.product_status
        if (p.datasheet_url && !overrides['datasheet_url']) productData.datasheet_url = p.datasheet_url

        // Dimensions - from TradePI direct fields or from BMEcat specs
        if (!overrides['width_mm']) {
          if (p.width_mm) productData.width_mm = p.width_mm
          else if (p.specifications?.['Breedte (mm)']) {
            const v = parseInt(String(p.specifications['Breedte (mm)']))
            if (!isNaN(v)) productData.width_mm = v
          }
        }
        if (!overrides['height_mm']) {
          if (p.height_mm) productData.height_mm = p.height_mm
          else if (p.specifications?.['Hoogte (mm)']) {
            const v = parseInt(String(p.specifications['Hoogte (mm)']))
            if (!isNaN(v)) productData.height_mm = v
          }
        }
        if (!overrides['depth_mm']) {
          if (p.depth_mm) productData.depth_mm = p.depth_mm
          else if (p.specifications?.['Diepte (mm)']) {
            const v = parseInt(String(p.specifications['Diepte (mm)']))
            if (!isNaN(v)) productData.depth_mm = v
          }
        }

        // Additional enrichment fields
        if (p.depth_open_door_mm && !overrides['depth_open_door_mm']) productData.depth_open_door_mm = p.depth_open_door_mm
        if (p.weight_net_kg && !overrides['weight_net_kg']) productData.weight_net_kg = p.weight_net_kg
        if (p.weight_gross_kg && !overrides['weight_gross_kg']) productData.weight_gross_kg = p.weight_gross_kg
        if (p.niche_height_min_mm && !overrides['niche_height_min_mm']) productData.niche_height_min_mm = p.niche_height_min_mm
        if (p.niche_height_max_mm && !overrides['niche_height_max_mm']) productData.niche_height_max_mm = p.niche_height_max_mm
        if (p.niche_width_min_mm && !overrides['niche_width_min_mm']) productData.niche_width_min_mm = p.niche_width_min_mm
        if (p.niche_width_max_mm && !overrides['niche_width_max_mm']) productData.niche_width_max_mm = p.niche_width_max_mm
        if (p.niche_depth_mm && !overrides['niche_depth_mm']) productData.niche_depth_mm = p.niche_depth_mm
        if (p.energy_class && !overrides['energy_class']) productData.energy_class = p.energy_class
        if (p.energy_consumption_kwh && !overrides['energy_consumption_kwh']) productData.energy_consumption_kwh = p.energy_consumption_kwh
        if (p.water_consumption_l && !overrides['water_consumption_l']) productData.water_consumption_l = p.water_consumption_l
        if (p.noise_db && !overrides['noise_db']) productData.noise_db = p.noise_db
        if (p.noise_class && !overrides['noise_class']) productData.noise_class = p.noise_class
        if (p.construction_type && !overrides['construction_type']) productData.construction_type = p.construction_type
        if (p.installation_type && !overrides['installation_type']) productData.installation_type = p.installation_type
        if (p.connection_power_w && !overrides['connection_power_w']) productData.connection_power_w = p.connection_power_w
        if (p.voltage_v && !overrides['voltage_v']) productData.voltage_v = p.voltage_v
        if (p.current_a && !overrides['current_a']) productData.current_a = p.current_a
        if (p.color_main && !overrides['color_main']) productData.color_main = p.color_main
        if (p.color_basic && !overrides['color_basic']) productData.color_basic = p.color_basic

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

        // Queue media items (TradePI with media_type) or legacy image_urls
        if (p.media_items && p.media_items.length > 0) {
          for (const media of p.media_items) {
            imageQueueRows.push({
              product_id: productId,
              supplier_id,
              article_code: p.article_code,
              image_url: media.url,
              image_index: media.sort_order,
              media_type: media.media_type,
              status: 'pending',
            })
          }
        } else if (p.image_urls && p.image_urls.length > 0) {
          const maxImages = Math.min(p.image_urls.length, 5)
          for (let imgIdx = 0; imgIdx < maxImages; imgIdx++) {
            imageQueueRows.push({
              product_id: productId,
              supplier_id,
              article_code: p.article_code,
              image_url: p.image_urls[imgIdx],
              image_index: imgIdx,
              media_type: 'photo',
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
        source: isTradepi ? 'pims-tradepi' : 'pims',
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
        // Fire and forget
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