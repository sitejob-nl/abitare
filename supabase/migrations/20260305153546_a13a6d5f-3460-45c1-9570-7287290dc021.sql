
-- ============================================================
-- Import 68 cabinet products + 884 product_prices + Art collection
-- ============================================================

-- Temp table for cabinet data
CREATE TEMP TABLE _cab (
  ac text, w int, cat text, descr text,
  e1 numeric, e2 numeric, e3 numeric, e4 numeric, e5 numeric,
  e6 numeric, e7 numeric, e8 numeric, e9 numeric, e10 numeric,
  pa numeric, pb numeric, pc numeric
);

INSERT INTO _cab VALUES
('BT15H00',15,'OK','Base unit 1 deur, 2 legplanken',118,121,126,130,136,141,155,158,174,194,170,174,178),
('BT30H00',30,'OK','Base unit 1 deur, 2 legplanken',121,124,143,146,160,167,191,197,220,239,182,217,233),
('BT40H00',40,'OK','Base unit 1 deur, 2 legplanken',139,144,170,174,192,194,225,238,258,278,226,255,271),
('BT45H00',45,'OK','Base unit 1 deur, 2 legplanken',145,152,177,182,195,197,235,250,263,299,245,257,276),
('BT50H00',50,'OK','Base unit 1 deur, 2 legplanken',192,206,239,249,259,261,301,325,340,397,318,323,333),
('BT60H00',60,'OK','Base unit 1 deur, 2 legplanken',168,180,198,209,218,235,279,292,319,378,300,305,323),
('BT75H01',75,'OK','Base unit 1 deur, 2 legplanken',209,225,269,284,298,300,353,385,408,473,423,437,450),
('BT60H01',60,'OK','Base unit 2 deuren, 2 legplanken',226,232,270,278,316,320,365,379,424,462,342,360,377),
('BT80H00',80,'OK','Base unit 2 deuren, 2 legplanken',233,243,282,292,327,331,405,431,471,511,403,423,448),
('BT90H00',90,'OK','Base unit 2 deuren, 2 legplanken',245,258,298,306,333,348,417,444,480,551,431,452,491),
('BT1DH00',100,'OK','Base unit 2 deuren, 2 legplanken',306,335,400,420,440,445,525,573,601,716,558,569,588),
('BT12H00',120,'OK','Base unit 2 deuren, 2 legplanken',306,328,367,389,417,460,533,565,628,747,565,600,636),
('BE45H00',45,'OK','Base 2 uittrekladen',306,313,338,342,402,408,418,424,454,480,420,427,439),
('BE50H00',50,'OK','Base 2 uittrekladen',330,345,380,383,429,435,461,467,505,551,452,467,486),
('BE60H00',60,'OK','Base 2 uittrekladen',330,340,377,380,432,436,472,485,524,551,473,491,514),
('BE75H00',75,'OK','Base 2 uittrekladen',367,381,407,427,457,469,521,581,599,623,596,613,634),
('BE80H00',80,'OK','Base 2 uittrekladen',381,395,454,461,496,500,566,595,620,694,593,642,696),
('BE90H00',90,'OK','Base 2 uittrekladen',386,399,460,468,502,507,573,600,642,703,596,613,634),
('BE1DH00',100,'OK','Base 2 uittrekladen',498,520,562,591,618,642,694,728,783,865,741,780,818),
('BE10H00',105,'OK','Base 2 uittrekladen',494,514,554,584,615,639,690,725,796,867,781,812,849),
('BE12H00',120,'OK','Base 2 uittrekladen',533,555,623,638,671,678,735,779,868,982,781,812,849),
('BE45H02',45,'OK','Base 2 uittrekladen + 1 interne lade',399,406,431,435,494,501,513,517,547,574,507,513,520),
('BE50H01',50,'OK','Base 2 uittrekladen + 1 interne lade',407,422,457,460,506,512,539,544,582,628,529,544,563),
('BE60H03',60,'OK','Base 2 uittrekladen + 1 interne lade',416,427,463,465,519,522,559,570,610,637,553,568,585),
('BE75H02',75,'OK','Base 2 uittrekladen + 1 interne lade',480,492,520,540,570,581,635,694,700,736,690,740,793),
('BE80H01',80,'OK','Base 2 uittrekladen + 1 interne lade',484,498,557,564,599,602,669,698,722,797,696,745,799),
('BE90H05',90,'OK','Base 2 uittrekladen + 1 interne lade',497,510,571,579,613,619,685,710,752,815,710,756,809),
('BE1DH01',100,'OK','Base 2 uittrekladen + 1 interne lade',635,658,700,728,755,780,831,865,920,1002,879,917,955),
('BE10H03',105,'OK','Base 2 uittrekladen + 1 interne lade',640,661,700,732,760,785,837,871,943,1014,896,940,983),
('BE12H03',120,'OK','Base 2 uittrekladen + 1 interne lade',654,677,745,760,793,800,856,882,989,1105,974,1020,1069),
('BF45H00',45,'OK','Base 2 lades + 1 uittreklade',359,366,395,403,466,473,490,496,542,593,541,553,572),
('BF50H00',50,'OK','Base 2 lades + 1 uittreklade',387,404,439,442,500,506,533,551,600,646,559,574,595),
('BF60H00',60,'OK','Base 2 lades + 1 uittreklade',386,396,433,436,500,507,542,558,608,644,577,596,625),
('BF75H00',75,'OK','Base 2 lades + 1 uittreklade',435,447,471,490,536,550,596,653,672,716,674,697,730),
('BF80H00',80,'OK','Base 2 lades + 1 uittreklade',453,463,520,527,579,588,642,670,709,792,679,734,795),
('BF90H00',90,'OK','Base 2 lades + 1 uittreklade',448,458,516,521,577,585,643,665,721,791,674,697,730),
('BF1DH01',100,'OK','Base 2 lades + 1 uittreklade',540,558,601,621,686,712,760,799,849,938,782,828,880),
('BF10H00',105,'OK','Base 2 lades + 1 uittreklade',534,548,590,614,678,703,753,802,860,934,788,876,931),
('BF12H00',120,'OK','Base 2 lades + 1 uittreklade',560,576,649,661,726,734,801,827,915,1034,788,876,962),
('FE90H00',90,'OK','Base 2 uittrekladen tbv kookplaat',397,411,471,479,513,519,584,611,655,717,605,624,647),
('FE1DH00',100,'OK','Base 2 uittrekladen tbv kookplaat',498,520,562,591,618,642,694,728,783,865,741,780,818),
('FE10H00',105,'OK','Base 2 uittrekladen tbv kookplaat',503,524,562,595,623,648,700,734,806,877,759,802,846),
('FE12H00',120,'OK','Base 2 uittrekladen tbv kookplaat',517,540,608,623,656,663,719,745,852,968,804,850,900),
('LT60H01',60,'SB','Spoelkast 2 deuren',237,242,280,288,326,330,376,389,435,473,353,370,387),
('LT80H00',80,'SB','Spoelkast 2 deuren',220,231,282,291,326,330,392,418,458,498,384,405,429),
('LT90H01',90,'SB','Spoelkast 2 deuren',226,239,290,299,325,329,405,435,461,533,424,445,477),
('LT1DH00',100,'SB','Spoelkast 2 deuren',312,340,405,426,445,451,531,579,607,721,563,575,594),
('LT12H00',120,'SB','Spoelkast 2 deuren',279,301,367,389,407,411,511,555,579,698,537,550,574),
('LE60H04',60,'SB','Spoelkast 2 uittrekladen',327,339,375,377,430,434,470,481,521,548,464,480,497),
('LE80H00',80,'SB','Spoelkast 2 uittrekladen',378,391,450,458,492,496,562,591,616,690,589,639,692),
('LE90H06',90,'SB','Spoelkast 2 uittrekladen',384,398,459,466,500,506,573,598,640,702,598,643,697),
('LE1DH00',100,'SB','Spoelkast 2 uittrekladen',454,477,519,547,574,599,650,684,740,821,698,736,774),
('LE12H05',120,'SB','Spoelkast 2 uittrekladen',469,492,560,576,608,616,671,698,804,920,757,802,852),
('Z000033',45,'SB','Zwevende spoelkast 1 deur',150,155,169,172,180,198,216,225,256,284,228,238,250),
('Z000034',60,'SB','Zwevende spoelkast 1 deur',168,176,189,195,205,216,247,259,292,323,272,294,335),
('Z000035',80,'SB','Zwevende spoelkast 2 deuren',211,222,245,255,272,308,339,360,407,474,350,369,388),
('Z000036',90,'SB','Zwevende spoelkast 2 deuren',219,228,257,262,280,314,350,369,430,487,375,394,419),
('Z000037',100,'SB','Zwevende spoelkast 2 deuren',248,271,298,311,330,351,395,420,477,562,416,429,496),
('Z000038',120,'SB','Zwevende spoelkast 2 deuren',274,289,316,327,348,369,432,455,521,584,481,525,607),
('Z000039',60,'SB','Zwevende spoelkast 1 uittreklade',223,231,244,250,260,271,302,314,347,379,327,349,390),
('Z000040',80,'SB','Zwevende spoelkast 1 uittreklade',259,270,288,303,319,324,361,381,411,490,398,410,433),
('Z000041',90,'SB','Zwevende spoelkast 1 uittreklade',270,276,294,309,325,332,380,408,437,501,427,434,472),
('Z000042',100,'SB','Zwevende spoelkast 1 uittreklade',330,352,365,384,405,419,460,486,527,600,504,513,553),
('Z000043',60,'SB','Zwevende spoelkast 2 lades',291,297,302,314,354,380,384,411,460,478,420,432,441),
('Z000044',80,'SB','Zwevende spoelkast 2 lades',332,338,347,370,404,429,440,482,515,553,498,507,530),
('Z000045',90,'SB','Zwevende spoelkast 2 lades',342,346,356,379,413,447,451,510,537,567,527,539,552),
('Z000046',100,'SB','Zwevende spoelkast 2 lades',382,390,407,440,480,506,523,598,611,674,580,619,640),
('Z000047',120,'SB','Zwevende spoelkast 2 lades',398,401,419,451,495,539,567,645,655,695,641,664,685);

