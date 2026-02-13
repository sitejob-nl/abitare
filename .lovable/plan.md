

# Projectselector bij order-aanmaak (quote-naar-order conversie)

## Analyse

Orders worden aangemaakt via het "Offerte omzetten naar order"-proces (`ConvertToOrderDialog` + `useConvertQuoteToOrder`). Er is geen apart "order aanmaak"-formulier -- orders ontstaan altijd vanuit een offerte.

De offerte heeft al een `project_id` (via de eerder toegevoegde projectselector). Bij conversie wordt dit veld echter niet overgenomen naar de nieuwe order.

## Oplossing

Het `project_id` van de bronofferte automatisch meenemen naar de nieuwe order bij conversie. Dit is de logische plek omdat:
- Orders altijd uit offertes ontstaan
- Het project al op offerteniveau is vastgelegd
- Er geen apart order-aanmaakformulier bestaat

## Technische wijziging

**Bestand: `src/hooks/useConvertQuoteToOrder.ts`**

In de order-insert (rond regel 46-69) wordt `project_id: quote.project_id` toegevoegd aan het insert-object. Dit erft het project automatisch over van de offerte.

Dat is de enige wijziging die nodig is -- een enkele regel toevoegen.

