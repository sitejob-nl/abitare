import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey);
    const log: string[] = [];

    // Dynamic date helpers
    const now = new Date();
    const today = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
    const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000).toISOString().split("T")[0];

    // ── 1. Demo Division ──
    const divisionId = "33333333-3333-3333-3333-333333333333";
    await supabase.from("divisions").upsert({
      id: divisionId, name: "Demo Showroom", code: "DEMO",
      address: "Keizersgracht 100", postal_code: "1015 AA", city: "Amsterdam",
      email: "demo@abitare.nl", phone: "020-1234567", is_active: true,
    });
    log.push("✅ Demo division created");

    // ── 2. Supplier IDs (existing) ──
    const stosaId = "29a8e1aa-35da-4784-99ff-23129f36fe22";
    const mieleId = "93406e17-477d-4f16-af77-1bbb35dfd45e";
    const siemensId = "c5669d28-f277-4043-a3fb-c2c593b0be63";
    const blancoId = "8c744bd2-fbeb-4487-842c-6313a56acdd2";
    const quookerId = "91bded38-8213-4bf9-9493-5dd52997839b";
    const boschId = "e70c4a1a-b3e1-460b-86b6-be9644eaaf56";

    // ── 3. Demo Products ──
    const demoProducts = [
      { id: "d0000001-0000-0000-0000-000000000001", article_code: "DEMO-OND-60", name: "Onderkast 60cm", supplier_id: stosaId, category_id: "5706f89e-3c46-4567-9c1d-62aa447c2952", base_price: 485, cost_price: 290, width_mm: 600, height_mm: 720, depth_mm: 560 },
      { id: "d0000001-0000-0000-0000-000000000002", article_code: "DEMO-OND-90", name: "Onderkast 90cm", supplier_id: stosaId, category_id: "5706f89e-3c46-4567-9c1d-62aa447c2952", base_price: 625, cost_price: 375, width_mm: 900, height_mm: 720, depth_mm: 560 },
      { id: "d0000001-0000-0000-0000-000000000003", article_code: "DEMO-BOV-60", name: "Bovenkast 60cm", supplier_id: stosaId, category_id: "5706f89e-3c46-4567-9c1d-62aa447c2952", base_price: 365, cost_price: 219, width_mm: 600, height_mm: 720, depth_mm: 320 },
      { id: "d0000001-0000-0000-0000-000000000004", article_code: "DEMO-BOV-90", name: "Bovenkast 90cm", supplier_id: stosaId, category_id: "5706f89e-3c46-4567-9c1d-62aa447c2952", base_price: 475, cost_price: 285, width_mm: 900, height_mm: 720, depth_mm: 320 },
      { id: "d0000001-0000-0000-0000-000000000005", article_code: "DEMO-HOG-60", name: "Hogekast 60cm (inbouwapparatuur)", supplier_id: stosaId, category_id: "5706f89e-3c46-4567-9c1d-62aa447c2952", base_price: 895, cost_price: 537, width_mm: 600, height_mm: 2100, depth_mm: 560 },
      { id: "d0000001-0000-0000-0000-000000000006", article_code: "DEMO-HOEK", name: "Hoekkast met draaiplateau", supplier_id: stosaId, category_id: "5706f89e-3c46-4567-9c1d-62aa447c2952", base_price: 785, cost_price: 471, width_mm: 900, height_mm: 720, depth_mm: 560 },
      { id: "d0000001-0000-0000-0000-000000000007", article_code: "DEMO-OVEN-M", name: "Miele H 7464 BP Inbouwoven", supplier_id: mieleId, category_id: "622c4f21-bad2-43b2-8dc0-9e17a5da36fa", base_price: 2499, cost_price: 1749, width_mm: 600, height_mm: 595, depth_mm: 548 },
      { id: "d0000001-0000-0000-0000-000000000008", article_code: "DEMO-VAATW-S", name: "Siemens SN65ZX49CE Vaatwasser", supplier_id: siemensId, category_id: "be7bafb3-a7a6-4180-a21e-809cd38de0b5", base_price: 1299, cost_price: 909, width_mm: 600, height_mm: 815, depth_mm: 550 },
      { id: "d0000001-0000-0000-0000-000000000009", article_code: "DEMO-KOOK-S", name: "Siemens EX875LYC1E Inductiekookplaat", supplier_id: siemensId, category_id: "745b87c2-6828-4cdb-a1ca-f156450d0814", base_price: 1849, cost_price: 1294, width_mm: 816, height_mm: 51, depth_mm: 527 },
      { id: "d0000001-0000-0000-0000-000000000010", article_code: "DEMO-AFZUIG", name: "Siemens LB89585M Plafondafzuigkap", supplier_id: siemensId, category_id: "ecd15b0f-be0f-46e0-926e-2784e904b1d2", base_price: 1549, cost_price: 1084, width_mm: 1200, height_mm: 300, depth_mm: 600 },
      { id: "d0000001-0000-0000-0000-000000000011", article_code: "DEMO-KOEL-B", name: "Bosch KGN39AIBT Koel-vriescombinatie", supplier_id: boschId, category_id: "5e549ba4-06d5-4b6b-a9b1-4662dfa15fed", base_price: 1099, cost_price: 769, width_mm: 600, height_mm: 2030, depth_mm: 668 },
      { id: "d0000001-0000-0000-0000-000000000012", article_code: "DEMO-QUOOK", name: "Quooker Flex RVS", supplier_id: quookerId, category_id: "d2f31d12-75c0-4211-abbf-37d2362e3976", base_price: 1795, cost_price: 1256 },
      { id: "d0000001-0000-0000-0000-000000000013", article_code: "DEMO-SPOEL", name: "Blanco Silgranit spoelbak", supplier_id: blancoId, category_id: "d2f31d12-75c0-4211-abbf-37d2362e3976", base_price: 589, cost_price: 412 },
      { id: "d0000001-0000-0000-0000-000000000014", article_code: "DEMO-WB-CMP", name: "Composiet werkblad 3m", supplier_id: stosaId, category_id: "c66fffd9-524f-40e7-a55a-bf6e96dc26ea", base_price: 1250, cost_price: 750 },
      { id: "d0000001-0000-0000-0000-000000000015", article_code: "DEMO-MONT", name: "Montage keuken (dagdeel)", supplier_id: stosaId, category_id: "0d95eb9d-8558-4d56-bbde-8c75e007d442", base_price: 450, cost_price: 280 },
      { id: "d0000001-0000-0000-0000-000000000016", article_code: "DEMO-TRANS", name: "Transport & levering", supplier_id: stosaId, category_id: "3d1b3c7f-9a77-451f-9830-d086c21db42f", base_price: 295, cost_price: 195 },
      { id: "d0000001-0000-0000-0000-000000000017", article_code: "DEMO-KOFFIE", name: "Miele CM 7750 Koffieautomaat", supplier_id: mieleId, category_id: "125a2d8d-e254-48fe-8bad-b4dec53fdf14", base_price: 3299, cost_price: 2309 },
      { id: "d0000001-0000-0000-0000-000000000018", article_code: "DEMO-STOOM", name: "Miele DGC 7865 Combi-stoomoven", supplier_id: mieleId, category_id: "cec86fa3-81be-4148-ac42-2abf733a579d", base_price: 4199, cost_price: 2939 },
    ];

    for (const p of demoProducts) {
      await supabase.from("products").upsert({ ...p, is_active: true });
    }
    log.push(`✅ ${demoProducts.length} demo products created`);

    // ── 4. Demo Customers ──
    const customers = [
      { id: "c0000001-0000-0000-0000-000000000001", first_name: "Jan", last_name: "de Vries", email: "jan.devries@demo.nl", phone: "06-12345678", company_name: null, street_address: "Prinsengracht 263", postal_code: "1016 GV", city: "Amsterdam", division_id: divisionId, customer_type: "particulier" as const, delivery_street_address: "Prinsengracht 263", delivery_postal_code: "1016 GV", delivery_city: "Amsterdam" },
      { id: "c0000001-0000-0000-0000-000000000002", first_name: "Lisa", last_name: "Bakker", email: "lisa.bakker@demo.nl", phone: "06-23456789", company_name: null, street_address: "Oudegracht 55", postal_code: "3511 AC", city: "Utrecht", division_id: divisionId, customer_type: "particulier" as const, delivery_street_address: "Oudegracht 55", delivery_postal_code: "3511 AC", delivery_city: "Utrecht" },
      { id: "c0000001-0000-0000-0000-000000000003", first_name: "Pieter", last_name: "Jansen", email: "pieter@jansenbouw.nl", phone: "06-34567890", company_name: "Jansen Bouw BV", street_address: "Markt 12", postal_code: "6211 CK", city: "Maastricht", division_id: divisionId, customer_type: "zakelijk" as const, vat_number: "NL123456789B01", coc_number: "12345678", delivery_street_address: "Bonnefantenstraat 8", delivery_postal_code: "6211 KL", delivery_city: "Maastricht" },
      { id: "c0000001-0000-0000-0000-000000000004", first_name: "Sophie", last_name: "van den Berg", email: "sophie.vdberg@demo.nl", phone: "06-45678901", company_name: null, street_address: "Grote Markt 1", postal_code: "9711 LV", city: "Groningen", division_id: divisionId, customer_type: "particulier" as const, delivery_street_address: "Grote Markt 1", delivery_postal_code: "9711 LV", delivery_city: "Groningen" },
      { id: "c0000001-0000-0000-0000-000000000005", first_name: "Mark", last_name: "Willems", email: "mark.willems@demo.nl", phone: "06-56789012", company_name: null, street_address: "Plein 1992 nr 3", postal_code: "2511 CS", city: "Den Haag", division_id: divisionId, customer_type: "particulier" as const, delivery_street_address: "Plein 1992 nr 3", delivery_postal_code: "2511 CS", delivery_city: "Den Haag" },
      { id: "c0000001-0000-0000-0000-000000000006", first_name: "Eva", last_name: "Hendriks", email: "eva.hendriks@demo.nl", phone: "06-67890123", company_name: null, street_address: "Coolsingel 40", postal_code: "3011 AD", city: "Rotterdam", division_id: divisionId, customer_type: "particulier" as const, delivery_street_address: "Coolsingel 40", delivery_postal_code: "3011 AD", delivery_city: "Rotterdam" },
      { id: "c0000001-0000-0000-0000-000000000007", first_name: "Thomas", last_name: "Mulder", email: "thomas@mulderinterieurs.nl", phone: "06-78901234", company_name: "Mulder Interieurs", street_address: "Domstraat 10", postal_code: "3512 JC", city: "Utrecht", division_id: divisionId, customer_type: "zakelijk" as const, vat_number: "NL987654321B01", coc_number: "87654321", delivery_street_address: "Maliebaan 22", delivery_postal_code: "3581 CN", delivery_city: "Utrecht" },
      { id: "c0000001-0000-0000-0000-000000000008", first_name: "Anna", last_name: "Visser", email: "anna.visser@demo.nl", phone: "06-89012345", company_name: null, street_address: "Vrijthof 18", postal_code: "6211 LD", city: "Maastricht", division_id: divisionId, customer_type: "particulier" as const, delivery_street_address: "Vrijthof 18", delivery_postal_code: "6211 LD", delivery_city: "Maastricht" },
      { id: "c0000001-0000-0000-0000-000000000009", first_name: "Daan", last_name: "Smits", email: "daan.smits@demo.nl", phone: "06-90123456", company_name: null, street_address: "Lange Voorhout 8", postal_code: "2514 ED", city: "Den Haag", division_id: divisionId, customer_type: "particulier" as const, delivery_street_address: "Lange Voorhout 8", delivery_postal_code: "2514 ED", delivery_city: "Den Haag" },
      { id: "c0000001-0000-0000-0000-000000000010", first_name: "Fleur", last_name: "de Groot", email: "fleur.degroot@demo.nl", phone: "06-01234567", company_name: null, street_address: "Herengracht 450", postal_code: "1017 CA", city: "Amsterdam", division_id: divisionId, customer_type: "particulier" as const, delivery_street_address: "Herengracht 450", delivery_postal_code: "1017 CA", delivery_city: "Amsterdam" },
      { id: "c0000001-0000-0000-0000-000000000011", first_name: "Wouter", last_name: "Bos", email: "wouter@bosprojecten.nl", phone: "06-11223344", company_name: "Bos Projecten BV", street_address: "Stationsplein 45", postal_code: "3013 AK", city: "Rotterdam", division_id: divisionId, customer_type: "zakelijk" as const, vat_number: "NL555666777B01", delivery_street_address: "Westersingel 12", delivery_postal_code: "3014 GN", delivery_city: "Rotterdam" },
      { id: "c0000001-0000-0000-0000-000000000012", first_name: "Iris", last_name: "Meijer", email: "iris.meijer@demo.nl", phone: "06-22334455", company_name: null, street_address: "Neude 30", postal_code: "3512 AG", city: "Utrecht", division_id: divisionId, customer_type: "particulier" as const, delivery_street_address: "Neude 30", delivery_postal_code: "3512 AG", delivery_city: "Utrecht" },
    ];

    for (const c of customers) {
      await supabase.from("customers").upsert(c);
    }
    log.push(`✅ ${customers.length} demo customers created`);

    // ── 5. Demo Quotes (FIX: subtotal → subtotal_products) ──
    const quotes = [
      { id: "a0000001-0000-0000-0000-000000000001", customer_id: customers[0].id, division_id: divisionId, status: "concept", quote_number: 9001, reference: "de Vries - Keuken - 2026-001", subtotal_products: 12500, total_excl_vat: 12500, total_vat: 2625, total_incl_vat: 15125, created_at: daysAgo(2) },
      { id: "a0000001-0000-0000-0000-000000000002", customer_id: customers[1].id, division_id: divisionId, status: "verstuurd", quote_number: 9002, reference: "Bakker - Keuken - 2026-001", subtotal_products: 18750, total_excl_vat: 18750, total_vat: 3937.50, total_incl_vat: 22687.50, created_at: daysAgo(5), sent_at: daysAgo(4) },
      { id: "a0000001-0000-0000-0000-000000000003", customer_id: customers[2].id, division_id: divisionId, status: "geaccepteerd", quote_number: 9003, reference: "Jansen Bouw - Keuken - 2026-001", subtotal_products: 32500, total_excl_vat: 32500, total_vat: 6825, total_incl_vat: 39325, created_at: daysAgo(14), sent_at: daysAgo(13), accepted_at: daysAgo(7) },
      { id: "a0000001-0000-0000-0000-000000000004", customer_id: customers[3].id, division_id: divisionId, status: "bekeken", quote_number: 9004, reference: "van den Berg - Keuken - 2026-001", subtotal_products: 15800, total_excl_vat: 15800, total_vat: 3318, total_incl_vat: 19118, created_at: daysAgo(3), sent_at: daysAgo(2) },
      { id: "a0000001-0000-0000-0000-000000000005", customer_id: customers[4].id, division_id: divisionId, status: "vervallen", quote_number: 9005, reference: "Willems - Keuken - 2026-001", subtotal_products: 9200, total_excl_vat: 9200, total_vat: 1932, total_incl_vat: 11132, created_at: daysAgo(45), sent_at: daysAgo(44) },
      { id: "a0000001-0000-0000-0000-000000000006", customer_id: customers[5].id, division_id: divisionId, status: "verstuurd", quote_number: 9006, reference: "Hendriks - Keuken - 2026-001", subtotal_products: 21300, total_excl_vat: 21300, total_vat: 4473, total_incl_vat: 25773, created_at: daysAgo(1), sent_at: daysAgo(0) },
      { id: "a0000001-0000-0000-0000-000000000007", customer_id: customers[9].id, division_id: divisionId, status: "geaccepteerd", quote_number: 9007, reference: "de Groot - Keuken - 2026-001", subtotal_products: 28900, total_excl_vat: 28900, total_vat: 6069, total_incl_vat: 34969, created_at: daysAgo(20), sent_at: daysAgo(19), accepted_at: daysAgo(12) },
      { id: "a0000001-0000-0000-0000-000000000008", customer_id: customers[11].id, division_id: divisionId, status: "concept", quote_number: 9008, reference: "Meijer - Keuken - 2026-001", subtotal_products: 16400, total_excl_vat: 16400, total_vat: 3444, total_incl_vat: 19844, created_at: daysAgo(0) },
    ];

    for (const q of quotes) {
      await supabase.from("quotes").upsert(q);
    }
    log.push(`✅ ${quotes.length} demo quotes created`);

    // ── 6. Quote Sections with configuration fields (FIX 3) ──
    const quoteSections = [
      // Quote 1
      { id: "b5000001-0000-0000-0000-000000000001", quote_id: quotes[0].id, title: "Keukenkasten Stosa", section_type: "keukenmeubelen", sort_order: 1, supplier_id: stosaId, front_number: "F101", front_color: "Eiken Natuur", corpus_color: "Wit", handle_number: "G-220", model_code: "CITY", model_name: "City", subtotal: 6075 },
      { id: "b5000001-0000-0000-0000-000000000002", quote_id: quotes[0].id, title: "Apparatuur", section_type: "apparatuur", sort_order: 2, supplier_id: siemensId, subtotal: 4697 },
      // Quote 2
      { id: "b5000001-0000-0000-0000-000000000003", quote_id: quotes[1].id, title: "Keukenkasten Stosa", section_type: "keukenmeubelen", sort_order: 1, supplier_id: stosaId, front_number: "F205", front_color: "Lak Antraciet", corpus_color: "Antraciet", handle_number: "G-330", model_code: "ALEV", model_name: "Alev", subtotal: 5085 },
      { id: "b5000001-0000-0000-0000-000000000004", quote_id: quotes[1].id, title: "Apparatuur Miele", section_type: "apparatuur", sort_order: 2, supplier_id: mieleId, subtotal: 9997 },
      // Quote 3
      { id: "b5000001-0000-0000-0000-000000000005", quote_id: quotes[2].id, title: "Keukenkasten Stosa", section_type: "keukenmeubelen", sort_order: 1, supplier_id: stosaId, front_number: "F310", front_color: "Lak Wit Mat", corpus_color: "Wit", handle_number: null, model_code: "YORK", model_name: "York", subtotal: 10965 },
      { id: "b5000001-0000-0000-0000-000000000006", quote_id: quotes[2].id, title: "Apparatuur", section_type: "apparatuur", sort_order: 2, supplier_id: mieleId, subtotal: 6698 },
      { id: "b5000001-0000-0000-0000-000000000007", quote_id: quotes[2].id, title: "Werkblad & Spoelbak", section_type: "werkbladen", sort_order: 3, supplier_id: blancoId, subtotal: 1839 },
      // Quote 4
      { id: "b5000001-0000-0000-0000-000000000008", quote_id: quotes[3].id, title: "Keukenkasten", section_type: "keukenmeubelen", sort_order: 1, supplier_id: stosaId, front_number: "F101", front_color: "Eiken Natuur", corpus_color: "Wit", model_code: "CITY", model_name: "City", subtotal: 5900 },
      { id: "b5000001-0000-0000-0000-000000000009", quote_id: quotes[3].id, title: "Apparatuur Siemens", section_type: "apparatuur", sort_order: 2, supplier_id: siemensId, subtotal: 4697 },
      // Quote 5
      { id: "b5000001-0000-0000-0000-000000000010", quote_id: quotes[4].id, title: "Keukenkasten", section_type: "keukenmeubelen", sort_order: 1, supplier_id: stosaId, front_number: "F205", front_color: "Lak Antraciet", corpus_color: "Antraciet", model_code: "ALEV", model_name: "Alev", subtotal: 4850 },
      { id: "b5000001-0000-0000-0000-000000000011", quote_id: quotes[4].id, title: "Apparatuur", section_type: "apparatuur", sort_order: 2, supplier_id: boschId, subtotal: 1099 },
      // Quote 6
      { id: "b5000001-0000-0000-0000-000000000012", quote_id: quotes[5].id, title: "Keukenkasten Stosa", section_type: "keukenmeubelen", sort_order: 1, supplier_id: stosaId, front_number: "F310", front_color: "Lak Wit Mat", corpus_color: "Wit", handle_number: "G-220", model_code: "YORK", model_name: "York", subtotal: 7850 },
      { id: "b5000001-0000-0000-0000-000000000013", quote_id: quotes[5].id, title: "Apparatuur Miele", section_type: "apparatuur", sort_order: 2, supplier_id: mieleId, subtotal: 6498 },
      { id: "b5000001-0000-0000-0000-000000000014", quote_id: quotes[5].id, title: "Sanitair", section_type: "sanitair", sort_order: 3, supplier_id: quookerId, subtotal: 2384 },
      // Quote 7
      { id: "b5000001-0000-0000-0000-000000000015", quote_id: quotes[6].id, title: "Keukenkasten Stosa", section_type: "keukenmeubelen", sort_order: 1, supplier_id: stosaId, front_number: "F101", front_color: "Eiken Natuur", corpus_color: "Eiken", handle_number: "G-440", model_code: "CITY", model_name: "City", subtotal: 11200 },
      { id: "b5000001-0000-0000-0000-000000000016", quote_id: quotes[6].id, title: "Apparatuur", section_type: "apparatuur", sort_order: 2, supplier_id: mieleId, subtotal: 9997 },
      { id: "b5000001-0000-0000-0000-000000000017", quote_id: quotes[6].id, title: "Werkblad", section_type: "werkbladen", sort_order: 3, supplier_id: stosaId, subtotal: 1250 },
      // Quote 8
      { id: "b5000001-0000-0000-0000-000000000018", quote_id: quotes[7].id, title: "Keukenkasten", section_type: "keukenmeubelen", sort_order: 1, supplier_id: stosaId, front_number: "F205", front_color: "Lak Antraciet", corpus_color: "Antraciet", handle_number: "G-220", model_code: "ALEV", model_name: "Alev", subtotal: 6200 },
      { id: "b5000001-0000-0000-0000-000000000019", quote_id: quotes[7].id, title: "Apparatuur Siemens", section_type: "apparatuur", sort_order: 2, supplier_id: siemensId, subtotal: 4697 },
    ];

    for (const qs of quoteSections) {
      await supabase.from("quote_sections").upsert(qs);
    }
    log.push(`✅ ${quoteSections.length} demo quote sections created`);

    // ── 7. Quote Lines with explicit IDs (FIX 2) ──
    // Delete existing quote lines for these quotes first, then insert fresh
    const quoteIds = quotes.map(q => q.id);
    await supabase.from("quote_lines").delete().in("quote_id", quoteIds);

    const quoteLines = [
      // Quote 1 lines
      { id: "aa000001-0000-0000-0000-000000000001", quote_id: quotes[0].id, section_id: quoteSections[0].id, product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 4, unit_price: 485, line_total: 1940, sort_order: 1, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000002", quote_id: quotes[0].id, section_id: quoteSections[0].id, product_id: demoProducts[1].id, description: demoProducts[1].name, article_code: demoProducts[1].article_code, quantity: 2, unit_price: 625, line_total: 1250, sort_order: 2, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000003", quote_id: quotes[0].id, section_id: quoteSections[0].id, product_id: demoProducts[2].id, description: demoProducts[2].name, article_code: demoProducts[2].article_code, quantity: 3, unit_price: 365, line_total: 1095, sort_order: 3, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000004", quote_id: quotes[0].id, section_id: quoteSections[0].id, product_id: demoProducts[4].id, description: demoProducts[4].name, article_code: demoProducts[4].article_code, quantity: 2, unit_price: 895, line_total: 1790, sort_order: 4, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000005", quote_id: quotes[0].id, section_id: quoteSections[1].id, product_id: demoProducts[8].id, description: demoProducts[8].name, article_code: demoProducts[8].article_code, quantity: 1, unit_price: 1849, line_total: 1849, sort_order: 1, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000006", quote_id: quotes[0].id, section_id: quoteSections[1].id, product_id: demoProducts[7].id, description: demoProducts[7].name, article_code: demoProducts[7].article_code, quantity: 1, unit_price: 1299, line_total: 1299, sort_order: 2, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000007", quote_id: quotes[0].id, section_id: quoteSections[1].id, product_id: demoProducts[9].id, description: demoProducts[9].name, article_code: demoProducts[9].article_code, quantity: 1, unit_price: 1549, line_total: 1549, sort_order: 3, vat_rate: 21 },
      // Quote 2 lines
      { id: "aa000001-0000-0000-0000-000000000008", quote_id: quotes[1].id, section_id: quoteSections[2].id, product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 5, unit_price: 485, line_total: 2425, sort_order: 1, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000009", quote_id: quotes[1].id, section_id: quoteSections[2].id, product_id: demoProducts[1].id, description: demoProducts[1].name, article_code: demoProducts[1].article_code, quantity: 3, unit_price: 625, line_total: 1875, sort_order: 2, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000010", quote_id: quotes[1].id, section_id: quoteSections[2].id, product_id: demoProducts[5].id, description: demoProducts[5].name, article_code: demoProducts[5].article_code, quantity: 1, unit_price: 785, line_total: 785, sort_order: 3, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000011", quote_id: quotes[1].id, section_id: quoteSections[3].id, product_id: demoProducts[6].id, description: demoProducts[6].name, article_code: demoProducts[6].article_code, quantity: 1, unit_price: 2499, line_total: 2499, sort_order: 1, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000012", quote_id: quotes[1].id, section_id: quoteSections[3].id, product_id: demoProducts[17].id, description: demoProducts[17].name, article_code: demoProducts[17].article_code, quantity: 1, unit_price: 4199, line_total: 4199, sort_order: 2, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000013", quote_id: quotes[1].id, section_id: quoteSections[3].id, product_id: demoProducts[16].id, description: demoProducts[16].name, article_code: demoProducts[16].article_code, quantity: 1, unit_price: 3299, line_total: 3299, sort_order: 3, vat_rate: 21 },
      // Quote 3 lines (big project)
      { id: "aa000001-0000-0000-0000-000000000014", quote_id: quotes[2].id, section_id: quoteSections[4].id, product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 8, unit_price: 485, line_total: 3880, sort_order: 1, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000015", quote_id: quotes[2].id, section_id: quoteSections[4].id, product_id: demoProducts[1].id, description: demoProducts[1].name, article_code: demoProducts[1].article_code, quantity: 4, unit_price: 625, line_total: 2500, sort_order: 2, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000016", quote_id: quotes[2].id, section_id: quoteSections[4].id, product_id: demoProducts[3].id, description: demoProducts[3].name, article_code: demoProducts[3].article_code, quantity: 4, unit_price: 475, line_total: 1900, sort_order: 3, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000017", quote_id: quotes[2].id, section_id: quoteSections[4].id, product_id: demoProducts[4].id, description: demoProducts[4].name, article_code: demoProducts[4].article_code, quantity: 3, unit_price: 895, line_total: 2685, sort_order: 4, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000018", quote_id: quotes[2].id, section_id: quoteSections[5].id, product_id: demoProducts[6].id, description: demoProducts[6].name, article_code: demoProducts[6].article_code, quantity: 1, unit_price: 2499, line_total: 2499, sort_order: 1, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000019", quote_id: quotes[2].id, section_id: quoteSections[5].id, product_id: demoProducts[17].id, description: demoProducts[17].name, article_code: demoProducts[17].article_code, quantity: 1, unit_price: 4199, line_total: 4199, sort_order: 2, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000020", quote_id: quotes[2].id, section_id: quoteSections[6].id, product_id: demoProducts[13].id, description: demoProducts[13].name, article_code: demoProducts[13].article_code, quantity: 1, unit_price: 1250, line_total: 1250, sort_order: 1, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000021", quote_id: quotes[2].id, section_id: quoteSections[6].id, product_id: demoProducts[12].id, description: demoProducts[12].name, article_code: demoProducts[12].article_code, quantity: 1, unit_price: 589, line_total: 589, sort_order: 2, vat_rate: 21 },
      // Quote 4 lines
      { id: "aa000001-0000-0000-0000-000000000022", quote_id: quotes[3].id, section_id: quoteSections[7].id, product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 4, unit_price: 485, line_total: 1940, sort_order: 1, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000023", quote_id: quotes[3].id, section_id: quoteSections[7].id, product_id: demoProducts[2].id, description: demoProducts[2].name, article_code: demoProducts[2].article_code, quantity: 3, unit_price: 365, line_total: 1095, sort_order: 2, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000024", quote_id: quotes[3].id, section_id: quoteSections[7].id, product_id: demoProducts[4].id, description: demoProducts[4].name, article_code: demoProducts[4].article_code, quantity: 2, unit_price: 895, line_total: 1790, sort_order: 3, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000025", quote_id: quotes[3].id, section_id: quoteSections[8].id, product_id: demoProducts[8].id, description: demoProducts[8].name, article_code: demoProducts[8].article_code, quantity: 1, unit_price: 1849, line_total: 1849, sort_order: 1, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000026", quote_id: quotes[3].id, section_id: quoteSections[8].id, product_id: demoProducts[7].id, description: demoProducts[7].name, article_code: demoProducts[7].article_code, quantity: 1, unit_price: 1299, line_total: 1299, sort_order: 2, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000027", quote_id: quotes[3].id, section_id: quoteSections[8].id, product_id: demoProducts[9].id, description: demoProducts[9].name, article_code: demoProducts[9].article_code, quantity: 1, unit_price: 1549, line_total: 1549, sort_order: 3, vat_rate: 21 },
      // Quote 5 lines
      { id: "aa000001-0000-0000-0000-000000000028", quote_id: quotes[4].id, section_id: quoteSections[9].id, product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 3, unit_price: 485, line_total: 1455, sort_order: 1, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000029", quote_id: quotes[4].id, section_id: quoteSections[9].id, product_id: demoProducts[2].id, description: demoProducts[2].name, article_code: demoProducts[2].article_code, quantity: 3, unit_price: 365, line_total: 1095, sort_order: 2, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000030", quote_id: quotes[4].id, section_id: quoteSections[9].id, product_id: demoProducts[4].id, description: demoProducts[4].name, article_code: demoProducts[4].article_code, quantity: 1, unit_price: 895, line_total: 895, sort_order: 3, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000031", quote_id: quotes[4].id, section_id: quoteSections[10].id, product_id: demoProducts[10].id, description: demoProducts[10].name, article_code: demoProducts[10].article_code, quantity: 1, unit_price: 1099, line_total: 1099, sort_order: 1, vat_rate: 21 },
      // Quote 6 lines
      { id: "aa000001-0000-0000-0000-000000000032", quote_id: quotes[5].id, section_id: quoteSections[11].id, product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 5, unit_price: 485, line_total: 2425, sort_order: 1, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000033", quote_id: quotes[5].id, section_id: quoteSections[11].id, product_id: demoProducts[1].id, description: demoProducts[1].name, article_code: demoProducts[1].article_code, quantity: 3, unit_price: 625, line_total: 1875, sort_order: 2, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000034", quote_id: quotes[5].id, section_id: quoteSections[11].id, product_id: demoProducts[5].id, description: demoProducts[5].name, article_code: demoProducts[5].article_code, quantity: 1, unit_price: 785, line_total: 785, sort_order: 3, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000035", quote_id: quotes[5].id, section_id: quoteSections[12].id, product_id: demoProducts[6].id, description: demoProducts[6].name, article_code: demoProducts[6].article_code, quantity: 1, unit_price: 2499, line_total: 2499, sort_order: 1, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000036", quote_id: quotes[5].id, section_id: quoteSections[12].id, product_id: demoProducts[17].id, description: demoProducts[17].name, article_code: demoProducts[17].article_code, quantity: 1, unit_price: 4199, line_total: 4199, sort_order: 2, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000037", quote_id: quotes[5].id, section_id: quoteSections[13].id, product_id: demoProducts[11].id, description: demoProducts[11].name, article_code: demoProducts[11].article_code, quantity: 1, unit_price: 1795, line_total: 1795, sort_order: 1, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000038", quote_id: quotes[5].id, section_id: quoteSections[13].id, product_id: demoProducts[12].id, description: demoProducts[12].name, article_code: demoProducts[12].article_code, quantity: 1, unit_price: 589, line_total: 589, sort_order: 2, vat_rate: 21 },
      // Quote 7 lines
      { id: "aa000001-0000-0000-0000-000000000039", quote_id: quotes[6].id, section_id: quoteSections[14].id, product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 6, unit_price: 485, line_total: 2910, sort_order: 1, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000040", quote_id: quotes[6].id, section_id: quoteSections[14].id, product_id: demoProducts[1].id, description: demoProducts[1].name, article_code: demoProducts[1].article_code, quantity: 4, unit_price: 625, line_total: 2500, sort_order: 2, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000041", quote_id: quotes[6].id, section_id: quoteSections[14].id, product_id: demoProducts[3].id, description: demoProducts[3].name, article_code: demoProducts[3].article_code, quantity: 3, unit_price: 475, line_total: 1425, sort_order: 3, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000042", quote_id: quotes[6].id, section_id: quoteSections[14].id, product_id: demoProducts[4].id, description: demoProducts[4].name, article_code: demoProducts[4].article_code, quantity: 3, unit_price: 895, line_total: 2685, sort_order: 4, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000043", quote_id: quotes[6].id, section_id: quoteSections[15].id, product_id: demoProducts[6].id, description: demoProducts[6].name, article_code: demoProducts[6].article_code, quantity: 1, unit_price: 2499, line_total: 2499, sort_order: 1, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000044", quote_id: quotes[6].id, section_id: quoteSections[15].id, product_id: demoProducts[17].id, description: demoProducts[17].name, article_code: demoProducts[17].article_code, quantity: 1, unit_price: 4199, line_total: 4199, sort_order: 2, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000045", quote_id: quotes[6].id, section_id: quoteSections[15].id, product_id: demoProducts[16].id, description: demoProducts[16].name, article_code: demoProducts[16].article_code, quantity: 1, unit_price: 3299, line_total: 3299, sort_order: 3, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000046", quote_id: quotes[6].id, section_id: quoteSections[16].id, product_id: demoProducts[13].id, description: demoProducts[13].name, article_code: demoProducts[13].article_code, quantity: 1, unit_price: 1250, line_total: 1250, sort_order: 1, vat_rate: 21 },
      // Quote 8 lines
      { id: "aa000001-0000-0000-0000-000000000047", quote_id: quotes[7].id, section_id: quoteSections[17].id, product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 4, unit_price: 485, line_total: 1940, sort_order: 1, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000048", quote_id: quotes[7].id, section_id: quoteSections[17].id, product_id: demoProducts[2].id, description: demoProducts[2].name, article_code: demoProducts[2].article_code, quantity: 4, unit_price: 365, line_total: 1460, sort_order: 2, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000049", quote_id: quotes[7].id, section_id: quoteSections[17].id, product_id: demoProducts[4].id, description: demoProducts[4].name, article_code: demoProducts[4].article_code, quantity: 2, unit_price: 895, line_total: 1790, sort_order: 3, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000050", quote_id: quotes[7].id, section_id: quoteSections[18].id, product_id: demoProducts[8].id, description: demoProducts[8].name, article_code: demoProducts[8].article_code, quantity: 1, unit_price: 1849, line_total: 1849, sort_order: 1, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000051", quote_id: quotes[7].id, section_id: quoteSections[18].id, product_id: demoProducts[7].id, description: demoProducts[7].name, article_code: demoProducts[7].article_code, quantity: 1, unit_price: 1299, line_total: 1299, sort_order: 2, vat_rate: 21 },
      { id: "aa000001-0000-0000-0000-000000000052", quote_id: quotes[7].id, section_id: quoteSections[18].id, product_id: demoProducts[9].id, description: demoProducts[9].name, article_code: demoProducts[9].article_code, quantity: 1, unit_price: 1549, line_total: 1549, sort_order: 3, vat_rate: 21 },
    ];

    for (const ql of quoteLines) {
      await supabase.from("quote_lines").upsert(ql);
    }
    log.push(`✅ ${quoteLines.length} demo quote lines created`);

    // ── 8. Demo Orders (FIX 6 & 7: dynamic dates for agenda + calendar) ──
    const orders = [
      // Order 8001 - besteld, delivery in 5 days
      { id: "f0000001-0000-0000-0000-000000000001", customer_id: customers[2].id, division_id: divisionId, quote_id: quotes[2].id, status: "besteld" as const, order_number: 8001, order_date: daysAgo(7), total_excl_vat: 32500, total_incl_vat: 39325, total_vat: 6825, total_cost_price: 19500, payment_status: "deels_betaald" as const, amount_paid: 15000, deposit_required: true, deposit_invoice_sent: true, installation_street_address: "Markt 12", installation_postal_code: "6211 CK", installation_city: "Maastricht", delivery_street_address: "Bonnefantenstraat 8", delivery_postal_code: "6211 KL", delivery_city: "Maastricht", expected_delivery_date: daysFromNow(5), expected_installation_date: daysFromNow(10), forecast_week: "2026-12" },
      // Order 8002 - in_productie, delivery in 3 days
      { id: "f0000001-0000-0000-0000-000000000002", customer_id: customers[9].id, division_id: divisionId, quote_id: quotes[6].id, status: "in_productie" as const, order_number: 8002, order_date: daysAgo(12), total_excl_vat: 28900, total_incl_vat: 34969, total_vat: 6069, total_cost_price: 17340, payment_status: "betaald" as const, amount_paid: 34969, deposit_required: true, deposit_invoice_sent: true, installation_street_address: "Herengracht 450", installation_postal_code: "1017 CA", installation_city: "Amsterdam", expected_delivery_date: daysFromNow(3), expected_installation_date: daysFromNow(8), forecast_week: "2026-11" },
      // Order 8003 - nieuw
      { id: "f0000001-0000-0000-0000-000000000003", customer_id: customers[7].id, division_id: divisionId, status: "nieuw" as const, order_number: 8003, order_date: daysAgo(1), total_excl_vat: 14200, total_incl_vat: 17182, total_vat: 2982, total_cost_price: 8520, payment_status: "open" as const, amount_paid: 0, deposit_required: true, deposit_invoice_sent: false, installation_street_address: "Vrijthof 18", installation_postal_code: "6211 LD", installation_city: "Maastricht", forecast_week: "2026-14" },
      // Order 8004 - levering_gepland TODAY (AGENDA!)
      { id: "f0000001-0000-0000-0000-000000000004", customer_id: customers[5].id, division_id: divisionId, status: "levering_gepland" as const, order_number: 8004, order_date: daysAgo(30), total_excl_vat: 21300, total_incl_vat: 25773, total_vat: 4473, total_cost_price: 12780, payment_status: "betaald" as const, amount_paid: 25773, deposit_required: true, deposit_invoice_sent: true, installation_street_address: "Coolsingel 40", installation_postal_code: "3011 AD", installation_city: "Rotterdam", expected_delivery_date: today, expected_installation_date: daysFromNow(4), forecast_week: "2026-10" },
      // Order 8005 - montage_gepland TODAY (AGENDA!)
      { id: "f0000001-0000-0000-0000-000000000005", customer_id: customers[6].id, division_id: divisionId, status: "montage_gepland" as const, order_number: 8005, order_date: daysAgo(45), total_excl_vat: 26800, total_incl_vat: 32428, total_vat: 5628, total_cost_price: 16080, payment_status: "betaald" as const, amount_paid: 32428, deposit_required: true, deposit_invoice_sent: true, installation_street_address: "Maliebaan 22", installation_postal_code: "3581 CN", installation_city: "Utrecht", actual_delivery_date: daysAgo(3), expected_installation_date: today, forecast_week: "2026-09" },
      // Order 8006 - levering_gepland TODAY (AGENDA! 2nd delivery)
      { id: "f0000001-0000-0000-0000-000000000006", customer_id: customers[8].id, division_id: divisionId, status: "levering_gepland" as const, order_number: 8006, order_date: daysAgo(25), total_excl_vat: 19500, total_incl_vat: 23595, total_vat: 4095, total_cost_price: 11700, payment_status: "betaald" as const, amount_paid: 23595, deposit_required: true, deposit_invoice_sent: true, installation_street_address: "Lange Voorhout 8", installation_postal_code: "2514 ED", installation_city: "Den Haag", expected_delivery_date: today, expected_installation_date: daysFromNow(6), forecast_week: "2026-10" },
      // Order 8007 - montage_gepland, installation tomorrow (calendar)
      { id: "f0000001-0000-0000-0000-000000000007", customer_id: customers[10].id, division_id: divisionId, status: "montage_gepland" as const, order_number: 8007, order_date: daysAgo(50), total_excl_vat: 35200, total_incl_vat: 42592, total_vat: 7392, total_cost_price: 21120, payment_status: "betaald" as const, amount_paid: 42592, deposit_required: true, deposit_invoice_sent: true, installation_street_address: "Westersingel 12", installation_postal_code: "3014 GN", installation_city: "Rotterdam", actual_delivery_date: daysAgo(5), expected_installation_date: daysFromNow(1), forecast_week: "2026-10" },
      // Order 8008 - bestel_klaar, delivery in 7 days
      { id: "f0000001-0000-0000-0000-000000000008", customer_id: customers[0].id, division_id: divisionId, status: "bestel_klaar" as const, order_number: 8008, order_date: daysAgo(4), total_excl_vat: 12500, total_incl_vat: 15125, total_vat: 2625, total_cost_price: 7500, payment_status: "deels_betaald" as const, amount_paid: 5000, deposit_required: true, deposit_invoice_sent: true, installation_street_address: "Prinsengracht 263", installation_postal_code: "1016 GV", installation_city: "Amsterdam", expected_delivery_date: daysFromNow(7), expected_installation_date: daysFromNow(12), forecast_week: "2026-13" },
    ];

    for (const o of orders) {
      await supabase.from("orders").upsert(o);
    }
    log.push(`✅ ${orders.length} demo orders created`);

    // ── 9. Order Sections (FIX 5) ──
    const orderSections = [
      // Order 8001 (from quote 3)
      { id: "cc000001-0000-0000-0000-000000000001", order_id: orders[0].id, quote_section_id: quoteSections[4].id, title: "Keukenkasten Stosa", section_type: "keukenmeubelen", sort_order: 1, front_number: "F310", front_color: "Lak Wit Mat", corpus_color: "Wit", subtotal: 10965 },
      { id: "cc000001-0000-0000-0000-000000000002", order_id: orders[0].id, quote_section_id: quoteSections[5].id, title: "Apparatuur", section_type: "apparatuur", sort_order: 2, subtotal: 6698 },
      { id: "cc000001-0000-0000-0000-000000000003", order_id: orders[0].id, quote_section_id: quoteSections[6].id, title: "Werkblad & Spoelbak", section_type: "werkbladen", sort_order: 3, subtotal: 1839 },
      // Order 8004
      { id: "cc000001-0000-0000-0000-000000000004", order_id: orders[3].id, title: "Keukenkasten Stosa", section_type: "keukenmeubelen", sort_order: 1, front_number: "F310", front_color: "Lak Wit Mat", corpus_color: "Wit", handle_number: "G-220", subtotal: 8500 },
      { id: "cc000001-0000-0000-0000-000000000005", order_id: orders[3].id, title: "Apparatuur Miele", section_type: "apparatuur", sort_order: 2, subtotal: 6498 },
      { id: "cc000001-0000-0000-0000-000000000006", order_id: orders[3].id, title: "Sanitair", section_type: "sanitair", sort_order: 3, subtotal: 2384 },
      // Order 8005
      { id: "cc000001-0000-0000-0000-000000000007", order_id: orders[4].id, title: "Keukenkasten Stosa", section_type: "keukenmeubelen", sort_order: 1, front_number: "F101", front_color: "Eiken Natuur", corpus_color: "Eiken", handle_number: "G-440", subtotal: 11200 },
      { id: "cc000001-0000-0000-0000-000000000008", order_id: orders[4].id, title: "Apparatuur Miele", section_type: "apparatuur", sort_order: 2, subtotal: 9997 },
      // Order 8006
      { id: "cc000001-0000-0000-0000-000000000009", order_id: orders[5].id, title: "Keukenkasten", section_type: "keukenmeubelen", sort_order: 1, front_number: "F205", front_color: "Lak Antraciet", corpus_color: "Antraciet", subtotal: 6500 },
      { id: "cc000001-0000-0000-0000-000000000010", order_id: orders[5].id, title: "Apparatuur Siemens", section_type: "apparatuur", sort_order: 2, subtotal: 4697 },
      // Order 8007
      { id: "cc000001-0000-0000-0000-000000000011", order_id: orders[6].id, title: "Keukenkasten Stosa", section_type: "keukenmeubelen", sort_order: 1, front_number: "F101", front_color: "Eiken Natuur", corpus_color: "Wit", handle_number: "G-330", subtotal: 14200 },
      { id: "cc000001-0000-0000-0000-000000000012", order_id: orders[6].id, title: "Apparatuur", section_type: "apparatuur", sort_order: 2, subtotal: 9997 },
      { id: "cc000001-0000-0000-0000-000000000013", order_id: orders[6].id, title: "Werkblad", section_type: "werkbladen", sort_order: 3, subtotal: 1250 },
      // Order 8008
      { id: "cc000001-0000-0000-0000-000000000014", order_id: orders[7].id, title: "Keukenkasten Stosa", section_type: "keukenmeubelen", sort_order: 1, front_number: "F101", front_color: "Eiken Natuur", corpus_color: "Wit", handle_number: "G-220", subtotal: 6075 },
      { id: "cc000001-0000-0000-0000-000000000015", order_id: orders[7].id, title: "Apparatuur", section_type: "apparatuur", sort_order: 2, subtotal: 4697 },
    ];

    for (const os of orderSections) {
      await supabase.from("order_sections").upsert(os);
    }
    log.push(`✅ ${orderSections.length} demo order sections created`);

    // ── 10. Order Lines for ALL orders (FIX 4) ──
    const orderIds = orders.map(o => o.id);
    await supabase.from("order_lines").delete().in("order_id", orderIds);

    const orderLines = [
      // Order 8001 (besteld)
      { id: "bb000001-0000-0000-0000-000000000001", order_id: orders[0].id, section_id: "cc000001-0000-0000-0000-000000000001", product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 8, unit_price: 485, cost_price: 290, line_total: 3880, sort_order: 1, vat_rate: 21, supplier_id: stosaId, is_ordered: true, ordered_at: daysAgo(5) },
      { id: "bb000001-0000-0000-0000-000000000002", order_id: orders[0].id, section_id: "cc000001-0000-0000-0000-000000000001", product_id: demoProducts[1].id, description: demoProducts[1].name, article_code: demoProducts[1].article_code, quantity: 4, unit_price: 625, cost_price: 375, line_total: 2500, sort_order: 2, vat_rate: 21, supplier_id: stosaId, is_ordered: true, ordered_at: daysAgo(5) },
      { id: "bb000001-0000-0000-0000-000000000003", order_id: orders[0].id, section_id: "cc000001-0000-0000-0000-000000000001", product_id: demoProducts[3].id, description: demoProducts[3].name, article_code: demoProducts[3].article_code, quantity: 4, unit_price: 475, cost_price: 285, line_total: 1900, sort_order: 3, vat_rate: 21, supplier_id: stosaId, is_ordered: true, ordered_at: daysAgo(5) },
      { id: "bb000001-0000-0000-0000-000000000004", order_id: orders[0].id, section_id: "cc000001-0000-0000-0000-000000000001", product_id: demoProducts[4].id, description: demoProducts[4].name, article_code: demoProducts[4].article_code, quantity: 3, unit_price: 895, cost_price: 537, line_total: 2685, sort_order: 4, vat_rate: 21, supplier_id: stosaId, is_ordered: true, ordered_at: daysAgo(5) },
      { id: "bb000001-0000-0000-0000-000000000005", order_id: orders[0].id, section_id: "cc000001-0000-0000-0000-000000000002", product_id: demoProducts[6].id, description: demoProducts[6].name, article_code: demoProducts[6].article_code, quantity: 1, unit_price: 2499, cost_price: 1749, line_total: 2499, sort_order: 1, vat_rate: 21, supplier_id: mieleId, is_ordered: true, ordered_at: daysAgo(5) },
      { id: "bb000001-0000-0000-0000-000000000006", order_id: orders[0].id, section_id: "cc000001-0000-0000-0000-000000000002", product_id: demoProducts[17].id, description: demoProducts[17].name, article_code: demoProducts[17].article_code, quantity: 1, unit_price: 4199, cost_price: 2939, line_total: 4199, sort_order: 2, vat_rate: 21, supplier_id: mieleId, is_ordered: true, ordered_at: daysAgo(5) },
      { id: "bb000001-0000-0000-0000-000000000007", order_id: orders[0].id, section_id: "cc000001-0000-0000-0000-000000000003", product_id: demoProducts[13].id, description: demoProducts[13].name, article_code: demoProducts[13].article_code, quantity: 1, unit_price: 1250, cost_price: 750, line_total: 1250, sort_order: 1, vat_rate: 21, supplier_id: stosaId },
      { id: "bb000001-0000-0000-0000-000000000008", order_id: orders[0].id, section_id: "cc000001-0000-0000-0000-000000000003", product_id: demoProducts[12].id, description: demoProducts[12].name, article_code: demoProducts[12].article_code, quantity: 1, unit_price: 589, cost_price: 412, line_total: 589, sort_order: 2, vat_rate: 21, supplier_id: blancoId },

      // Order 8003 (nieuw)
      { id: "bb000001-0000-0000-0000-000000000009", order_id: orders[2].id, product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 4, unit_price: 485, cost_price: 290, line_total: 1940, sort_order: 1, vat_rate: 21, supplier_id: stosaId },
      { id: "bb000001-0000-0000-0000-000000000010", order_id: orders[2].id, product_id: demoProducts[8].id, description: demoProducts[8].name, article_code: demoProducts[8].article_code, quantity: 1, unit_price: 1849, cost_price: 1294, line_total: 1849, sort_order: 2, vat_rate: 21, supplier_id: siemensId },
      { id: "bb000001-0000-0000-0000-000000000011", order_id: orders[2].id, product_id: demoProducts[11].id, description: demoProducts[11].name, article_code: demoProducts[11].article_code, quantity: 1, unit_price: 1795, cost_price: 1256, line_total: 1795, sort_order: 3, vat_rate: 21, supplier_id: quookerId },

      // Order 8004 (levering_gepland TODAY)
      { id: "bb000001-0000-0000-0000-000000000012", order_id: orders[3].id, section_id: "cc000001-0000-0000-0000-000000000004", product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 5, unit_price: 485, cost_price: 290, line_total: 2425, sort_order: 1, vat_rate: 21, supplier_id: stosaId, is_ordered: true, ordered_at: daysAgo(20) },
      { id: "bb000001-0000-0000-0000-000000000013", order_id: orders[3].id, section_id: "cc000001-0000-0000-0000-000000000004", product_id: demoProducts[1].id, description: demoProducts[1].name, article_code: demoProducts[1].article_code, quantity: 3, unit_price: 625, cost_price: 375, line_total: 1875, sort_order: 2, vat_rate: 21, supplier_id: stosaId, is_ordered: true, ordered_at: daysAgo(20) },
      { id: "bb000001-0000-0000-0000-000000000014", order_id: orders[3].id, section_id: "cc000001-0000-0000-0000-000000000004", product_id: demoProducts[5].id, description: demoProducts[5].name, article_code: demoProducts[5].article_code, quantity: 1, unit_price: 785, cost_price: 471, line_total: 785, sort_order: 3, vat_rate: 21, supplier_id: stosaId, is_ordered: true, ordered_at: daysAgo(20) },
      { id: "bb000001-0000-0000-0000-000000000015", order_id: orders[3].id, section_id: "cc000001-0000-0000-0000-000000000005", product_id: demoProducts[6].id, description: demoProducts[6].name, article_code: demoProducts[6].article_code, quantity: 1, unit_price: 2499, cost_price: 1749, line_total: 2499, sort_order: 1, vat_rate: 21, supplier_id: mieleId, is_ordered: true, ordered_at: daysAgo(20) },
      { id: "bb000001-0000-0000-0000-000000000016", order_id: orders[3].id, section_id: "cc000001-0000-0000-0000-000000000005", product_id: demoProducts[17].id, description: demoProducts[17].name, article_code: demoProducts[17].article_code, quantity: 1, unit_price: 4199, cost_price: 2939, line_total: 4199, sort_order: 2, vat_rate: 21, supplier_id: mieleId, is_ordered: true, ordered_at: daysAgo(20) },
      { id: "bb000001-0000-0000-0000-000000000017", order_id: orders[3].id, section_id: "cc000001-0000-0000-0000-000000000006", product_id: demoProducts[11].id, description: demoProducts[11].name, article_code: demoProducts[11].article_code, quantity: 1, unit_price: 1795, cost_price: 1256, line_total: 1795, sort_order: 1, vat_rate: 21, supplier_id: quookerId, is_ordered: true, ordered_at: daysAgo(20) },
      { id: "bb000001-0000-0000-0000-000000000018", order_id: orders[3].id, section_id: "cc000001-0000-0000-0000-000000000006", product_id: demoProducts[12].id, description: demoProducts[12].name, article_code: demoProducts[12].article_code, quantity: 1, unit_price: 589, cost_price: 412, line_total: 589, sort_order: 2, vat_rate: 21, supplier_id: blancoId, is_ordered: true, ordered_at: daysAgo(20) },

      // Order 8005 (montage_gepland TODAY)
      { id: "bb000001-0000-0000-0000-000000000019", order_id: orders[4].id, section_id: "cc000001-0000-0000-0000-000000000007", product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 6, unit_price: 485, cost_price: 290, line_total: 2910, sort_order: 1, vat_rate: 21, supplier_id: stosaId, is_ordered: true, is_delivered: true, delivered_at: daysAgo(3) },
      { id: "bb000001-0000-0000-0000-000000000020", order_id: orders[4].id, section_id: "cc000001-0000-0000-0000-000000000007", product_id: demoProducts[1].id, description: demoProducts[1].name, article_code: demoProducts[1].article_code, quantity: 4, unit_price: 625, cost_price: 375, line_total: 2500, sort_order: 2, vat_rate: 21, supplier_id: stosaId, is_ordered: true, is_delivered: true, delivered_at: daysAgo(3) },
      { id: "bb000001-0000-0000-0000-000000000021", order_id: orders[4].id, section_id: "cc000001-0000-0000-0000-000000000007", product_id: demoProducts[3].id, description: demoProducts[3].name, article_code: demoProducts[3].article_code, quantity: 3, unit_price: 475, cost_price: 285, line_total: 1425, sort_order: 3, vat_rate: 21, supplier_id: stosaId, is_ordered: true, is_delivered: true, delivered_at: daysAgo(3) },
      { id: "bb000001-0000-0000-0000-000000000022", order_id: orders[4].id, section_id: "cc000001-0000-0000-0000-000000000007", product_id: demoProducts[4].id, description: demoProducts[4].name, article_code: demoProducts[4].article_code, quantity: 3, unit_price: 895, cost_price: 537, line_total: 2685, sort_order: 4, vat_rate: 21, supplier_id: stosaId, is_ordered: true, is_delivered: true, delivered_at: daysAgo(3) },
      { id: "bb000001-0000-0000-0000-000000000023", order_id: orders[4].id, section_id: "cc000001-0000-0000-0000-000000000008", product_id: demoProducts[6].id, description: demoProducts[6].name, article_code: demoProducts[6].article_code, quantity: 1, unit_price: 2499, cost_price: 1749, line_total: 2499, sort_order: 1, vat_rate: 21, supplier_id: mieleId, is_ordered: true, is_delivered: true, delivered_at: daysAgo(3) },
      { id: "bb000001-0000-0000-0000-000000000024", order_id: orders[4].id, section_id: "cc000001-0000-0000-0000-000000000008", product_id: demoProducts[17].id, description: demoProducts[17].name, article_code: demoProducts[17].article_code, quantity: 1, unit_price: 4199, cost_price: 2939, line_total: 4199, sort_order: 2, vat_rate: 21, supplier_id: mieleId, is_ordered: true, is_delivered: true, delivered_at: daysAgo(3) },
      { id: "bb000001-0000-0000-0000-000000000025", order_id: orders[4].id, section_id: "cc000001-0000-0000-0000-000000000008", product_id: demoProducts[16].id, description: demoProducts[16].name, article_code: demoProducts[16].article_code, quantity: 1, unit_price: 3299, cost_price: 2309, line_total: 3299, sort_order: 3, vat_rate: 21, supplier_id: mieleId, is_ordered: true, is_delivered: true, delivered_at: daysAgo(3) },
      { id: "bb000001-0000-0000-0000-000000000026", order_id: orders[4].id, product_id: demoProducts[14].id, description: demoProducts[14].name, article_code: demoProducts[14].article_code, quantity: 3, unit_price: 450, cost_price: 280, line_total: 1350, sort_order: 7, vat_rate: 21, supplier_id: stosaId },
      { id: "bb000001-0000-0000-0000-000000000027", order_id: orders[4].id, product_id: demoProducts[15].id, description: demoProducts[15].name, article_code: demoProducts[15].article_code, quantity: 1, unit_price: 295, cost_price: 195, line_total: 295, sort_order: 8, vat_rate: 21, supplier_id: stosaId },

      // Order 8006 (levering_gepland TODAY)
      { id: "bb000001-0000-0000-0000-000000000028", order_id: orders[5].id, section_id: "cc000001-0000-0000-0000-000000000009", product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 4, unit_price: 485, cost_price: 290, line_total: 1940, sort_order: 1, vat_rate: 21, supplier_id: stosaId, is_ordered: true, ordered_at: daysAgo(15) },
      { id: "bb000001-0000-0000-0000-000000000029", order_id: orders[5].id, section_id: "cc000001-0000-0000-0000-000000000009", product_id: demoProducts[2].id, description: demoProducts[2].name, article_code: demoProducts[2].article_code, quantity: 4, unit_price: 365, cost_price: 219, line_total: 1460, sort_order: 2, vat_rate: 21, supplier_id: stosaId, is_ordered: true, ordered_at: daysAgo(15) },
      { id: "bb000001-0000-0000-0000-000000000030", order_id: orders[5].id, section_id: "cc000001-0000-0000-0000-000000000009", product_id: demoProducts[4].id, description: demoProducts[4].name, article_code: demoProducts[4].article_code, quantity: 2, unit_price: 895, cost_price: 537, line_total: 1790, sort_order: 3, vat_rate: 21, supplier_id: stosaId, is_ordered: true, ordered_at: daysAgo(15) },
      { id: "bb000001-0000-0000-0000-000000000031", order_id: orders[5].id, section_id: "cc000001-0000-0000-0000-000000000010", product_id: demoProducts[8].id, description: demoProducts[8].name, article_code: demoProducts[8].article_code, quantity: 1, unit_price: 1849, cost_price: 1294, line_total: 1849, sort_order: 1, vat_rate: 21, supplier_id: siemensId, is_ordered: true, ordered_at: daysAgo(15) },
      { id: "bb000001-0000-0000-0000-000000000032", order_id: orders[5].id, section_id: "cc000001-0000-0000-0000-000000000010", product_id: demoProducts[7].id, description: demoProducts[7].name, article_code: demoProducts[7].article_code, quantity: 1, unit_price: 1299, cost_price: 909, line_total: 1299, sort_order: 2, vat_rate: 21, supplier_id: siemensId, is_ordered: true, ordered_at: daysAgo(15) },
      { id: "bb000001-0000-0000-0000-000000000033", order_id: orders[5].id, section_id: "cc000001-0000-0000-0000-000000000010", product_id: demoProducts[9].id, description: demoProducts[9].name, article_code: demoProducts[9].article_code, quantity: 1, unit_price: 1549, cost_price: 1084, line_total: 1549, sort_order: 3, vat_rate: 21, supplier_id: siemensId, is_ordered: true, ordered_at: daysAgo(15) },

      // Order 8007 (montage_gepland, installation tomorrow)
      { id: "bb000001-0000-0000-0000-000000000034", order_id: orders[6].id, section_id: "cc000001-0000-0000-0000-000000000011", product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 8, unit_price: 485, cost_price: 290, line_total: 3880, sort_order: 1, vat_rate: 21, supplier_id: stosaId, is_ordered: true, is_delivered: true, delivered_at: daysAgo(5) },
      { id: "bb000001-0000-0000-0000-000000000035", order_id: orders[6].id, section_id: "cc000001-0000-0000-0000-000000000011", product_id: demoProducts[1].id, description: demoProducts[1].name, article_code: demoProducts[1].article_code, quantity: 4, unit_price: 625, cost_price: 375, line_total: 2500, sort_order: 2, vat_rate: 21, supplier_id: stosaId, is_ordered: true, is_delivered: true, delivered_at: daysAgo(5) },
      { id: "bb000001-0000-0000-0000-000000000036", order_id: orders[6].id, section_id: "cc000001-0000-0000-0000-000000000011", product_id: demoProducts[3].id, description: demoProducts[3].name, article_code: demoProducts[3].article_code, quantity: 6, unit_price: 475, cost_price: 285, line_total: 2850, sort_order: 3, vat_rate: 21, supplier_id: stosaId, is_ordered: true, is_delivered: true, delivered_at: daysAgo(5) },
      { id: "bb000001-0000-0000-0000-000000000037", order_id: orders[6].id, section_id: "cc000001-0000-0000-0000-000000000011", product_id: demoProducts[4].id, description: demoProducts[4].name, article_code: demoProducts[4].article_code, quantity: 4, unit_price: 895, cost_price: 537, line_total: 3580, sort_order: 4, vat_rate: 21, supplier_id: stosaId, is_ordered: true, is_delivered: true, delivered_at: daysAgo(5) },
      { id: "bb000001-0000-0000-0000-000000000038", order_id: orders[6].id, section_id: "cc000001-0000-0000-0000-000000000012", product_id: demoProducts[6].id, description: demoProducts[6].name, article_code: demoProducts[6].article_code, quantity: 1, unit_price: 2499, cost_price: 1749, line_total: 2499, sort_order: 1, vat_rate: 21, supplier_id: mieleId, is_ordered: true, is_delivered: true, delivered_at: daysAgo(5) },
      { id: "bb000001-0000-0000-0000-000000000039", order_id: orders[6].id, section_id: "cc000001-0000-0000-0000-000000000012", product_id: demoProducts[17].id, description: demoProducts[17].name, article_code: demoProducts[17].article_code, quantity: 1, unit_price: 4199, cost_price: 2939, line_total: 4199, sort_order: 2, vat_rate: 21, supplier_id: mieleId, is_ordered: true, is_delivered: true, delivered_at: daysAgo(5) },
      { id: "bb000001-0000-0000-0000-000000000040", order_id: orders[6].id, section_id: "cc000001-0000-0000-0000-000000000012", product_id: demoProducts[16].id, description: demoProducts[16].name, article_code: demoProducts[16].article_code, quantity: 1, unit_price: 3299, cost_price: 2309, line_total: 3299, sort_order: 3, vat_rate: 21, supplier_id: mieleId, is_ordered: true, is_delivered: true, delivered_at: daysAgo(5) },
      { id: "bb000001-0000-0000-0000-000000000041", order_id: orders[6].id, section_id: "cc000001-0000-0000-0000-000000000013", product_id: demoProducts[13].id, description: demoProducts[13].name, article_code: demoProducts[13].article_code, quantity: 1, unit_price: 1250, cost_price: 750, line_total: 1250, sort_order: 1, vat_rate: 21, supplier_id: stosaId, is_ordered: true, is_delivered: true, delivered_at: daysAgo(5) },
      { id: "bb000001-0000-0000-0000-000000000042", order_id: orders[6].id, product_id: demoProducts[14].id, description: demoProducts[14].name, article_code: demoProducts[14].article_code, quantity: 4, unit_price: 450, cost_price: 280, line_total: 1800, sort_order: 8, vat_rate: 21, supplier_id: stosaId },
      { id: "bb000001-0000-0000-0000-000000000043", order_id: orders[6].id, product_id: demoProducts[15].id, description: demoProducts[15].name, article_code: demoProducts[15].article_code, quantity: 1, unit_price: 295, cost_price: 195, line_total: 295, sort_order: 9, vat_rate: 21, supplier_id: stosaId },

      // Order 8008 (bestel_klaar)
      { id: "bb000001-0000-0000-0000-000000000044", order_id: orders[7].id, section_id: "cc000001-0000-0000-0000-000000000014", product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 4, unit_price: 485, cost_price: 290, line_total: 1940, sort_order: 1, vat_rate: 21, supplier_id: stosaId },
      { id: "bb000001-0000-0000-0000-000000000045", order_id: orders[7].id, section_id: "cc000001-0000-0000-0000-000000000014", product_id: demoProducts[2].id, description: demoProducts[2].name, article_code: demoProducts[2].article_code, quantity: 3, unit_price: 365, cost_price: 219, line_total: 1095, sort_order: 2, vat_rate: 21, supplier_id: stosaId },
      { id: "bb000001-0000-0000-0000-000000000046", order_id: orders[7].id, section_id: "cc000001-0000-0000-0000-000000000014", product_id: demoProducts[4].id, description: demoProducts[4].name, article_code: demoProducts[4].article_code, quantity: 2, unit_price: 895, cost_price: 537, line_total: 1790, sort_order: 3, vat_rate: 21, supplier_id: stosaId },
      { id: "bb000001-0000-0000-0000-000000000047", order_id: orders[7].id, section_id: "cc000001-0000-0000-0000-000000000015", product_id: demoProducts[8].id, description: demoProducts[8].name, article_code: demoProducts[8].article_code, quantity: 1, unit_price: 1849, cost_price: 1294, line_total: 1849, sort_order: 1, vat_rate: 21, supplier_id: siemensId },
      { id: "bb000001-0000-0000-0000-000000000048", order_id: orders[7].id, section_id: "cc000001-0000-0000-0000-000000000015", product_id: demoProducts[7].id, description: demoProducts[7].name, article_code: demoProducts[7].article_code, quantity: 1, unit_price: 1299, cost_price: 909, line_total: 1299, sort_order: 2, vat_rate: 21, supplier_id: siemensId },
      { id: "bb000001-0000-0000-0000-000000000049", order_id: orders[7].id, section_id: "cc000001-0000-0000-0000-000000000015", product_id: demoProducts[9].id, description: demoProducts[9].name, article_code: demoProducts[9].article_code, quantity: 1, unit_price: 1549, cost_price: 1084, line_total: 1549, sort_order: 3, vat_rate: 21, supplier_id: siemensId },
    ];

    for (const ol of orderLines) {
      await supabase.from("order_lines").upsert(ol);
    }
    log.push(`✅ ${orderLines.length} demo order lines created`);

    // ── 11. Order Checklist Items ──
    // Delete existing first
    await supabase.from("order_checklist_items").delete().in("order_id", orderIds);

    const checklists = [
      { order_id: orders[0].id, label: "Klantgegevens gecontroleerd", checked: true, checked_at: daysAgo(6), sort_order: 1 },
      { order_id: orders[0].id, label: "Technische tekening geüpload", checked: true, checked_at: daysAgo(6), sort_order: 2 },
      { order_id: orders[0].id, label: "Maatvoering bevestigd", checked: true, checked_at: daysAgo(5), sort_order: 3 },
      { order_id: orders[0].id, label: "Aanbetaling ontvangen", checked: true, checked_at: daysAgo(5), sort_order: 4 },
      { order_id: orders[0].id, label: "Leverancier bestelling bevestigd", checked: false, sort_order: 5 },
      { order_id: orders[2].id, label: "Klantgegevens gecontroleerd", checked: false, sort_order: 1 },
      { order_id: orders[2].id, label: "Technische tekening geüpload", checked: false, sort_order: 2 },
      { order_id: orders[2].id, label: "Maatvoering bevestigd", checked: false, sort_order: 3 },
      { order_id: orders[2].id, label: "Aanbetaling ontvangen", checked: false, sort_order: 4 },
      { order_id: orders[7].id, label: "Klantgegevens gecontroleerd", checked: true, checked_at: daysAgo(3), sort_order: 1 },
      { order_id: orders[7].id, label: "Technische tekening geüpload", checked: true, checked_at: daysAgo(3), sort_order: 2 },
      { order_id: orders[7].id, label: "Maatvoering bevestigd", checked: true, checked_at: daysAgo(2), sort_order: 3 },
      { order_id: orders[7].id, label: "Aanbetaling ontvangen", checked: true, checked_at: daysAgo(2), sort_order: 4 },
      { order_id: orders[7].id, label: "Leverancier bestelling bevestigd", checked: true, checked_at: daysAgo(1), sort_order: 5 },
    ];

    for (const cl of checklists) {
      await supabase.from("order_checklist_items").insert(cl);
    }
    log.push(`✅ ${checklists.length} demo checklist items created`);

    // ── 12. Order Notes ──
    await supabase.from("order_notes").delete().in("order_id", orderIds);

    const notes = [
      { order_id: orders[0].id, content: "Klant wil graag lichte eiken fronten, corpus wit. Greep: Gola systeem.", note_type: "general" },
      { order_id: orders[0].id, content: "Aanbetaling €15.000 ontvangen op 20-02-2026.", note_type: "payment" },
      { order_id: orders[0].id, content: "Levering via achterdeur, smalle steeg – bespreek met transporteur.", note_type: "delivery" },
      { order_id: orders[2].id, content: "Klant twijfelt nog tussen Quooker Flex en Fusion. Terugbellen vrijdag.", note_type: "general" },
      { order_id: orders[4].id, content: "Montage ingepland voor vandaag. 2 monteurs nodig.", note_type: "planning" },
      { order_id: orders[5].id, content: "Levering vandaag gepland. Bellen klant 30 min van tevoren.", note_type: "delivery" },
      { order_id: orders[6].id, content: "Alle materialen geleverd. Montage morgen ingepland.", note_type: "planning" },
    ];

    for (const n of notes) {
      await supabase.from("order_notes").insert(n);
    }
    log.push(`✅ ${notes.length} demo order notes created`);

    // ── 13. Service Tickets ──
    const tickets = [
      { id: "e0000001-0000-0000-0000-000000000001", division_id: divisionId, order_id: orders[5].id, customer_id: customers[8].id, status: "nieuw", priority: "normaal", category: "schade", subject: "Kras op keukenblad na montage", description: "Klant meldt een kleine kras op het composiet werkblad, waarschijnlijk ontstaan tijdens montage.", submitter_name: "Daan Smits", submitter_email: "daan.smits@demo.nl" },
      { id: "e0000001-0000-0000-0000-000000000002", division_id: divisionId, order_id: orders[6].id, customer_id: customers[10].id, status: "in_behandeling", priority: "hoog", category: "garantie", subject: "Vaatwasser lekt na 2 weken", description: "Klant meldt waterlekkage bij de vaatwasser. Mogelijk aansluitprobleem.", submitter_name: "Wouter Bos", submitter_email: "wouter@bosprojecten.nl" },
      { id: "e0000001-0000-0000-0000-000000000003", division_id: divisionId, customer_id: customers[3].id, status: "wacht_op_onderdelen", priority: "normaal", category: "reparatie", subject: "Scharnier bovenkast scheef", description: "Het scharnier van de bovenkast boven het kookgedeelte hangt scheef. Nieuwe scharnieren besteld.", submitter_name: "Sophie van den Berg", submitter_email: "sophie.vdberg@demo.nl" },
      { id: "e0000001-0000-0000-0000-000000000004", division_id: divisionId, customer_id: customers[1].id, status: "ingepland", priority: "laag", category: "nazorg", subject: "Deurtje sluit niet goed", description: "Softclose werkt niet meer op onderkast naast de oven. Monteur inplannen.", submitter_name: "Lisa Bakker", submitter_email: "lisa.bakker@demo.nl" },
      { id: "e0000001-0000-0000-0000-000000000005", division_id: divisionId, customer_id: customers[4].id, status: "afgerond", priority: "normaal", category: "informatie", subject: "Vraag over onderhoud composiet werkblad", description: "Klant wil weten hoe het werkblad het best onderhouden kan worden.", submitter_name: "Mark Willems", submitter_email: "mark.willems@demo.nl" },
    ];

    for (const t of tickets) {
      await supabase.from("service_tickets").upsert(t);
    }
    log.push(`✅ ${tickets.length} demo service tickets created`);

    // ── 14. Communication Log ──
    const customerIds = customers.map(c => c.id);
    await supabase.from("communication_log").delete().in("customer_id", customerIds);

    const comms = [
      { customer_id: customers[0].id, order_id: orders[7].id, type: "email" as const, direction: "outbound" as const, subject: "Orderbevestiging #8008", body_preview: "Beste Jan, hierbij bevestigen wij uw order voor de nieuwe keuken...", sent_at: daysAgo(4), division_id: divisionId },
      { customer_id: customers[0].id, type: "email" as const, direction: "inbound" as const, subject: "Re: Orderbevestiging #8008", body_preview: "Bedankt! Ziet er goed uit. Wanneer kan ik de aanbetaling overmaken?", sent_at: daysAgo(3), division_id: divisionId },
      { customer_id: customers[2].id, order_id: orders[0].id, type: "email" as const, direction: "outbound" as const, subject: "Leveringsstatus update", body_preview: "Beste Pieter, uw keuken is in productie en wordt verwacht over 2 weken...", sent_at: daysAgo(3), division_id: divisionId },
      { customer_id: customers[5].id, type: "whatsapp" as const, direction: "inbound" as const, subject: null, body_preview: "Hoi, ik heb de offerte bekeken. Kunnen we de Quooker nog toevoegen?", sent_at: daysAgo(1), division_id: divisionId },
      { customer_id: customers[5].id, type: "whatsapp" as const, direction: "outbound" as const, subject: null, body_preview: "Hoi Eva, dat kan zeker! Ik stuur een aangepaste offerte.", sent_at: daysAgo(1), division_id: divisionId },
      { customer_id: customers[7].id, order_id: orders[2].id, type: "email" as const, direction: "outbound" as const, subject: "Aanbetalingsfactuur order #8003", body_preview: "Beste Anna, in de bijlage vindt u de aanbetalingsfactuur van €5.000...", sent_at: daysAgo(1), division_id: divisionId },
      { customer_id: customers[9].id, order_id: orders[1].id, type: "whatsapp" as const, direction: "outbound" as const, subject: null, body_preview: "Goedemorgen Fleur! Uw keuken is in productie en loopt op schema 👍", sent_at: daysAgo(2), division_id: divisionId },
      { customer_id: customers[10].id, type: "phone" as const, direction: "inbound" as const, subject: "Telefoongesprek lekkage", body_preview: "Klant belt over lekkage bij vaatwasser. Serviceticket aangemaakt.", sent_at: daysAgo(4), division_id: divisionId },
      { customer_id: customers[3].id, type: "email" as const, direction: "outbound" as const, subject: "Offerte bekeken?", body_preview: "Beste Sophie, we zagen dat u de offerte heeft bekeken. Heeft u nog vragen?", sent_at: daysAgo(1), division_id: divisionId },
      { customer_id: customers[6].id, order_id: orders[4].id, type: "email" as const, direction: "outbound" as const, subject: "Montage bevestiging", body_preview: "Beste Thomas, de montage van uw keuken staat gepland voor vandaag...", sent_at: daysAgo(2), division_id: divisionId },
    ];

    for (const c of comms) {
      await supabase.from("communication_log").insert(c);
    }
    log.push(`✅ ${comms.length} demo communication logs created`);

    // ── 15. Order Documents ──
    await supabase.from("order_documents").delete().in("order_id", orderIds);

    const docs = [
      { order_id: orders[0].id, document_type: "technische_tekening", title: "Keuken Jansen - Plattegrond", file_name: "jansen_plattegrond.pdf", visible_to_customer: true, visible_to_installer: true },
      { order_id: orders[0].id, document_type: "offerte", title: "Offerte Jansen Bouw", file_name: "offerte_jansen.pdf", visible_to_customer: true, visible_to_installer: false },
      { order_id: orders[4].id, document_type: "technische_tekening", title: "Keuken Mulder - 3D ontwerp", file_name: "mulder_3d.pdf", visible_to_customer: true, visible_to_installer: true },
      { order_id: orders[4].id, document_type: "montage_instructie", title: "Montage-instructies Stosa", file_name: "montage_stosa.pdf", visible_to_customer: false, visible_to_installer: true },
      { order_id: orders[7].id, document_type: "offerte", title: "Offerte de Vries", file_name: "offerte_devries.pdf", visible_to_customer: true, visible_to_installer: false },
    ];

    for (const d of docs) {
      await supabase.from("order_documents").insert(d);
    }
    log.push(`✅ ${docs.length} demo order documents created`);

    // ── 16. Order Status History ──
    await supabase.from("order_status_history").delete().in("order_id", orderIds);

    const statusHistory = [
      { order_id: orders[0].id, from_status: null, to_status: "nieuw" as const, created_at: daysAgo(7) },
      { order_id: orders[0].id, from_status: "nieuw" as const, to_status: "bestel_klaar" as const, created_at: daysAgo(6) },
      { order_id: orders[0].id, from_status: "bestel_klaar" as const, to_status: "controle" as const, created_at: daysAgo(6) },
      { order_id: orders[0].id, from_status: "controle" as const, to_status: "besteld" as const, created_at: daysAgo(5) },
      { order_id: orders[1].id, from_status: null, to_status: "nieuw" as const, created_at: daysAgo(12) },
      { order_id: orders[1].id, from_status: "nieuw" as const, to_status: "besteld" as const, created_at: daysAgo(10) },
      { order_id: orders[1].id, from_status: "besteld" as const, to_status: "in_productie" as const, created_at: daysAgo(8) },
      { order_id: orders[3].id, from_status: null, to_status: "nieuw" as const, created_at: daysAgo(30) },
      { order_id: orders[3].id, from_status: "nieuw" as const, to_status: "besteld" as const, created_at: daysAgo(28) },
      { order_id: orders[3].id, from_status: "besteld" as const, to_status: "levering_gepland" as const, created_at: daysAgo(5) },
      { order_id: orders[4].id, from_status: null, to_status: "nieuw" as const, created_at: daysAgo(45) },
      { order_id: orders[4].id, from_status: "nieuw" as const, to_status: "besteld" as const, created_at: daysAgo(40) },
      { order_id: orders[4].id, from_status: "besteld" as const, to_status: "geleverd" as const, created_at: daysAgo(3) },
      { order_id: orders[4].id, from_status: "geleverd" as const, to_status: "montage_gepland" as const, created_at: daysAgo(2) },
      { order_id: orders[5].id, from_status: null, to_status: "nieuw" as const, created_at: daysAgo(25) },
      { order_id: orders[5].id, from_status: "nieuw" as const, to_status: "besteld" as const, created_at: daysAgo(22) },
      { order_id: orders[5].id, from_status: "besteld" as const, to_status: "levering_gepland" as const, created_at: daysAgo(3) },
      { order_id: orders[6].id, from_status: null, to_status: "nieuw" as const, created_at: daysAgo(50) },
      { order_id: orders[6].id, from_status: "nieuw" as const, to_status: "besteld" as const, created_at: daysAgo(45) },
      { order_id: orders[6].id, from_status: "besteld" as const, to_status: "geleverd" as const, created_at: daysAgo(5) },
      { order_id: orders[6].id, from_status: "geleverd" as const, to_status: "montage_gepland" as const, created_at: daysAgo(3) },
    ];

    for (const sh of statusHistory) {
      await supabase.from("order_status_history").insert(sh);
    }
    log.push(`✅ ${statusHistory.length} demo status history entries created`);

    return new Response(JSON.stringify({ success: true, log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