-- Insert 68 cabinet products (skip existing)
INSERT INTO products (article_code, name, supplier_id, category_id, width_mm, pricing_unit, is_active)
SELECT 
  d.ac, d.descr,
  '29a8e1aa-35da-4784-99ff-23129f36fe22'::uuid,
  CASE d.cat
    WHEN 'OK' THEN '4d2bdf43-fcc3-416f-b7e4-7b2109d9c0d0'::uuid
    ELSE '16cee1ac-def7-4ebd-a59e-9940c43502ca'::uuid
  END,
  d.w * 10,
  'STUK'::pricing_unit,
  true
FROM _cab d
WHERE NOT EXISTS (
  SELECT 1 FROM products p
  WHERE p.article_code = d.ac
  AND p.supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22'::uuid
);

-- Insert 884 product_prices (68 products × 13 price groups)
INSERT INTO product_prices (product_id, price_group_id, price, valid_from)
SELECT p.id, v.pg_id::uuid, v.price, CURRENT_DATE
FROM _cab d
JOIN products p ON p.article_code = d.ac
  AND p.supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22'::uuid
CROSS JOIN LATERAL (VALUES
  ('71ce2259-8ce0-4a30-9df8-0d8a59d31547', d.e1),
  ('da205c94-3277-495f-a9dd-018234915255', d.e2),
  ('f5bf7863-7c3d-4375-985e-5703bc7de4f2', d.e3),
  ('0c2ded47-d914-4881-a51f-466d6aead49d', d.e4),
  ('8783e33c-5db4-4cea-a465-d579da14b543', d.e5),
  ('fff4304c-9576-43fa-9c60-3b84a0a87963', d.e6),
  ('037c6bdc-0247-49d3-afd7-97173c2bd10e', d.e7),
  ('de92cbd6-7b55-42d8-8b0a-f0aff008f851', d.e8),
  ('5c10c05e-69ce-4dbd-a496-b67b7547d8d8', d.e9),
  ('d95065b7-8200-4a42-b91d-b7befeadd648', d.e10),
  ('fb88d77e-0bc8-442f-b10b-cb994fd58495', d.pa),
  ('14c67799-d807-45c4-990c-18a24c47e9ea', d.pb),
  ('7b6de52b-b7ac-41dc-b708-e187a2f6b85c', d.pc)
) AS v(pg_id, price)
WHERE NOT EXISTS (
  SELECT 1 FROM product_prices pp
  WHERE pp.product_id = p.id AND pp.price_group_id = v.pg_id::uuid
);

