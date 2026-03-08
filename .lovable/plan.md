

## Plan: E2E Browser Test — Order tot Afgerond (incl. montage)

De vorige test dekte klant → offerte → order. Nu test ik de volledige order-lifecycle van status "nieuw" tot "afgerond", inclusief de montage-flow via het monteurs-portaal.

### Teststappen

**1. Order #12 openen** — Navigeer naar de orderdetailpagina van de zojuist aangemaakte order (Test Workflow, status "nieuw").

**2. Order gates testen** — Verifieer dat de gates correct werken:
- Probeer status naar "Controle" → moet blokkeren (geen montageadres, geen documenten)
- Vul montageadres in → opnieuw proberen
- Upload een document → probeer opnieuw naar "Controle"
- Vink checklist-items af → probeer naar "Bestel klaar"

**3. Statusflow doorlopen** — Stap voor stap de volledige statusflow doorlopen:
- nieuw → controle → bestel_klaar → besteld → in_productie → levering_gepland → geleverd → montage_gepland

**4. Monteur toewijzen** — Wijs een monteur toe via de installer-dropdown op de orderdetailpagina.

**5. Monteurs-portaal testen** — Navigeer naar `/monteur/order/:orderId`:
- Verifieer dat de order zichtbaar is voor de monteur
- Start een werkbon (werk rapport)
- Vul werkbon-velden in en dien in
- Verifieer dat de orderstatus automatisch wijzigt naar "gemonteerd" (via database trigger)

**6. Nazorg → Afgerond** — Terug naar de order, wijzig status naar "nazorg" en daarna "afgerond".

**7. Verifieer eindtoestand** — Controleer dat de volledige statushistorie correct is vastgelegd.

### Technische details

- De `handleStatusChange` in `OrderDetail.tsx` stuurt de gateContext mee (regels 288-300) met `checklistComplete`, `hasInstallationAddress`, `hasDocuments`
- De `validateStatusTransition` in `orderGates.ts` valideert elke transitie server-side + client-side
- Het monteurs-portaal (`InstallerOrderDetail.tsx`) gebruikt `useWorkReportByOrder` en `useCreateWorkReport` om werkbonnen aan te maken
- De trigger `trg_work_report_submitted` wijzigt automatisch de orderstatus naar "gemonteerd" bij indiening

### Risico's
- De test-order (#12) heeft `total_incl_vat: 0.00` en `deposit_required: true`, `deposit_invoice_sent: true`, `payment_status: open`. De deposit-gate kan transities naar "bestel_klaar"/"besteld" blokkeren — we moeten eerst een betaling registreren.
- Het monteurs-portaal is beveiligd met de "monteur" rol — het demo-account heeft deze rol, dus dit zou moeten werken.

