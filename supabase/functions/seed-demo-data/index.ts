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

    // ── 1. Demo Division ──
    const divisionId = "33333333-3333-3333-3333-333333333333";
    await supabase.from("divisions").upsert({
      id: divisionId,
      name: "Demo Showroom",
      code: "DEMO",
      address: "Keizersgracht 100",
      postal_code: "1015 AA",
      city: "Amsterdam",
      email: "demo@abitare.nl",
      phone: "020-1234567",
      is_active: true,
    });
    log.push("✅ Demo division created");

    // ── 2. Suppliers (use existing) ──
    const stosaId = "29a8e1aa-35da-4784-99ff-23129f36fe22";
    const mieleId = "93406e17-477d-4f16-af77-1bbb35dfd45e";
    const siemensId = "c5669d28-f277-4043-a3fb-c2c593b0be63";
    const blancoId = "8c744bd2-fbeb-4487-842c-6313a56acdd2";
    const quookerId = "91bded38-8213-4bf9-9493-5dd52997839b";
    const boschId = "e70c4a1a-b3e1-460b-86b6-be9644eaaf56";

    // ── 3. Demo Products with prices ──
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

    // ── 5. Demo Quotes ──
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

    const quotes = [
      { id: "a0000001-0000-0000-0000-000000000001", customer_id: customers[0].id, division_id: divisionId, status: "concept", quote_number: 9001, reference: "de Vries - Keuken - 2026-001", subtotal: 12500, total_excl_vat: 12500, total_vat: 2625, total_incl_vat: 15125, created_at: daysAgo(2) },
      { id: "a0000001-0000-0000-0000-000000000002", customer_id: customers[1].id, division_id: divisionId, status: "verstuurd", quote_number: 9002, reference: "Bakker - Keuken - 2026-001", subtotal: 18750, total_excl_vat: 18750, total_vat: 3937.50, total_incl_vat: 22687.50, created_at: daysAgo(5), sent_at: daysAgo(4) },
      { id: "a0000001-0000-0000-0000-000000000003", customer_id: customers[2].id, division_id: divisionId, status: "geaccepteerd", quote_number: 9003, reference: "Jansen Bouw - Keuken - 2026-001", subtotal: 32500, total_excl_vat: 32500, total_vat: 6825, total_incl_vat: 39325, created_at: daysAgo(14), sent_at: daysAgo(13), accepted_at: daysAgo(7) },
      { id: "a0000001-0000-0000-0000-000000000004", customer_id: customers[3].id, division_id: divisionId, status: "bekeken", quote_number: 9004, reference: "van den Berg - Keuken - 2026-001", subtotal: 15800, total_excl_vat: 15800, total_vat: 3318, total_incl_vat: 19118, created_at: daysAgo(3), sent_at: daysAgo(2) },
      { id: "a0000001-0000-0000-0000-000000000005", customer_id: customers[4].id, division_id: divisionId, status: "vervallen", quote_number: 9005, reference: "Willems - Keuken - 2026-001", subtotal: 9200, total_excl_vat: 9200, total_vat: 1932, total_incl_vat: 11132, created_at: daysAgo(45), sent_at: daysAgo(44) },
      { id: "a0000001-0000-0000-0000-000000000006", customer_id: customers[5].id, division_id: divisionId, status: "verstuurd", quote_number: 9006, reference: "Hendriks - Keuken - 2026-001", subtotal: 21300, total_excl_vat: 21300, total_vat: 4473, total_incl_vat: 25773, created_at: daysAgo(1), sent_at: daysAgo(0) },
      { id: "a0000001-0000-0000-0000-000000000007", customer_id: customers[9].id, division_id: divisionId, status: "geaccepteerd", quote_number: 9007, reference: "de Groot - Keuken - 2026-001", subtotal: 28900, total_excl_vat: 28900, total_vat: 6069, total_incl_vat: 34969, created_at: daysAgo(20), sent_at: daysAgo(19), accepted_at: daysAgo(12) },
      { id: "a0000001-0000-0000-0000-000000000008", customer_id: customers[11].id, division_id: divisionId, status: "concept", quote_number: 9008, reference: "Meijer - Keuken - 2026-001", subtotal: 16400, total_excl_vat: 16400, total_vat: 3444, total_incl_vat: 19844, created_at: daysAgo(0) },
    ];

    for (const q of quotes) {
      await supabase.from("quotes").upsert(q);
    }
    log.push(`✅ ${quotes.length} demo quotes created`);

    // ── 6. Quote Sections & Lines ──
    const quoteSections = [
      { id: "b5000001-0000-0000-0000-000000000001", quote_id: quotes[0].id, title: "Keukenkasten Stosa", section_type: "keuken", sort_order: 1, range_id: null, supplier_id: stosaId },
      { id: "b5000001-0000-0000-0000-000000000002", quote_id: quotes[0].id, title: "Apparatuur", section_type: "apparatuur", sort_order: 2, range_id: null, supplier_id: siemensId },
      { id: "b5000001-0000-0000-0000-000000000003", quote_id: quotes[1].id, title: "Keukenkasten Stosa", section_type: "keuken", sort_order: 1, range_id: null, supplier_id: stosaId },
      { id: "b5000001-0000-0000-0000-000000000004", quote_id: quotes[1].id, title: "Apparatuur Miele", section_type: "apparatuur", sort_order: 2, range_id: null, supplier_id: mieleId },
      { id: "b5000001-0000-0000-0000-000000000005", quote_id: quotes[2].id, title: "Keukenkasten Stosa", section_type: "keuken", sort_order: 1, range_id: null, supplier_id: stosaId },
      { id: "b5000001-0000-0000-0000-000000000006", quote_id: quotes[2].id, title: "Apparatuur", section_type: "apparatuur", sort_order: 2, range_id: null, supplier_id: mieleId },
      { id: "b5000001-0000-0000-0000-000000000007", quote_id: quotes[2].id, title: "Werkblad & Spoelbak", section_type: "werkblad", sort_order: 3, range_id: null, supplier_id: blancoId },
    ];

    for (const qs of quoteSections) {
      await supabase.from("quote_sections").upsert(qs);
    }

    const quoteLines = [
      // Quote 1 lines
      { quote_id: quotes[0].id, section_id: quoteSections[0].id, product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 4, unit_price: 485, line_total: 1940, sort_order: 1, vat_rate: 21 },
      { quote_id: quotes[0].id, section_id: quoteSections[0].id, product_id: demoProducts[1].id, description: demoProducts[1].name, article_code: demoProducts[1].article_code, quantity: 2, unit_price: 625, line_total: 1250, sort_order: 2, vat_rate: 21 },
      { quote_id: quotes[0].id, section_id: quoteSections[0].id, product_id: demoProducts[2].id, description: demoProducts[2].name, article_code: demoProducts[2].article_code, quantity: 3, unit_price: 365, line_total: 1095, sort_order: 3, vat_rate: 21 },
      { quote_id: quotes[0].id, section_id: quoteSections[0].id, product_id: demoProducts[4].id, description: demoProducts[4].name, article_code: demoProducts[4].article_code, quantity: 2, unit_price: 895, line_total: 1790, sort_order: 4, vat_rate: 21 },
      { quote_id: quotes[0].id, section_id: quoteSections[1].id, product_id: demoProducts[8].id, description: demoProducts[8].name, article_code: demoProducts[8].article_code, quantity: 1, unit_price: 1849, line_total: 1849, sort_order: 1, vat_rate: 21 },
      { quote_id: quotes[0].id, section_id: quoteSections[1].id, product_id: demoProducts[7].id, description: demoProducts[7].name, article_code: demoProducts[7].article_code, quantity: 1, unit_price: 1299, line_total: 1299, sort_order: 2, vat_rate: 21 },
      { quote_id: quotes[0].id, section_id: quoteSections[1].id, product_id: demoProducts[9].id, description: demoProducts[9].name, article_code: demoProducts[9].article_code, quantity: 1, unit_price: 1549, line_total: 1549, sort_order: 3, vat_rate: 21 },
      // Quote 2 lines
      { quote_id: quotes[1].id, section_id: quoteSections[2].id, product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 5, unit_price: 485, line_total: 2425, sort_order: 1, vat_rate: 21 },
      { quote_id: quotes[1].id, section_id: quoteSections[2].id, product_id: demoProducts[1].id, description: demoProducts[1].name, article_code: demoProducts[1].article_code, quantity: 3, unit_price: 625, line_total: 1875, sort_order: 2, vat_rate: 21 },
      { quote_id: quotes[1].id, section_id: quoteSections[2].id, product_id: demoProducts[5].id, description: demoProducts[5].name, article_code: demoProducts[5].article_code, quantity: 1, unit_price: 785, line_total: 785, sort_order: 3, vat_rate: 21 },
      { quote_id: quotes[1].id, section_id: quoteSections[3].id, product_id: demoProducts[6].id, description: demoProducts[6].name, article_code: demoProducts[6].article_code, quantity: 1, unit_price: 2499, line_total: 2499, sort_order: 1, vat_rate: 21 },
      { quote_id: quotes[1].id, section_id: quoteSections[3].id, product_id: demoProducts[17].id, description: demoProducts[17].name, article_code: demoProducts[17].article_code, quantity: 1, unit_price: 4199, line_total: 4199, sort_order: 2, vat_rate: 21 },
      { quote_id: quotes[1].id, section_id: quoteSections[3].id, product_id: demoProducts[16].id, description: demoProducts[16].name, article_code: demoProducts[16].article_code, quantity: 1, unit_price: 3299, line_total: 3299, sort_order: 3, vat_rate: 21 },
      // Quote 3 lines (big project)
      { quote_id: quotes[2].id, section_id: quoteSections[4].id, product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 8, unit_price: 485, line_total: 3880, sort_order: 1, vat_rate: 21 },
      { quote_id: quotes[2].id, section_id: quoteSections[4].id, product_id: demoProducts[1].id, description: demoProducts[1].name, article_code: demoProducts[1].article_code, quantity: 4, unit_price: 625, line_total: 2500, sort_order: 2, vat_rate: 21 },
      { quote_id: quotes[2].id, section_id: quoteSections[4].id, product_id: demoProducts[3].id, description: demoProducts[3].name, article_code: demoProducts[3].article_code, quantity: 4, unit_price: 475, line_total: 1900, sort_order: 3, vat_rate: 21 },
      { quote_id: quotes[2].id, section_id: quoteSections[4].id, product_id: demoProducts[4].id, description: demoProducts[4].name, article_code: demoProducts[4].article_code, quantity: 3, unit_price: 895, line_total: 2685, sort_order: 4, vat_rate: 21 },
      { quote_id: quotes[2].id, section_id: quoteSections[5].id, product_id: demoProducts[6].id, description: demoProducts[6].name, article_code: demoProducts[6].article_code, quantity: 1, unit_price: 2499, line_total: 2499, sort_order: 1, vat_rate: 21 },
      { quote_id: quotes[2].id, section_id: quoteSections[5].id, product_id: demoProducts[17].id, description: demoProducts[17].name, article_code: demoProducts[17].article_code, quantity: 1, unit_price: 4199, line_total: 4199, sort_order: 2, vat_rate: 21 },
      { quote_id: quotes[2].id, section_id: quoteSections[6].id, product_id: demoProducts[13].id, description: demoProducts[13].name, article_code: demoProducts[13].article_code, quantity: 1, unit_price: 1250, line_total: 1250, sort_order: 1, vat_rate: 21 },
      { quote_id: quotes[2].id, section_id: quoteSections[6].id, product_id: demoProducts[12].id, description: demoProducts[12].name, article_code: demoProducts[12].article_code, quantity: 1, unit_price: 589, line_total: 589, sort_order: 2, vat_rate: 21 },
    ];

    for (const ql of quoteLines) {
      await supabase.from("quote_lines").upsert(ql, { ignoreDuplicates: true });
    }
    log.push(`✅ ${quoteLines.length} demo quote lines created`);

    // ── 7. Demo Orders (various statuses) ──
    // Using valid hex UUIDs (no 'o' prefix)
    const orders = [
      { id: "f0000001-0000-0000-0000-000000000001", customer_id: customers[2].id, division_id: divisionId, quote_id: quotes[2].id, status: "besteld" as const, order_number: 8001, order_date: daysAgo(7), total_excl_vat: 32500, total_incl_vat: 39325, total_vat: 6825, total_cost_price: 19500, payment_status: "deels_betaald" as const, amount_paid: 15000, deposit_required: true, deposit_invoice_sent: true, installation_street_address: "Markt 12", installation_postal_code: "6211 CK", installation_city: "Maastricht", delivery_street_address: "Bonnefantenstraat 8", delivery_postal_code: "6211 KL", delivery_city: "Maastricht", expected_delivery_date: daysAgo(-14), expected_installation_date: daysAgo(-21), forecast_week: "2026-12" },
      { id: "f0000001-0000-0000-0000-000000000002", customer_id: customers[9].id, division_id: divisionId, quote_id: quotes[6].id, status: "in_productie" as const, order_number: 8002, order_date: daysAgo(12), total_excl_vat: 28900, total_incl_vat: 34969, total_vat: 6069, total_cost_price: 17340, payment_status: "betaald" as const, amount_paid: 34969, deposit_required: true, deposit_invoice_sent: true, installation_street_address: "Herengracht 450", installation_postal_code: "1017 CA", installation_city: "Amsterdam", expected_delivery_date: daysAgo(-7), expected_installation_date: daysAgo(-10), forecast_week: "2026-11" },
      { id: "f0000001-0000-0000-0000-000000000003", customer_id: customers[7].id, division_id: divisionId, status: "nieuw" as const, order_number: 8003, order_date: daysAgo(1), total_excl_vat: 14200, total_incl_vat: 17182, total_vat: 2982, total_cost_price: 8520, payment_status: "open" as const, amount_paid: 0, deposit_required: true, deposit_invoice_sent: false, installation_street_address: "Vrijthof 18", installation_postal_code: "6211 LD", installation_city: "Maastricht", forecast_week: "2026-14" },
      { id: "f0000001-0000-0000-0000-000000000004", customer_id: customers[5].id, division_id: divisionId, status: "levering_gepland" as const, order_number: 8004, order_date: daysAgo(30), total_excl_vat: 21300, total_incl_vat: 25773, total_vat: 4473, total_cost_price: 12780, payment_status: "betaald" as const, amount_paid: 25773, deposit_required: true, deposit_invoice_sent: true, installation_street_address: "Coolsingel 40", installation_postal_code: "3011 AD", installation_city: "Rotterdam", expected_delivery_date: daysAgo(-2), expected_installation_date: daysAgo(-5), forecast_week: "2026-10" },
      { id: "f0000001-0000-0000-0000-000000000005", customer_id: customers[6].id, division_id: divisionId, status: "montage_gepland" as const, order_number: 8005, order_date: daysAgo(45), total_excl_vat: 26800, total_incl_vat: 32428, total_vat: 5628, total_cost_price: 16080, payment_status: "betaald" as const, amount_paid: 32428, deposit_required: true, deposit_invoice_sent: true, installation_street_address: "Maliebaan 22", installation_postal_code: "3581 CN", installation_city: "Utrecht", actual_delivery_date: daysAgo(3), expected_installation_date: daysAgo(-1), forecast_week: "2026-09" },
      { id: "f0000001-0000-0000-0000-000000000006", customer_id: customers[8].id, division_id: divisionId, status: "gemonteerd" as const, order_number: 8006, order_date: daysAgo(60), total_excl_vat: 19500, total_incl_vat: 23595, total_vat: 4095, total_cost_price: 11700, payment_status: "betaald" as const, amount_paid: 23595, deposit_required: true, deposit_invoice_sent: true, installation_street_address: "Lange Voorhout 8", installation_postal_code: "2514 ED", installation_city: "Den Haag", actual_delivery_date: daysAgo(10), actual_installation_date: daysAgo(5), forecast_week: "2026-06" },
      { id: "f0000001-0000-0000-0000-000000000007", customer_id: customers[10].id, division_id: divisionId, status: "afgerond" as const, order_number: 8007, order_date: daysAgo(90), total_excl_vat: 35200, total_incl_vat: 42592, total_vat: 7392, total_cost_price: 21120, payment_status: "betaald" as const, amount_paid: 42592, deposit_required: true, deposit_invoice_sent: true, installation_street_address: "Westersingel 12", installation_postal_code: "3014 GN", installation_city: "Rotterdam", actual_delivery_date: daysAgo(30), actual_installation_date: daysAgo(25), forecast_week: "2026-03" },
      { id: "f0000001-0000-0000-0000-000000000008", customer_id: customers[0].id, division_id: divisionId, status: "bestel_klaar" as const, order_number: 8008, order_date: daysAgo(4), total_excl_vat: 12500, total_incl_vat: 15125, total_vat: 2625, total_cost_price: 7500, payment_status: "deels_betaald" as const, amount_paid: 5000, deposit_required: true, deposit_invoice_sent: true, installation_street_address: "Prinsengracht 263", installation_postal_code: "1016 GV", installation_city: "Amsterdam", forecast_week: "2026-13" },
    ];

    for (const o of orders) {
      await supabase.from("orders").upsert(o);
    }
    log.push(`✅ ${orders.length} demo orders created`);

    // ── 8. Order Lines ──
    const orderLines = [
      { order_id: orders[0].id, product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 8, unit_price: 485, cost_price: 290, line_total: 3880, sort_order: 1, vat_rate: 21, supplier_id: stosaId, is_ordered: true, ordered_at: daysAgo(5) },
      { order_id: orders[0].id, product_id: demoProducts[1].id, description: demoProducts[1].name, article_code: demoProducts[1].article_code, quantity: 4, unit_price: 625, cost_price: 375, line_total: 2500, sort_order: 2, vat_rate: 21, supplier_id: stosaId, is_ordered: true, ordered_at: daysAgo(5) },
      { order_id: orders[0].id, product_id: demoProducts[6].id, description: demoProducts[6].name, article_code: demoProducts[6].article_code, quantity: 1, unit_price: 2499, cost_price: 1749, line_total: 2499, sort_order: 3, vat_rate: 21, supplier_id: mieleId, is_ordered: true, ordered_at: daysAgo(5) },
      { order_id: orders[0].id, product_id: demoProducts[7].id, description: demoProducts[7].name, article_code: demoProducts[7].article_code, quantity: 1, unit_price: 1299, cost_price: 909, line_total: 1299, sort_order: 4, vat_rate: 21, supplier_id: siemensId, is_ordered: false },
      { order_id: orders[0].id, product_id: demoProducts[13].id, description: demoProducts[13].name, article_code: demoProducts[13].article_code, quantity: 1, unit_price: 1250, cost_price: 750, line_total: 1250, sort_order: 5, vat_rate: 21, supplier_id: stosaId },
      { order_id: orders[2].id, product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 4, unit_price: 485, cost_price: 290, line_total: 1940, sort_order: 1, vat_rate: 21, supplier_id: stosaId },
      { order_id: orders[2].id, product_id: demoProducts[8].id, description: demoProducts[8].name, article_code: demoProducts[8].article_code, quantity: 1, unit_price: 1849, cost_price: 1294, line_total: 1849, sort_order: 2, vat_rate: 21, supplier_id: siemensId },
      { order_id: orders[2].id, product_id: demoProducts[11].id, description: demoProducts[11].name, article_code: demoProducts[11].article_code, quantity: 1, unit_price: 1795, cost_price: 1256, line_total: 1795, sort_order: 3, vat_rate: 21, supplier_id: quookerId },
      { order_id: orders[4].id, product_id: demoProducts[0].id, description: demoProducts[0].name, article_code: demoProducts[0].article_code, quantity: 6, unit_price: 485, cost_price: 290, line_total: 2910, sort_order: 1, vat_rate: 21, supplier_id: stosaId, is_ordered: true, is_delivered: true, delivered_at: daysAgo(3) },
      { order_id: orders[4].id, product_id: demoProducts[14].id, description: demoProducts[14].name, article_code: demoProducts[14].article_code, quantity: 3, unit_price: 450, cost_price: 280, line_total: 1350, sort_order: 2, vat_rate: 21, supplier_id: stosaId },
      { order_id: orders[4].id, product_id: demoProducts[15].id, description: demoProducts[15].name, article_code: demoProducts[15].article_code, quantity: 1, unit_price: 295, cost_price: 195, line_total: 295, sort_order: 3, vat_rate: 21, supplier_id: stosaId },
    ];

    for (const ol of orderLines) {
      await supabase.from("order_lines").upsert(ol, { ignoreDuplicates: true });
    }
    log.push(`✅ ${orderLines.length} demo order lines created`);

    // ── 9. Order Checklist Items ──
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

    // ── 10. Order Notes ──
    const notes = [
      { order_id: orders[0].id, content: "Klant wil graag lichte eiken fronten, corpus wit. Greep: Gola systeem.", note_type: "general" },
      { order_id: orders[0].id, content: "Aanbetaling €15.000 ontvangen op 20-02-2026.", note_type: "payment" },
      { order_id: orders[0].id, content: "Levering via achterdeur, smalle steeg – bespreek met transporteur.", note_type: "delivery" },
      { order_id: orders[2].id, content: "Klant twijfelt nog tussen Quooker Flex en Fusion. Terugbellen vrijdag.", note_type: "general" },
      { order_id: orders[4].id, content: "Montage ingepland voor maandag 10 maart. 2 monteurs nodig.", note_type: "planning" },
      { order_id: orders[5].id, content: "Montage succesvol afgerond. Kleine kras op zijpaneel, klant akkoord.", note_type: "general" },
      { order_id: orders[6].id, content: "Project volledig afgerond en gefactureerd. Klant zeer tevreden.", note_type: "general" },
    ];

    for (const n of notes) {
      await supabase.from("order_notes").insert(n);
    }
    log.push(`✅ ${notes.length} demo order notes created`);

    // ── 11. Service Tickets ──
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

    // ── 12. Communication Log ──
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
      { customer_id: customers[6].id, order_id: orders[4].id, type: "email" as const, direction: "outbound" as const, subject: "Montage bevestiging", body_preview: "Beste Thomas, de montage van uw keuken staat gepland voor aanstaande maandag...", sent_at: daysAgo(2), division_id: divisionId },
    ];

    for (const c of comms) {
      await supabase.from("communication_log").insert(c);
    }
    log.push(`✅ ${comms.length} demo communication logs created`);

    // ── 13. Order Documents (metadata, no actual files) ──
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

    // ── 14. Order Status History ──
    const statusHistory = [
      { order_id: orders[0].id, from_status: null, to_status: "nieuw" as const, created_at: daysAgo(7) },
      { order_id: orders[0].id, from_status: "nieuw" as const, to_status: "bestel_klaar" as const, created_at: daysAgo(6) },
      { order_id: orders[0].id, from_status: "bestel_klaar" as const, to_status: "controle" as const, created_at: daysAgo(6) },
      { order_id: orders[0].id, from_status: "controle" as const, to_status: "besteld" as const, created_at: daysAgo(5) },
      { order_id: orders[1].id, from_status: null, to_status: "nieuw" as const, created_at: daysAgo(12) },
      { order_id: orders[1].id, from_status: "nieuw" as const, to_status: "besteld" as const, created_at: daysAgo(10) },
      { order_id: orders[1].id, from_status: "besteld" as const, to_status: "in_productie" as const, created_at: daysAgo(8) },
      { order_id: orders[6].id, from_status: null, to_status: "nieuw" as const, created_at: daysAgo(90) },
      { order_id: orders[6].id, from_status: "nieuw" as const, to_status: "besteld" as const, created_at: daysAgo(85) },
      { order_id: orders[6].id, from_status: "besteld" as const, to_status: "geleverd" as const, created_at: daysAgo(30) },
      { order_id: orders[6].id, from_status: "geleverd" as const, to_status: "gemonteerd" as const, created_at: daysAgo(25) },
      { order_id: orders[6].id, from_status: "gemonteerd" as const, to_status: "afgerond" as const, created_at: daysAgo(20) },
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