-- Art collection: 5 price groups
INSERT INTO price_groups (code, name, collection, supplier_id, sort_order, material_type, material_description)
VALUES
  ('I',  'Art I - Nobilitato Matt Chic',           'Art', '29a8e1aa-35da-4784-99ff-23129f36fe22'::uuid, 1, 'Nobilitato', 'Nobilitato Opaco Matt Chic'),
  ('II', 'Art II - Ossido/Cemento Materico',        'Art', '29a8e1aa-35da-4784-99ff-23129f36fe22'::uuid, 2, 'Materico',   'Ossido / Cemento Materico'),
  ('III','Art III - Termo/Alkorcell/Monolaccato',    'Art', '29a8e1aa-35da-4784-99ff-23129f36fe22'::uuid, 3, 'Mixed',      'Termo Strutturato + Alkorcell + Monolaccato opaco'),
  ('IV', 'Art IV - Monolaccato Lucido',              'Art', '29a8e1aa-35da-4784-99ff-23129f36fe22'::uuid, 4, 'Laccato',    'Monolaccato lucido'),
  ('V',  'Art V - Special Traccia',                  'Art', '29a8e1aa-35da-4784-99ff-23129f36fe22'::uuid, 5, 'Special',    'Special Traccia');

-- Art colors (24 records)
INSERT INTO price_group_colors (color_code, color_name, color_type, material_type, model_code, supplier_id, price_group_id, sort_order)
SELECT v.color_code, v.color_name, 'front', v.material_type, v.model_code,
  '29a8e1aa-35da-4784-99ff-23129f36fe22'::uuid,
  pg.id, v.sort_order
