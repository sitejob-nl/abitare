import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { decryptToken, encryptToken, isEncrypted } from "../_shared/crypto.ts";

const EXACT_API_URL = "https://start.exactonline.nl";
const EXACT_TOKEN_URL = "https://start.exactonline.nl/api/oauth2/token";

interface AbitareCustomer {
  id: string;
  customer_number: number;
  customer_type: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  street_address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  vat_number: string | null;
  coc_number: string | null;
  exact_account_id: string | null;
  division_id: string | null;
}

interface ExactAccount {
  ID?: string;
  Code?: string;
  Name: string;
  Email?: string;
  Phone?: string;
  AddressLine1?: string;
  City?: string;
  Postcode?: string;
  Country?: string;
  VATNumber?: string;
  ChamberOfCommerce?: string;
  Status?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, divisionId, customerId } = await req.json();

    if (!divisionId) {
      throw new Error("divisionId is required");
    }

    // Get connection for this division
    const { data: connection, error: connError } = await supabase
      .from("exact_online_connections")
      .select("*")
      .eq("division_id", divisionId)
      .eq("is_active", true)
      .single();

    if (connError || !connection) {
      throw new Error("No active Exact Online connection found for this division");
    }

    // Get valid access token
    const accessToken = await getValidToken(supabase, connection);
    const exactDivision = connection.exact_division;

    if (action === "push") {
      // Push single customer or all customers to Exact
      return await pushCustomers(supabase, accessToken, exactDivision, divisionId, customerId);
    } else if (action === "pull") {
      // Pull customers from Exact to Abitare
      return await pullCustomers(supabase, accessToken, exactDivision, divisionId);
    } else if (action === "sync") {
      // Full bidirectional sync
      const pushResult = await pushCustomersInternal(supabase, accessToken, exactDivision, divisionId, customerId);
      const pullResult = await pullCustomersInternal(supabase, accessToken, exactDivision, divisionId);
      
      return new Response(JSON.stringify({
        success: true,
        pushed: pushResult,
        pulled: pullResult,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      throw new Error("Invalid action. Use 'push', 'pull', or 'sync'");
    }
  } catch (error: unknown) {
    console.error("Customer sync error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function pushCustomers(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  accessToken: string,
  exactDivision: number,
  divisionId: string,
  customerId?: string
): Promise<Response> {
  const result = await pushCustomersInternal(supabase, accessToken, exactDivision, divisionId, customerId);
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function pushCustomersInternal(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  accessToken: string,
  exactDivision: number,
  divisionId: string,
  customerId?: string
) {
  // Get customers to sync
  let query = supabase
    .from("customers")
    .select("*")
    .eq("division_id", divisionId);

  if (customerId) {
    query = query.eq("id", customerId);
  }

  const { data: customers, error } = await query;

  if (error) throw error;

  const results = {
    success: true,
    created: 0,
    updated: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const customer of customers as AbitareCustomer[]) {
    try {
      const exactAccount = mapToExactAccount(customer);

      if (customer.exact_account_id) {
        // Update existing account
        const response = await fetch(
          `${EXACT_API_URL}/api/v1/${exactDivision}/crm/Accounts(guid'${customer.exact_account_id}')`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(exactAccount),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to update customer ${customer.id}:`, errorText);
          results.failed++;
          results.errors.push(`Update failed for ${customer.last_name}: ${errorText}`);
        } else {
          await response.text(); // Consume response
          results.updated++;
        }
      } else {
        // Create new account
        const response = await fetch(
          `${EXACT_API_URL}/api/v1/${exactDivision}/crm/Accounts`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(exactAccount),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to create customer ${customer.id}:`, errorText);
          results.failed++;
          results.errors.push(`Create failed for ${customer.last_name}: ${errorText}`);
        } else {
          const data = await response.json();
          const exactId = data.d?.ID;

          if (exactId) {
            // Update customer with Exact ID
            await supabase
              .from("customers")
              .update({ exact_account_id: exactId })
              .eq("id", customer.id);
          }
          results.created++;
        }
      }
    } catch (err) {
      console.error(`Error syncing customer ${customer.id}:`, err);
      results.failed++;
      results.errors.push(`Error for ${customer.last_name}: ${String(err)}`);
    }
  }

  return results;
}

async function pullCustomers(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  accessToken: string,
  exactDivision: number,
  divisionId: string
): Promise<Response> {
  const result = await pullCustomersInternal(supabase, accessToken, exactDivision, divisionId);
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function pullCustomersInternal(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  accessToken: string,
  exactDivision: number,
  divisionId: string
) {
  const results = {
    success: true,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [] as string[],
  };

  // Get accounts from Exact Online using pagination
  let hasMore = true;
  let skipToken = "";
  
  while (hasMore) {
    const url = `${EXACT_API_URL}/api/v1/${exactDivision}/crm/Accounts?$select=ID,Code,Name,Email,Phone,AddressLine1,City,Postcode,Country,VATNumber,ChamberOfCommerce,Status${skipToken}`;
    
    const fetchResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      throw new Error(`Failed to fetch accounts from Exact: ${errorText}`);
    }

    const responseData = await fetchResponse.json();
    const accounts = responseData.d?.results || [];

    for (const account of accounts as ExactAccount[]) {
      try {
        // Check if customer already exists in Abitare
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id")
          .eq("exact_account_id", account.ID)
          .single();

        if (existingCustomer) {
          // Update existing customer
          const updateData = mapFromExactAccount(account);
          await supabase
            .from("customers")
            .update(updateData)
            .eq("id", existingCustomer.id);
          results.updated++;
        } else {
          // Check if customer exists by email or name
          const { data: matchingCustomer } = await supabase
            .from("customers")
            .select("id, exact_account_id")
            .eq("division_id", divisionId)
            .or(`email.eq.${account.Email},last_name.eq.${account.Name}`)
            .is("exact_account_id", null)
            .limit(1)
            .single();

          if (matchingCustomer) {
            // Link existing customer
            await supabase
              .from("customers")
              .update({ exact_account_id: account.ID })
              .eq("id", matchingCustomer.id);
            results.updated++;
          } else {
            // Create new customer
            const newCustomer = {
              ...mapFromExactAccount(account),
              exact_account_id: account.ID,
              division_id: divisionId,
              customer_type: "zakelijk" as const, // Default to business for imported
            };

            const { error: insertError } = await supabase
              .from("customers")
              .insert(newCustomer);

            if (insertError) {
              console.error(`Failed to import customer ${account.Name}:`, insertError);
              results.errors.push(`Import failed for ${account.Name}: ${insertError.message}`);
            } else {
              results.imported++;
            }
          }
        }
      } catch (err) {
        console.error(`Error processing account ${account.ID}:`, err);
        results.skipped++;
      }
    }

    // Check for next page
    const nextLink = responseData.d?.__next;
    if (nextLink) {
      // Extract skip token from next link
      const skipMatch = nextLink.match(/\$skiptoken=([^&]+)/);
      skipToken = skipMatch ? `&$skiptoken=${skipMatch[1]}` : "";
      hasMore = !!skipToken;
    } else {
      hasMore = false;
    }
  }

  return results;
}

function mapToExactAccount(customer: AbitareCustomer): ExactAccount {
  // Determine the name based on customer type
  let name = customer.last_name;
  if (customer.customer_type === "zakelijk" && customer.company_name) {
    name = customer.company_name;
  } else if (customer.first_name) {
    name = `${customer.first_name} ${customer.last_name}`;
  }

  return {
    Code: `ABT${customer.customer_number.toString().padStart(6, "0")}`,
    Name: name,
    Email: customer.email || undefined,
    Phone: customer.phone || customer.mobile || undefined,
    AddressLine1: customer.street_address || undefined,
    City: customer.city || undefined,
    Postcode: customer.postal_code || undefined,
    Country: customer.country === "Nederland" ? "NL" : customer.country || undefined,
    VATNumber: customer.vat_number || undefined,
    ChamberOfCommerce: customer.coc_number || undefined,
    Status: "C", // C = Customer
  };
}

function mapFromExactAccount(account: ExactAccount): Partial<AbitareCustomer> {
  return {
    last_name: account.Name || "Onbekend",
    email: account.Email || null,
    phone: account.Phone || null,
    street_address: account.AddressLine1 || null,
    city: account.City || null,
    postal_code: account.Postcode || null,
    country: account.Country === "NL" ? "Nederland" : account.Country || null,
    vat_number: account.VATNumber || null,
    coc_number: account.ChamberOfCommerce || null,
  };
}

// deno-lint-ignore no-explicit-any
async function getValidToken(supabase: any, connection: any) {
  // Decrypt stored tokens
  let accessToken = connection.access_token;
  let refreshToken = connection.refresh_token;
  
  if (isEncrypted(accessToken)) {
    accessToken = await decryptToken(accessToken);
  }
  if (isEncrypted(refreshToken)) {
    refreshToken = await decryptToken(refreshToken);
  }

  const tokenExpiry = new Date(connection.token_expires_at);

  if (new Date() >= tokenExpiry) {
    const clientId = Deno.env.get("EXACT_CLIENT_ID");
    const clientSecret = Deno.env.get("EXACT_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("Missing Exact Online credentials");
    }

    const response = await fetch(EXACT_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error("Token refresh failed");
    }

    const tokens = await response.json();
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Encrypt new tokens before storing
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
