import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, Upload, X, Loader2 } from "lucide-react";
import logo from "@/assets/logo.svg";

const ticketSchema = z.object({
  submitter_name: z.string().min(2, "Naam is verplicht"),
  submitter_email: z.string().email("Ongeldig e-mailadres"),
  submitter_phone: z.string().optional(),
  category: z.string().min(1, "Kies een categorie"),
  subject: z.string().min(5, "Onderwerp is verplicht (min. 5 tekens)"),
  description: z.string().min(10, "Beschrijving is verplicht (min. 10 tekens)"),
  order_number: z.string().optional(),
});

type TicketFormData = z.infer<typeof ticketSchema>;

const categories = [
  { value: "klacht", label: "Klacht" },
  { value: "garantie", label: "Garantie" },
  { value: "schade", label: "Schade" },
  { value: "overig", label: "Overig" },
];

export default function ServiceTicketPublicForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      category: "",
    },
  });

  const category = watch("category");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter((file) => file.size <= 10 * 1024 * 1024); // 10MB max
    setFiles((prev) => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: TicketFormData) => {
    setIsSubmitting(true);

    try {
      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from("service_tickets")
        .insert({
          submitter_name: data.submitter_name,
          submitter_email: data.submitter_email,
          submitter_phone: data.submitter_phone || null,
          category: data.category,
          subject: data.subject,
          description: data.description,
          status: "nieuw",
          priority: "normaal",
        })
        .select("id, ticket_number")
        .single();

      if (ticketError) throw ticketError;

      // Upload attachments if any
      if (files.length > 0 && ticket) {
        for (const file of files) {
          const filePath = `${ticket.id}/${Date.now()}-${file.name}`;
          
          const { error: uploadError } = await supabase.storage
            .from("service-attachments")
            .upload(filePath, file);

          if (!uploadError) {
            await supabase.from("service_ticket_attachments").insert({
              ticket_id: ticket.id,
              file_path: filePath,
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type,
            });
          }
        }
      }

      setTicketNumber(ticket.ticket_number);
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting ticket:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Bedankt!</h2>
            <p className="text-muted-foreground mb-4">
              Uw aanvraag is succesvol ingediend.
            </p>
            <div className="rounded-lg bg-muted p-4 mb-6">
              <p className="text-sm text-muted-foreground">Uw ticketnummer:</p>
              <p className="text-3xl font-bold text-primary">#{ticketNumber}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Bewaar dit nummer om de status van uw aanvraag te kunnen opvragen.
              Wij nemen zo snel mogelijk contact met u op.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/50 to-background py-8 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <img src={logo} alt="Logo" className="mx-auto h-8 mb-4" />
          <h1 className="text-2xl font-bold">Service Aanvraag</h1>
          <p className="text-muted-foreground mt-2">
            Heeft u een klacht, garantiekwestie of schade? Vul het formulier in en wij nemen contact met u op.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Uw gegevens</CardTitle>
            <CardDescription>
              Vul uw contactgegevens in zodat wij u kunnen bereiken.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="submitter_name">Naam *</Label>
                  <Input
                    id="submitter_name"
                    {...register("submitter_name")}
                    placeholder="Uw volledige naam"
                  />
                  {errors.submitter_name && (
                    <p className="text-sm text-destructive">{errors.submitter_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="submitter_email">E-mailadres *</Label>
                  <Input
                    id="submitter_email"
                    type="email"
                    {...register("submitter_email")}
                    placeholder="uw@email.nl"
                  />
                  {errors.submitter_email && (
                    <p className="text-sm text-destructive">{errors.submitter_email.message}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="submitter_phone">Telefoonnummer</Label>
                  <Input
                    id="submitter_phone"
                    {...register("submitter_phone")}
                    placeholder="06-12345678"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order_number">Ordernummer (indien bekend)</Label>
                  <Input
                    id="order_number"
                    {...register("order_number")}
                    placeholder="Bijv. 2024-001"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Categorie *</Label>
                <Select value={category} onValueChange={(value) => setValue("category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer een categorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-destructive">{errors.category.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Onderwerp *</Label>
                <Input
                  id="subject"
                  {...register("subject")}
                  placeholder="Korte omschrijving van uw aanvraag"
                />
                {errors.subject && (
                  <p className="text-sm text-destructive">{errors.subject.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Beschrijving *</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Beschrijf uw probleem zo uitgebreid mogelijk..."
                  rows={5}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Bijlagen (optioneel)</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Upload foto's of documenten (max. 5 bestanden, elk max. 10MB)
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm"
                    >
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {files.length < 5 && (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 p-4 transition-colors hover:border-muted-foreground/50">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Klik om bestanden te uploaden
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Versturen...
                  </>
                ) : (
                  "Versturen"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Door dit formulier in te dienen gaat u akkoord met onze voorwaarden.
        </p>
      </div>
    </div>
  );
}
