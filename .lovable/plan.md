

## Plan: 13 Evolution prijsgroepen + kleuren importeren + filter fix

### Model-koppeling: per kleur-record (niet per prijsgroep)

Goed punt over E7/E9. De simpelste en meest correcte oplossing: **model_code op `price_group_colors` level**, niet op `price_groups`. Redenen:

- E7 heeft kleuren die bij Natural horen EN kleuren die bij Palio horen — per kleur-record is dat eenduidig
- E2 Rovere Nodato (Metropolis) vs E5 Rovere Nodato (Palio) worden zo ook correct onderscheiden
- Geen array-kolom nodig, gewoon een simpele `text` per kleur-record
- Filteren in de wizard werkt direct: `WHERE price_group_id = X AND model_code = Y`

### Database wijzigingen

**Migratie 1**: Kolom `model_code text` toevoegen aan `price_group_colors`

**Data insert**: 
- 13 `price_groups` records (E1-E10 + A + B + C, collection = "Evolution")
- ~250+ `price_group_colors` records met per record: kleurcode, kleurnaam, material_type, model_code

### Data overzicht

| Prijsgroep | Material | Model(len) in kleur-records | is_glass |
|---|---|---|---|
| E1 | Termo Strutturato | Metropolis | false |
| E2 | Termo Strutt / Laminato / PET | Metropolis | false |
| E3 | PET Millerighe / Laccato | Metropolis | false |
| E4 | Fenix | Metropolis | false |
| E5 | Legno Frassino / Rovere | Palio | false |
| E6 | Laccato Opaco | Color Trend | false |
| E7 | Impiallacciato / Laccato Poro Chiuso | **Natural** of **Palio** (per kleur) | false |
| E8 | Laccato Lucido Spazzolato | Color Trend | false |
| E9 | Laccato Opaco Deluxe / Impiallacciato | **Color Trend** of **Natural** (per kleur) | false |
| E10 | Impiallacciato Cannettato / Doghe | Natural | false |
| A | Vetro / HPL / Neolith | Aliant | true |
| B | Vetro / HPL / Neolith | Aliant | true |
| C | Vetro / HPL / Neolith | Aliant | true |

E8 = zelfde kleurnamen als E6, maar `material_type = "Laccato Lucido Spazzolato"`.
A/B/C = identieke kleurenlijst, elk als eigen records.

### Code fix: StosaConfigPanel.tsx (regel 43)

Huidige code:
```ts
const activeFrontColors = pgFrontColors.length > 0 ? pgFrontColors : frontColors;
```

Wordt:
```ts
const activeFrontColors = priceGroupId ? pgFrontColors : frontColors;
```

Als `priceGroupId` is geselecteerd maar er zijn geen kleuren, toon een melding "Geen kleuren gevonden voor deze prijsgroep" in plaats van alle kleuren als fallback. Zelfde voor corpus.

### Bestanden

| Actie | Bestand |
|---|---|
| Migratie | `price_group_colors`: kolom `model_code text` toevoegen |
| Data insert | 13 `price_groups` records |
| Data insert | ~250+ `price_group_colors` records met model_code per kleur |
| Code fix | `StosaConfigPanel.tsx` — geen fallback bij geselecteerde prijsgroep |

