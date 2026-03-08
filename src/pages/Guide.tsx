import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FileText,
  Package,
  Users,
  Receipt,
  Calendar,
  Wrench,
  Settings,
  ArrowRight,
  CheckCircle2,
  Info,
} from "lucide-react";

const workflowSteps = [
  {
    icon: Users,
    title: "1. Klant aanmaken",
    description: "Ga naar Klanten → Nieuwe klant. Vul naam, adres, contactgegevens en eventueel KvK/BTW-nummer in.",
    tips: ["Leveradres kan afwijken van factuuradres", "Koppel een verkoper voor rapportages"],
  },
  {
    icon: FileText,
    title: "2. Offerte maken",
    description: "Ga naar Offertes → Nieuwe offerte. Kies de klant, voeg secties toe (keuken, werkblad, montage) en configureer producten per prijsgroep.",
    tips: [
      "Gebruik de sectie-wizard voor Stosa-keukens",
      "Kortingen kunnen per sectie of per regel",
      "PDF wordt automatisch gegenereerd bij versturen",
    ],
  },
  {
    icon: Package,
    title: "3. Order aanmaken",
    description: "Bij akkoord: klik 'Omzetten naar order' op de offerte. Kies of je direct een aanbetalingsfactuur wilt versturen.",
    tips: [
      "Checklist-items worden automatisch aangemaakt",
      "Het Kanban-bord toont de status van alle orders",
      "Financiële gates blokkeren voortgang bij ontbrekende betaling",
    ],
  },
  {
    icon: Calendar,
    title: "4. Planning & montage",
    description: "Plan de montage via de agenda (Outlook-integratie). Wijs een monteur toe en verstuur de planning naar de klant.",
    tips: [
      "Klanten kunnen via het portaal hun voorkeursdatums opgeven",
      "Conflicten worden automatisch gedetecteerd in de agenda",
    ],
  },
  {
    icon: Wrench,
    title: "5. Werkbon invullen",
    description: "De monteur opent de PWA, ziet zijn opdrachten, en vult de werkbon in: foto's, tijdregistratie, schadebeoordeling, handtekening.",
    tips: [
      "Werkt ook offline — data wordt gesynchroniseerd bij verbinding",
      "Bij schade wordt automatisch een serviceticket aangemaakt",
    ],
  },
  {
    icon: Receipt,
    title: "6. Factureren",
    description: "Na montage wordt de factuur aangemaakt en naar Exact Online gesynchroniseerd. Betaalstatus wordt automatisch bijgehouden.",
    tips: [
      "Meerdere factuurtypen: aanbetaling, restbetaling, meerwerk, creditnota",
      "Betaalstatus wordt opgehaald vanuit Exact Online",
    ],
  },
];

const faqItems = [
  {
    q: "Hoe nodig ik een nieuwe gebruiker uit?",
    a: "Ga naar Instellingen → Gebruikers → Gebruiker uitnodigen. Vul het e-mailadres in en selecteer de rol (admin, manager, verkoper, monteur).",
  },
  {
    q: "Hoe koppel ik Exact Online?",
    a: "Ga naar Instellingen → Exact Online → Verbinden. Je wordt doorgestuurd naar Exact om in te loggen. Na autorisatie wordt de koppeling automatisch ingesteld.",
  },
  {
    q: "Hoe werkt de PWA voor monteurs?",
    a: "Monteurs loggen in via hun mobiele browser. Ze krijgen een 'Installeer app' prompt te zien. De app werkt ook offline en synchroniseert automatisch wanneer er weer verbinding is.",
  },
  {
    q: "Hoe stuur ik een offerte naar de klant?",
    a: "Open de offerte → klik op 'Versturen'. Je kunt kiezen tussen e-mail (via Microsoft 365) of WhatsApp. De PDF wordt automatisch als bijlage meegestuurd.",
  },
  {
    q: "Wat als een monteur schade constateert?",
    a: "Bij het invullen van de werkbon selecteert de monteur 'Ja, schade geconstateerd', voegt foto's toe en beschrijft de schade. Bij indiening wordt automatisch een serviceticket aangemaakt met prioriteit 'hoog'.",
  },
  {
    q: "Hoe maak ik een losse factuur aan?",
    a: "Ga naar Facturen → klik op '+ Factuur'. Kies het factuurtype (standaard, aanbetaling, restbetaling, meerwerk of creditnota), selecteer de klant en voeg regels toe.",
  },
  {
    q: "Hoe werkt het klantenportaal?",
    a: "Bij een order kun je een portaal-link genereren. De klant krijgt een unieke URL waarmee ze hun orders, offertes, documenten en planning kunnen inzien.",
  },
  {
    q: "Kan ik de agenda koppelen met Outlook?",
    a: "Ja, ga naar Instellingen → Microsoft 365 → Verbinden. Daarna kun je bij elke order een Outlook-afspraak aanmaken, die bidirectioneel gesynchroniseerd wordt.",
  },
];

const roleDescriptions = [
  {
    role: "Admin",
    description: "Volledige toegang tot alle functies, instellingen en vestigingen. Kan gebruikers beheren en rechten toekennen.",
  },
  {
    role: "Manager",
    description: "Toegang tot alle operationele functies. Kan orders overriden, rapportages bekijken en monteurs toewijzen.",
  },
  {
    role: "Verkoper",
    description: "Kan klanten, offertes en orders beheren binnen de eigen vestiging. Geen toegang tot instellingen.",
  },
  {
    role: "Monteur",
    description: "Gebruikt de monteurs-app (PWA). Ziet alleen toegewezen opdrachten en kan werkbonnen invullen.",
  },
];

export default function Guide() {
  return (
    <AppLayout title="Handleiding" breadcrumb="Handleiding">
      {/* Intro */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <h2 className="text-lg font-semibold mb-1">Welkom bij Abitare</h2>
              <p className="text-sm text-muted-foreground">
                Dit is de interne handleiding voor het Abitare-platform. Hieronder vind je de 
                complete workflow van klant tot factuur, veelgestelde vragen en een overzicht van de gebruikersrollen.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow */}
      <h2 className="text-lg font-semibold mb-4">Workflow: van offerte tot factuur</h2>
      <div className="grid gap-4 mb-8">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Card key={index}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3 text-base">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  {step.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                <div className="space-y-1.5">
                  {step.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
                {index < workflowSteps.length - 1 && (
                  <div className="flex justify-center mt-4">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Rollen */}
      <h2 className="text-lg font-semibold mb-4">Gebruikersrollen</h2>
      <div className="grid gap-3 sm:grid-cols-2 mb-8">
        {roleDescriptions.map((role) => (
          <Card key={role.role}>
            <CardContent className="pt-4">
              <Badge variant="outline" className="mb-2">{role.role}</Badge>
              <p className="text-sm text-muted-foreground">{role.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FAQ */}
      <h2 className="text-lg font-semibold mb-4">Veelgestelde vragen</h2>
      <Card className="mb-8">
        <CardContent className="pt-4">
          <Accordion type="multiple" className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger className="text-sm font-medium text-left">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardContent className="pt-6 text-center">
          <Settings className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <h3 className="font-semibold mb-1">Meer hulp nodig?</h3>
          <p className="text-sm text-muted-foreground">
            Neem contact op via{" "}
            <a href="mailto:info@sitejob.nl" className="text-primary hover:underline">
              info@sitejob.nl
            </a>
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
