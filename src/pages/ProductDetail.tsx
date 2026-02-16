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
import { ArrowLeft, Loader2, Save, Package } from "lucide-react";
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
      vat_rate: product.vat_rate ?? 21,
      unit: product.unit || "stuk",
      sku: product.sku || "",
      ean_code: product.ean_code || "",
      width_mm: product.width_mm ?? "",
      height_mm: product.height_mm ?? "",
      depth_mm: product.depth_mm ?? "",
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
        vat_rate: form.vat_rate !== "" ? Number(form.vat_rate) : null,
        unit: form.unit || null,
        sku: form.sku || null,
        ean_code: form.ean_code || null,
        width_mm: form.width_mm !== "" ? Number(form.width_mm) : null,
        height_mm: form.height_mm !== "" ? Number(form.height_mm) : null,
        depth_mm: form.depth_mm !== "" ? Number(form.depth_mm) : null,
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
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Breedte (mm)</Label>
                    <Input
                      type="number"
                      value={form.width_mm}
                      onChange={(e) => setForm({ ...form, width_mm: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Hoogte (mm)</Label>
                    <Input
                      type="number"
                      value={form.height_mm}
                      onChange={(e) => setForm({ ...form, height_mm: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Diepte (mm)</Label>
                    <Input
                      type="number"
                      value={form.depth_mm}
                      onChange={(e) => setForm({ ...form, depth_mm: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Normuren</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.norm_hours}
                      onChange={(e) => setForm({ ...form, norm_hours: e.target.value })}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                  <Field label="Breedte" value={product.width_mm ? `${product.width_mm} mm` : null} />
                  <Field label="Hoogte" value={product.height_mm ? `${product.height_mm} mm` : null} />
                  <Field label="Diepte" value={product.depth_mm ? `${product.depth_mm} mm` : null} />
                  <Field label="Normuren" value={product.norm_hours?.toString()} />
                </div>
              )}
            </CardContent>
          </Card>
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
                {prices.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate mr-2">
                      {p.range?.code || p.range?.name || "–"}
                    </span>
                    <span className="font-medium text-foreground whitespace-nowrap">
                      {formatCurrency(p.price)}
                    </span>
                  </div>
                ))}
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
