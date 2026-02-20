import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface PriceGroup {
  id: string
  code: string
  name: string
  is_glass: boolean
  sort_order: number
  collection?: string
  material_type?: string
  material_description?: string
}

interface PriceGroupSelectorProps {
  supplierId: string
  value?: string | null
  onChange: (priceGroupId: string | null, priceGroup: PriceGroup | null) => void
  disabled?: boolean
  label?: string
  placeholder?: string
  showGlassIndicator?: boolean
  className?: string
}

export function PriceGroupSelector({
  supplierId,
  value,
  onChange,
  disabled = false,
  label = 'Prijsgroep',
  placeholder = 'Selecteer prijsgroep...',
  showGlassIndicator = true,
  className,
}: PriceGroupSelectorProps) {
  const [priceGroups, setPriceGroups] = useState<PriceGroup[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!supplierId) {
      setPriceGroups([])
      return
    }

    const fetchPriceGroups = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('price_groups')
          .select('*')
          .eq('supplier_id', supplierId)
          .order('sort_order', { ascending: true })

        if (error) throw error
        setPriceGroups(data || [])
      } catch (err) {
        console.error('Error fetching price groups:', err)
        setPriceGroups([])
      } finally {
        setLoading(false)
      }
    }

    fetchPriceGroups()
  }, [supplierId])

  const handleChange = (newValue: string) => {
    if (newValue === '__clear__') {
      onChange(null, null)
      return
    }
    const selected = priceGroups.find(pg => pg.id === newValue)
    onChange(newValue, selected || null)
  }

  const fullDoorGroups = priceGroups.filter(pg => !pg.is_glass)
  const glassDoorGroups = priceGroups.filter(pg => pg.is_glass)
  const selectedGroup = priceGroups.find(pg => pg.id === value)

  if (loading) {
    return (
      <div className={className}>
        {label && <Label className="mb-2 block">{label}</Label>}
        <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Laden...</span>
        </div>
      </div>
    )
  }

  if (priceGroups.length === 0) {
    return (
      <div className={className}>
        {label && <Label className="mb-2 block text-muted-foreground">{label}</Label>}
        <div className="h-10 px-3 border rounded-md bg-muted/30 flex items-center">
          <span className="text-sm text-muted-foreground">
            Geen prijsgroepen beschikbaar
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {label && <Label className="mb-2 block">{label}</Label>}
      <Select
        value={value || ''}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder}>
            {selectedGroup && (
              <span className="flex items-center gap-2">
                <span>{selectedGroup.name}</span>
                {showGlassIndicator && selectedGroup.is_glass && (
                  <Badge variant="outline" className="text-xs">Glas</Badge>
                )}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__clear__" className="text-muted-foreground">
            Geen prijsgroep
          </SelectItem>

          {fullDoorGroups.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                Volle deuren
              </SelectLabel>
              {fullDoorGroups.map(pg => (
                <SelectItem key={pg.id} value={pg.id}>
                  <span className="flex items-center justify-between w-full gap-4">
                    <span>{pg.name}</span>
                    <span className="text-xs text-muted-foreground">{pg.code}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {glassDoorGroups.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-xs uppercase tracking-wider text-muted-foreground">
                Glasdeuren
              </SelectLabel>
              {glassDoorGroups.map(pg => (
                <SelectItem key={pg.id} value={pg.id}>
                  <span className="flex items-center justify-between w-full gap-4">
                    <span>{pg.name}</span>
                    <Badge variant="outline" className="text-xs">Glas</Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>

      {selectedGroup?.material_description && (
        <p className="text-xs text-muted-foreground mt-1">
          {selectedGroup.material_description}
        </p>
      )}
    </div>
  )
}

export function usePriceGroupPrice(
  productId: string | null | undefined,
  priceGroupId: string | null | undefined
) {
  const [price, setPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!productId || !priceGroupId) {
      setPrice(null)
      return
    }

    const fetchPrice = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('product_prices')
          .select('price')
          .eq('product_id', productId)
          .eq('price_group_id', priceGroupId)
          .maybeSingle()

        if (error) throw error
        setPrice(data?.price ?? null)
      } catch (err) {
        console.error('Error fetching price:', err)
        setPrice(null)
      } finally {
        setLoading(false)
      }
    }

    fetchPrice()
  }, [productId, priceGroupId])

  return { price, loading }
}

export async function getProductPrice(
  productId: string,
  priceGroupId: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from('product_prices')
    .select('price')
    .eq('product_id', productId)
    .eq('price_group_id', priceGroupId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching product price:', error)
    return null
  }

  return data?.price ?? null
}