FROM (VALUES
  ('I','BIANCO-SOFT','Bianco Soft','Nobilitato Opaco Matt Chic','Kaya',1),
  ('I','VANILLA-ICE','Vanilla Ice','Nobilitato Opaco Matt Chic','Kaya',2),
  ('I','BRIO','Brio','Nobilitato Opaco Matt Chic','Kaya',3),
  ('I','CONCHIGLIA','Conchiglia','Nobilitato Opaco Matt Chic','Kaya',4),
  ('I','SIENA','Siena','Nobilitato Opaco Matt Chic','Kaya',5),
  ('I','SMOKE-GREY','Smoke Grey','Nobilitato Opaco Matt Chic','Kaya',6),
  ('I','INK','Ink','Nobilitato Opaco Matt Chic','Kaya',7),
  ('II','SLATE-GREY','Slate Grey','Ossido Materico','Kaya',1),
  ('II','ALU','Alu','Cemento Materico','Kaya',2),
  ('II','POLA','Pola','Cemento Materico','Kaya',3),
  ('II','SAND','Sand','Cemento Materico','Kaya',4),
  ('III','TROPEA','Tropea','Termo Strutturato','Kaya',1),
  ('III','NOCE-SVEZIA','Noce Svezia','Termo Strutturato','Kaya',2),
  ('III','CORDOBA','Cordoba','Termo Strutturato','Kaya',3),
  ('III','ROVERE-CORTINA','Rovere Cortina','Termo Strutturato','Kaya',4),
  ('III','WHITE-MATT','White Matt','Alkorcell','Sveva',5),
  ('III','BLACK-MATT','Black Matt','Alkorcell','Sveva',6),
  ('III','MILK-WHITE-OP','Milk White opaco','Monolaccato','Lumia',7),
  ('III','COTTON-OP','Cotton opaco','Monolaccato','Lumia',8),
  ('III','COBALT-GREY-OP','Cobalt Grey opaco','Monolaccato','Lumia',9),
  ('IV','MILK-WHITE-LU','Milk White lucido','Monolaccato','Lumia',1),
  ('IV','COTTON-LU','Cotton lucido','Monolaccato','Lumia',2),
  ('IV','COBALT-GREY-LU','Cobalt Grey lucido','Monolaccato','Lumia',3),
  ('V','MILK-WHITE-TR','Milk White opaco','Special Traccia','Lumia',1)
) AS v(pg_code, color_code, color_name, material_type, model_code, sort_order)
JOIN price_groups pg ON pg.code = v.pg_code AND pg.collection = 'Art'
  AND pg.supplier_id = '29a8e1aa-35da-4784-99ff-23129f36fe22'::uuid;

DROP TABLE _cab;
