import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Loader2, Save, Package, FileDown, ListChecks } from "lucide-react";
import { ProductImageGallery } from "@/components/products/ProductImageGallery";
import { useProduct, useProductCategories, useSuppliers } from "@/hooks/useProducts";
import { useProductPrices } from "@/hooks/useProductPrices";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "€ -";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: product, isLoading } = useProduct(id);
  const { data: categories } = useProductCategories();
  const { data: suppliers } = useSuppliers();
  const { data: prices } = useProductPrices(id);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const startEditing = () => {
    if (!product) return;
    setForm({
      name: product.name || "",
      article_code: product.article_code || "",
      description: product.description || "",
      base_price: product.base_price ?? "",
      cost_price: product.cost_price ?? "",
      book_price: (product as any).book_price ?? "",
      retail_price: (product as any).retail_price ?? "",
      vat_rate: product.vat_rate ?? 21,
      unit: product.unit || "stuk",
      sku: product.sku || "",
      ean_code: product.ean_code || "",
      width_mm: product.width_mm ?? "",
      height_mm: product.height_mm ?? "",
      depth_mm: product.depth_mm ?? "",
      depth_open_door_mm: (product as any).depth_open_door_mm ?? "",
      niche_height_min_mm: (product as any).niche_height_min_mm ?? "",
      niche_height_max_mm: (product as any).niche_height_max_mm ?? "",
      niche_width_min_mm: (product as any).niche_width_min_mm ?? "",
      niche_width_max_mm: (product as any).niche_width_max_mm ?? "",
      niche_depth_mm: (product as any).niche_depth_mm ?? "",
      energy_class: (product as any).energy_class || "",
      energy_consumption_kwh: (product as any).energy_consumption_kwh ?? "",
      noise_db: (product as any).noise_db ?? "",
      noise_class: (product as any).noise_class || "",
      color_main: (product as any).color_main || "",
      color_basic: (product as any).color_basic || "",
      water_consumption_l: (product as any).water_consumption_l ?? "",
      weight_net_kg: (product as any).weight_net_kg ?? "",
      weight_gross_kg: (product as any).weight_gross_kg ?? "",
      construction_type: (product as any).construction_type || "",
      installation_type: (product as any).installation_type || "",
      connection_power_w: (product as any).connection_power_w ?? "",
      voltage_v: (product as any).voltage_v ?? "",
      current_a: (product as any).current_a ?? "",
      product_family: (product as any).product_family || "",
      product_series: (product as any).product_series || "",
      product_status: (product as any).product_status || "",
      datasheet_url: (product as any).datasheet_url || "",
      supplier_id: product.supplier_id || "",
      category_id: product.category_id || "",
      is_active: product.is_active ?? true,
      catalog_code: product.catalog_code || "",
      discount_group: product.discount_group || "",
      norm_hours: product.norm_hours ?? "",
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const updateData: Record<string, any> = {
        name: form.name,
        article_code: form.article_code,
        description: form.description || null,
        base_price: form.base_price !== "" ? Number(form.base_price) : null,
        cost_price: form.cost_price !== "" ? Number(form.cost_price) : null,
        book_price: form.book_price !== "" ? Number(form.book_price) : null,
        retail_price: form.retail_price !== "" ? Number(form.retail_price) : null,
        vat_rate: form.vat_rate !== "" ? Number(form.vat_rate) : null,
        unit: form.unit || null,
        sku: form.sku || null,
        ean_code: form.ean_code || null,
        width_mm: form.width_mm !== "" ? Number(form.width_mm) : null,
        height_mm: form.height_mm !== "" ? Number(form.height_mm) : null,
        depth_mm: form.depth_mm !== "" ? Number(form.depth_mm) : null,
        depth_open_door_mm: form.depth_open_door_mm !== "" ? Number(form.depth_open_door_mm) : null,
        niche_height_min_mm: form.niche_height_min_mm !== "" ? Number(form.niche_height_min_mm) : null,
        niche_height_max_mm: form.niche_height_max_mm !== "" ? Number(form.niche_height_max_mm) : null,
        niche_width_min_mm: form.niche_width_min_mm !== "" ? Number(form.niche_width_min_mm) : null,
        niche_width_max_mm: form.niche_width_max_mm !== "" ? Number(form.niche_width_max_mm) : null,
        niche_depth_mm: form.niche_depth_mm !== "" ? Number(form.niche_depth_mm) : null,
        energy_class: form.energy_class || null,
        energy_consumption_kwh: form.energy_consumption_kwh !== "" ? Number(form.energy_consumption_kwh) : null,
        noise_db: form.noise_db !== "" ? Number(form.noise_db) : null,
        noise_class: form.noise_class || null,
        color_main: form.color_main || null,
        color_basic: form.color_basic || null,
        water_consumption_l: form.water_consumption_l !== "" ? Number(form.water_consumption_l) : null,
        weight_net_kg: form.weight_net_kg !== "" ? Number(form.weight_net_kg) : null,
        weight_gross_kg: form.weight_gross_kg !== "" ? Number(form.weight_gross_kg) : null,
        construction_type: form.construction_type || null,
        installation_type: form.installation_type || null,
        connection_power_w: form.connection_power_w !== "" ? Number(form.connection_power_w) : null,
        voltage_v: form.voltage_v !== "" ? Number(form.voltage_v) : null,
        current_a: form.current_a !== "" ? Number(form.current_a) : null,
        product_family: form.product_family || null,
        product_series: form.product_series || null,
        product_status: form.product_status || null,
        datasheet_url: form.datasheet_url || null,
        supplier_id: form.supplier_id || null,
        category_id: form.category_id || null,
        is_active: form.is_active,
        catalog_code: form.catalog_code || null,
        discount_group: form.discount_group || null,
        norm_hours: form.norm_hours !== "" ? Number(form.norm_hours) : null,
      };

      const { error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      toast.success("Product opgeslagen");
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsEditing(false);
    } catch (err: any) {
      toast.error("Fout bij opslaan", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Product" breadcrumb="Producten / Laden...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!product) {
    return (
      <AppLayout title="Product" breadcrumb="Producten / Niet gevonden">
        <div className="text-center py-20 text-muted-foreground">
          Product niet gevonden
        </div>
      </AppLayout>
    );
  }

  const supplier = product.supplier as { name?: string; code?: string } | null;
  const category = product.category as { name?: string; code?: string } | null;

  return (
    <AppLayout
      title={product.name}
      breadcrumb={`Producten / ${product.article_code}`}
    >
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/products")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-display text-xl font-semibold text-foreground">
              {product.name}
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              {product.article_code}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                Annuleren
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Opslaan
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={startEditing}>
              Bewerken
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Algemeen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Naam</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Artikelcode</Label>
                      <Input
                        value={form.article_code}
                        onChange={(e) =>
                          setForm({ ...form, article_code: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Omschrijving</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm({ ...form, description: e.target.value })
                      }
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Leverancier</Label>
                      <Select
                        value={form.supplier_id || "none"}
                        onValueChange={(v) =>
                          setForm({ ...form, supplier_id: v === "none" ? "" : v })
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Geen</SelectItem>
                          {suppliers?.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Categorie</Label>
                      <Select
                        value={form.category_id || "none"}
                        onValueChange={(v) =>
                          setForm({ ...form, category_id: v === "none" ? "" : v })
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Geen</SelectItem>
                          {categories?.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">SKU</Label>
                      <Input
                        value={form.sku}
                        onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">EAN-code</Label>
                      <Input
                        value={form.ean_code}
                        onChange={(e) => setForm({ ...form, ean_code: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cataloguscode</Label>
                      <Input
                        value={form.catalog_code}
                        onChange={(e) =>
                          setForm({ ...form, catalog_code: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                    />
                    <Label className="text-xs">Actief</Label>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Naam" value={product.name} />
                    <Field label="Artikelcode" value={product.article_code} mono />
                  </div>
                  {product.description && (
                    <Field label="Omschrijving" value={product.description} />
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Leverancier" value={supplier?.name} />
                    <Field label="Categorie" value={category?.name} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="SKU" value={product.sku} mono />
                    <Field label="EAN-code" value={product.ean_code} mono />
                    <Field label="Cataloguscode" value={product.catalog_code} mono />
                  </div>
                  <div className="pt-1">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${product.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {product.is_active ? "Actief" : "Inactief"}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Dimensions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Afmetingen & Technisch</CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Breedte (mm)</Label>
                      <Input type="number" value={form.width_mm} onChange={(e) => setForm({ ...form, width_mm: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Hoogte (mm)</Label>
                      <Input type="number" value={form.height_mm} onChange={(e) => setForm({ ...form, height_mm: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Diepte (mm)</Label>
                      <Input type="number" value={form.depth_mm} onChange={(e) => setForm({ ...form, depth_mm: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Diepte open deur (mm)</Label>
                      <Input type="number" value={form.depth_open_door_mm} onChange={(e) => setForm({ ...form, depth_open_door_mm: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Normuren</Label>
                      <Input type="number" step="0.01" value={form.norm_hours} onChange={(e) => setForm({ ...form, norm_hours: e.target.value })} />
                    </div>
                  </div>
                  <Separator />
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Inbouwmaten</div>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nishoogte min (mm)</Label>
                      <Input type="number" value={form.niche_height_min_mm} onChange={(e) => setForm({ ...form, niche_height_min_mm: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nishoogte max (mm)</Label>
                      <Input type="number" value={form.niche_height_max_mm} onChange={(e) => setForm({ ...form, niche_height_max_mm: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nisbreedte min (mm)</Label>
                      <Input type="number" value={form.niche_width_min_mm} onChange={(e) => setForm({ ...form, niche_width_min_mm: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nisbreedte max (mm)</Label>
                      <Input type="number" value={form.niche_width_max_mm} onChange={(e) => setForm({ ...form, niche_width_max_mm: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nisdiepte (mm)</Label>
                      <Input type="number" value={form.niche_depth_mm} onChange={(e) => setForm({ ...form, niche_depth_mm: e.target.value })} />
                    </div>
                  </div>
                  <Separator />
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gewicht</div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Netto gewicht (kg)</Label>
                      <Input type="number" step="0.1" value={form.weight_net_kg} onChange={(e) => setForm({ ...form, weight_net_kg: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Bruto gewicht (kg)</Label>
                      <Input type="number" step="0.1" value={form.weight_gross_kg} onChange={(e) => setForm({ ...form, weight_gross_kg: e.target.value })} />
                    </div>
                  </div>
                  <Separator />
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aansluiting</div>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Bouwtype</Label>
                      <Input value={form.construction_type} onChange={(e) => setForm({ ...form, construction_type: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Installatietype</Label>
                      <Input value={form.installation_type} onChange={(e) => setForm({ ...form, installation_type: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Vermogen (W)</Label>
                      <Input type="number" value={form.connection_power_w} onChange={(e) => setForm({ ...form, connection_power_w: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Spanning (V)</Label>
                      <Input type="number" value={form.voltage_v} onChange={(e) => setForm({ ...form, voltage_v: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Stroom (A)</Label>
                      <Input type="number" step="0.1" value={form.current_a} onChange={(e) => setForm({ ...form, current_a: e.target.value })} />
                    </div>
                  </div>
                  <Separator />
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Energie & Technisch</div>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Energieklasse</Label>
                      <Input value={form.energy_class} onChange={(e) => setForm({ ...form, energy_class: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Verbruik (kWh)</Label>
                      <Input type="number" step="0.1" value={form.energy_consumption_kwh} onChange={(e) => setForm({ ...form, energy_consumption_kwh: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Waterverbruik (L)</Label>
                      <Input type="number" step="0.1" value={form.water_consumption_l} onChange={(e) => setForm({ ...form, water_consumption_l: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Geluid (dB)</Label>
                      <Input type="number" value={form.noise_db} onChange={(e) => setForm({ ...form, noise_db: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Geluidsklasse</Label>
                      <Input value={form.noise_class} onChange={(e) => setForm({ ...form, noise_class: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Kleur</Label>
                      <Input value={form.color_main} onChange={(e) => setForm({ ...form, color_main: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Basiskleur</Label>
                      <Input value={form.color_basic} onChange={(e) => setForm({ ...form, color_basic: e.target.value })} />
                    </div>
                  </div>
                  <Separator />
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Productinfo</div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Productfamilie</Label>
                      <Input value={form.product_family} onChange={(e) => setForm({ ...form, product_family: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Productserie</Label>
                      <Input value={form.product_series} onChange={(e) => setForm({ ...form, product_series: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Productstatus</Label>
                      <Input value={form.product_status} onChange={(e) => setForm({ ...form, product_status: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Datasheet URL</Label>
                    <Input value={form.datasheet_url} onChange={(e) => setForm({ ...form, datasheet_url: e.target.value })} />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <Field label="Breedte" value={product.width_mm ? `${product.width_mm} mm` : null} />
                    <Field label="Hoogte" value={product.height_mm ? `${product.height_mm} mm` : null} />
                    <Field label="Diepte" value={product.depth_mm ? `${product.depth_mm} mm` : null} />
                    <Field label="Diepte open deur" value={(product as any).depth_open_door_mm ? `${(product as any).depth_open_door_mm} mm` : null} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                    <Field label="Normuren" value={product.norm_hours?.toString()} />
                  </div>
                  {((product as any).niche_height_min_mm || (product as any).niche_width_min_mm || (product as any).niche_depth_mm) && (
                    <>
                      <Separator />
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Inbouwmaten</div>
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                        <Field label="Nishoogte" value={
                          (product as any).niche_height_min_mm
                            ? `${(product as any).niche_height_min_mm}${(product as any).niche_height_max_mm ? ` – ${(product as any).niche_height_max_mm}` : ''} mm`
                            : null
                        } />
                        <Field label="Nisbreedte" value={
                          (product as any).niche_width_min_mm
                            ? `${(product as any).niche_width_min_mm}${(product as any).niche_width_max_mm ? ` – ${(product as any).niche_width_max_mm}` : ''} mm`
                            : null
                        } />
                        <Field label="Nisdiepte" value={(product as any).niche_depth_mm ? `${(product as any).niche_depth_mm} mm` : null} />
                      </div>
                    </>
                  )}
                  {((product as any).weight_net_kg || (product as any).weight_gross_kg) && (
                    <>
                      <Separator />
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gewicht</div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Netto" value={(product as any).weight_net_kg ? `${(product as any).weight_net_kg} kg` : null} />
                        <Field label="Bruto" value={(product as any).weight_gross_kg ? `${(product as any).weight_gross_kg} kg` : null} />
                      </div>
                    </>
                  )}
                  {((product as any).construction_type || (product as any).installation_type || (product as any).connection_power_w) && (
                    <>
                      <Separator />
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aansluiting</div>
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                        <Field label="Bouwtype" value={(product as any).construction_type} />
                        <Field label="Installatietype" value={(product as any).installation_type} />
                        <Field label="Vermogen" value={(product as any).connection_power_w ? `${(product as any).connection_power_w} W` : null} />
                        <Field label="Spanning" value={(product as any).voltage_v ? `${(product as any).voltage_v} V` : null} />
                        <Field label="Stroom" value={(product as any).current_a ? `${(product as any).current_a} A` : null} />
                      </div>
                    </>
                  )}
                  {((product as any).energy_class || (product as any).noise_db || (product as any).color_main || (product as any).water_consumption_l) && (
                    <>
                      <Separator />
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Energie & Technisch</div>
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                        <Field label="Energieklasse" value={(product as any).energy_class} />
                        <Field label="Verbruik" value={(product as any).energy_consumption_kwh ? `${(product as any).energy_consumption_kwh} kWh` : null} />
                        <Field label="Waterverbruik" value={(product as any).water_consumption_l ? `${(product as any).water_consumption_l} L` : null} />
                        <Field label="Geluidsniveau" value={
                          (product as any).noise_db
                            ? `${(product as any).noise_db} dB${(product as any).noise_class ? ` (klasse ${(product as any).noise_class})` : ''}`
                            : null
                        } />
                        <Field label="Kleur" value={(product as any).color_main} />
                        <Field label="Basiskleur" value={(product as any).color_basic} />
                      </div>
                    </>
                  )}
                  {((product as any).product_family || (product as any).product_series || (product as any).product_status) && (
                    <>
                      <Separator />
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Productinfo</div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <Field label="Productfamilie" value={(product as any).product_family} />
                        <Field label="Productserie" value={(product as any).product_series} />
                        <Field label="Productstatus" value={(product as any).product_status} />
                      </div>
                    </>
                  )}
                  {(product as any).datasheet_url && (
                    <>
                      <Separator />
                      <a href={(product as any).datasheet_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-2">
                          <FileDown className="h-4 w-4" />
                          Productfiche downloaden
                        </Button>
                      </a>
                    </>
                  )}
                </div>
              )}
            </CardContent>
           </Card>

          {/* Specifications */}
          {(() => {
            const specs = (product as any).specifications;
            if (!specs || typeof specs !== 'object' || Object.keys(specs).length === 0) return null;
            const entries = Object.entries(specs as Record<string, unknown>);
            const usps = entries.filter(([k]) => k.toLowerCase().includes('usp'));
            const regular = entries.filter(([k]) => !k.toLowerCase().includes('usp'));
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ListChecks className="h-4 w-4" />
                    Specificaties
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {regular.map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-2 py-1 border-b border-border/50">
                        <span className="text-xs text-muted-foreground truncate">{key}</span>
                        <span className="text-xs text-foreground text-right font-medium">
                          {Array.isArray(value) ? value.join(', ') : String(value ?? '–')}
                        </span>
                      </div>
                    ))}
                  </div>
                  {usps.length > 0 && (
                    <>
                      <Separator />
                      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">USPs</div>
                      <ul className="list-disc list-inside space-y-1">
                        {usps.map(([key, value]) => {
                          const items = Array.isArray(value) ? value : [value];
                          return items.map((item, i) => (
                            <li key={`${key}-${i}`} className="text-sm text-foreground">{String(item)}</li>
                          ));
                        })}
                      </ul>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Product Images */}
          {id && <ProductImageGallery productId={id} />}

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prijzen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Adviesprijs (RRP)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.retail_price}
                      onChange={(e) => setForm({ ...form, retail_price: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Inkoopprijs</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.cost_price}
                      onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Boekprijs (catalogusprijs)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.book_price}
                      onChange={(e) => setForm({ ...form, book_price: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Abitare-prijs (excl. BTW)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.base_price}
                      onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">BTW (%)</Label>
                      <Input
                        type="number"
                        value={form.vat_rate}
                        onChange={(e) => setForm({ ...form, vat_rate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Eenheid</Label>
                      <Input
                        value={form.unit}
                        onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Kortingsgroep</Label>
                    <Input
                      value={form.discount_group}
                      onChange={(e) =>
                        setForm({ ...form, discount_group: e.target.value })
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Adviesprijs (RRP)</span>
                    <span className="text-sm text-foreground">
                      {formatCurrency((product as any).retail_price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Inkoopprijs</span>
                    <span className="text-sm text-foreground">
                      {formatCurrency(product.cost_price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Boekprijs</span>
                    <span className="text-sm text-foreground">
                      {formatCurrency((product as any).book_price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Abitare-prijs</span>
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(product.base_price)}
                    </span>
                  </div>
                  {product.base_price && product.cost_price ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Marge</span>
                      <span className="text-sm text-foreground">
                        {Math.round(((product.base_price - product.cost_price) / product.base_price) * 100)}%
                      </span>
                    </div>
                  ) : null}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">BTW</span>
                    <span className="text-sm text-foreground">{product.vat_rate ?? 21}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Eenheid</span>
                    <span className="text-sm text-foreground">{product.unit || "stuk"}</span>
                  </div>
                  {product.discount_group && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Kortingsgroep</span>
                      <span className="text-sm font-mono text-foreground">{product.discount_group}</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Range prices */}
          {prices && prices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Prijsgroep-prijzen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {prices.map((p: any) => {
                  const label = p.range?.code || p.range?.name || p.price_group?.code || p.price_group?.name || "–";
                  const variant2 = p.variant_2_name || p.variant_2_code;
                  return (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate mr-2">
                        {label}{variant2 ? ` · ${variant2}` : ""}
                      </span>
                      <span className="font-medium text-foreground whitespace-nowrap">
                        {formatCurrency(p.price)}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className={`text-sm text-foreground ${mono ? "font-mono" : ""}`}>
        {value || "–"}
      </div>
    </div>
  );
}

export default ProductDetail;
