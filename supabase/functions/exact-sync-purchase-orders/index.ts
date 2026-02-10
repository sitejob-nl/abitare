import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { decryptToken, encryptToken, isEncrypted } from "../_shared/crypto.ts";

const EXACT_API_URL = "https://start.exactonline.nl";
const EXACT_TOKEN_URL = "https://start.exactonline.nl/api/oauth2/token";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase configuration");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { action, divisionId, supplierOrderId } = await req.json();
    if (!divisionId) throw new Error("divisionId is required");

    const { data: connection, error: connError } = await supabase
      .from("exact_online_connections")
      .select("*")
      .eq("division_id", divisionId)
      .eq("is_active", true)
      .single();

    if (connError || !connection) throw new Error("No active Exact Online connection found for this division");

    const accessToken = await getValidToken(supabase, connection);
    const exactDivision = connection.exact_division;

    if (action === "push") {
      const result = await pushPurchaseOrders(supabase, accessToken, exactDivision, divisionId, supplierOrderId);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      throw new Error("Invalid action. Use 'push'");
    }
  } catch (error: unknown) {
    console.error("Purchase order sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function pushPurchaseOrders(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  accessToken: string,
  exactDivision: number,
  divisionId: string,
  supplierOrderId?: string,
) {
  // Get supplier orders to push, joined with supplier + order + lines
  let query = supabase
    .from("supplier_orders")
    .select(`
      id, order_id, supplier_id, status, total_amount, notes, sent_at, expected_delivery_date,
      exact_purchase_order_id,
      suppliers!inner(id, name, code, exact_supplier_id, contact_email),
      orders!inner(id, order_number, division_id),
      supplier_order_lines(id, quantity, unit_price, product_id, ean_code,
        products(article_code, name, description))
    `)
    .eq("orders.division_id", divisionId);

  if (supplierOrderId) {
    query = query.eq("id", supplierOrderId);
  } else {
    query = query.is("exact_purchase_order_id", null);
  }

  const { data: supplierOrders, error } = await query;
  if (error) throw error;

  const results = { success: true, created: 0, skipped: 0, failed: 0, errors: [] as string[] };

  for (const so of supplierOrders || []) {
    try {
      if (so.exact_purchase_order_id && !supplierOrderId) {
        results.skipped++;
        continue;
      }

      const supplier = so.suppliers;
      let supplierId = supplier?.exact_supplier_id;

      // Auto-create supplier in Exact if not linked
      if (!supplierId) {
        supplierId = await ensureSupplierInExact(supabase, accessToken, exactDivision, supplier);
        if (!supplierId) {
          results.failed++;
          results.errors.push(`Leverancier ${supplier?.name}: Kon niet aanmaken in Exact Online`);
          continue;
        }
      }

      const orderNumber = so.orders?.order_number || "?";

      // Build PurchaseOrderLines
      const poLines = (so.supplier_order_lines || []).map((line: any) => {
        const product = line.products;
        return {
          Description: (product?.name || product?.description || `Product ${line.product_id || ""}`).substring(0, 60),
          Quantity: line.quantity || 1,
          NetPrice: line.unit_price || 0,
          VATCode: "2", // 21% default for purchase
        };
      });

      if (poLines.length === 0) {
        poLines.push({
          Description: `Inkooporder voor order #${orderNumber}`,
          Quantity: 1,
          NetPrice: so.total_amount || 0,
          VATCode: "2",
        });
      }

      const purchaseOrder = {
        Supplier: supplierId,
        Description: `Inkooporder ${supplier?.name} - Order #${orderNumber}`,
        OrderDate: so.sent_at || new Date().toISOString().split("T")[0],
        YourRef: `ORD-${orderNumber}`,
        Currency: "EUR",
        Remarks: so.notes || undefined,
        ReceiptDate: so.expected_delivery_date || undefined,
        PurchaseOrderLines: poLines,
      };

      const response = await fetch(
        `${EXACT_API_URL}/api/v1/${exactDivision}/purchaseorder/PurchaseOrders`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(purchaseOrder),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to create purchase order for supplier order ${so.id}:`, errorText);
        results.failed++;
        results.errors.push(`${supplier?.name} (order #${orderNumber}): ${errorText}`);
      } else {
        const data = await response.json();
        const poId = data.d?.PurchaseOrderID;
        const poNumber = data.d?.PurchaseOrderNumber;

        if (poId || poNumber) {
          await supabase
            .from("supplier_orders")
            .update({ exact_purchase_order_id: poId || poNumber?.toString() })
            .eq("id", so.id);
        }
        results.created++;
      }
    } catch (err) {
      console.error(`Error creating purchase order for ${so.id}:`, err);
      results.failed++;
      results.errors.push(`Supplier order ${so.id}: ${String(err)}`);
    }
  }

  return results;
}

// ============= Supplier Auto-Sync =============

async function ensureSupplierInExact(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  accessToken: string,
  exactDivision: number,
  // deno-lint-ignore no-explicit-any
  supplier: any,
): Promise<string | null> {
  if (!supplier) return null;

  try {
    // Search by Code
    const searchUrl = `${EXACT_API_URL}/api/v1/${exactDivision}/crm/Accounts?$filter=Code eq '${supplier.code}' and Status eq 'V'&$select=ID,Code,Name`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      const existing = (searchData.d?.results || [])[0];
      if (existing?.ID) {
        await supabase.from("suppliers").update({ exact_supplier_id: existing.ID }).eq("id", supplier.id);
        return existing.ID;
      }
    } else {
      await searchRes.text();
    }

    // Also search without Status filter (might be "S" for Supplier or just exist)
    const searchUrl2 = `${EXACT_API_URL}/api/v1/${exactDivision}/crm/Accounts?$filter=Code eq '${supplier.code}'&$select=ID,Code,Name,Status`;
    const searchRes2 = await fetch(searchUrl2, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });

    if (searchRes2.ok) {
      const searchData2 = await searchRes2.json();
      const existing2 = (searchData2.d?.results || [])[0];
      if (existing2?.ID) {
        await supabase.from("suppliers").update({ exact_supplier_id: existing2.ID }).eq("id", supplier.id);
        return existing2.ID;
      }
    } else {
      await searchRes2.text();
    }

    // Create new supplier account
    const accountData: Record<string, unknown> = {
      Code: supplier.code,
      Name: supplier.name,
      Status: "V", // V = Supplier in Exact Online
    };
    if (supplier.contact_email) accountData.Email = supplier.contact_email;

    const createRes = await fetch(`${EXACT_API_URL}/api/v1/${exactDivision}/crm/Accounts`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(accountData),
    });

    if (!createRes.ok) {
      console.error("Failed to create Exact supplier account:", await createRes.text());
      return null;
    }

    const createData = await createRes.json();
    const newId = createData.d?.ID;
    if (newId) {
      await supabase.from("suppliers").update({ exact_supplier_id: newId }).eq("id", supplier.id);
    }
    return newId || null;
  } catch (err) {
    console.error("Error ensuring supplier in Exact:", err);
    return null;
  }
}

// ============= Token Management =============

// deno-lint-ignore no-explicit-any
async function getValidToken(supabase: any, connection: any) {
  let accessToken = connection.access_token;
  let refreshToken = connection.refresh_token;

  if (isEncrypted(accessToken)) accessToken = await decryptToken(accessToken);
  if (isEncrypted(refreshToken)) refreshToken = await decryptToken(refreshToken);

  const tokenExpiry = new Date(connection.token_expires_at);

  if (new Date() >= tokenExpiry) {
    const clientId = Deno.env.get("EXACT_CLIENT_ID");
    const clientSecret = Deno.env.get("EXACT_CLIENT_SECRET");
    if (!clientId || !clientSecret) throw new Error("Missing Exact Online credentials");

    const response = await fetch(EXACT_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) throw new Error("Token refresh failed");

    const tokens = await response.json();
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    const encryptedAccessToken = await encryptToken(tokens.access_token);
    const encryptedRefreshToken = await encryptToken(tokens.refresh_token);

    await supabase
      .from("exact_online_connections")
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: newExpiresAt.toISOString(),
      })
      .eq("id", connection.id);

    return tokens.access_token;
  }

  return accessToken;
}
