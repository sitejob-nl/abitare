import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, token, orderId, data } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from("customer_portal_tokens")
      .select("*, customer:customers(id, first_name, last_name, company_name, email, phone, mobile)")
      .eq("token", token)
      .eq("is_active", true)
      .single();

    if (tokenError || !tokenData) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Token expired" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = tokenData.customer_id;
    const customer = tokenData.customer;

    // Update last_accessed_at
    supabase
      .from("customer_portal_tokens")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", tokenData.id)
      .then();

    let result: unknown;

    switch (action) {
      case "get-portal-data": {
        // Fetch orders (no financial data exposed)
        const { data: orders } = await supabase
          .from("orders")
          .select(`
            id, order_number, status, order_date,
            expected_delivery_date, expected_installation_date,
            actual_delivery_date, actual_installation_date,
            customer_notes, delivery_notes,
            total_incl_vat, amount_paid, payment_status
          `)
          .eq("customer_id", customerId)
          .order("order_date", { ascending: false });

        result = {
          token: {
            id: tokenData.id,
            token: tokenData.token,
            customer_id: tokenData.customer_id,
            is_active: tokenData.is_active,
            expires_at: tokenData.expires_at,
          },
          customer,
          orders: orders || [],
        };
        break;
      }

      case "get-order-detail": {
        if (!orderId) {
          return new Response(JSON.stringify({ error: "orderId required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Verify order belongs to customer
        const { data: order } = await supabase
          .from("orders")
          .select("id, customer_id")
          .eq("id", orderId)
          .eq("customer_id", customerId)
          .single();

        if (!order) {
          return new Response(JSON.stringify({ error: "Order not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const [linesRes, historyRes] = await Promise.all([
          supabase
            .from("order_lines")
            .select("id, description, quantity, unit, article_code")
            .eq("order_id", orderId)
            .order("sort_order"),
          supabase
            .from("order_status_history")
            .select("id, to_status, created_at")
            .eq("order_id", orderId)
            .order("created_at", { ascending: false }),
        ]);

        result = {
          lines: linesRes.data || [],
          statusHistory: historyRes.data || [],
        };
        break;
      }

      case "get-documents": {
        const { data: orders } = await supabase
          .from("orders")
          .select("id, order_number")
          .eq("customer_id", customerId);

        const orderIds = (orders || []).map((o) => o.id);
        if (orderIds.length === 0) {
          result = { documents: [], orders: [] };
          break;
        }

        const { data: documents } = await supabase
          .from("order_documents")
          .select("id, title, file_name, file_path, document_type, created_at, order_id")
          .in("order_id", orderIds)
          .eq("visible_to_customer", true)
          .order("created_at", { ascending: false });

        result = { documents: documents || [], orders: orders || [] };
        break;
      }

      case "get-document-url": {
        const filePath = data?.filePath;
        if (!filePath) {
          return new Response(JSON.stringify({ error: "filePath required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Verify document belongs to customer's order
        const { data: doc } = await supabase
          .from("order_documents")
          .select("id, order_id, file_path")
          .eq("file_path", filePath)
          .eq("visible_to_customer", true)
          .single();

        if (!doc) {
          return new Response(JSON.stringify({ error: "Document not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Verify order belongs to customer
        const { data: orderCheck } = await supabase
          .from("orders")
          .select("id")
          .eq("id", doc.order_id)
          .eq("customer_id", customerId)
          .single();

        if (!orderCheck) {
          return new Response(JSON.stringify({ error: "Access denied" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from("order-documents")
          .createSignedUrl(filePath, 60);

        if (urlError) throw urlError;

        result = { signedUrl: signedUrlData.signedUrl };
        break;
      }

      case "submit-planning": {
        const { data: insertData, error: insertError } = await supabase
          .from("customer_planning_preferences")
          .insert({
            order_id: data.orderId,
            token_id: tokenData.id,
            preferred_date_1: data.preferredDate1 || null,
            preferred_date_2: data.preferredDate2 || null,
            preferred_date_3: data.preferredDate3 || null,
            time_preference: data.timePreference || null,
            remarks: data.remarks || null,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        result = insertData;
        break;
      }

      case "has-submitted-planning": {
        if (!orderId) {
          result = { hasSubmitted: false };
          break;
        }

        const { count } = await supabase
          .from("customer_planning_preferences")
          .select("*", { count: "exact", head: true })
          .eq("order_id", orderId)
          .eq("token_id", tokenData.id);

        result = { hasSubmitted: (count || 0) > 0 };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Portal data error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
