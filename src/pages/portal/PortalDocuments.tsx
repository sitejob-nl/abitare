import { useOutletContext } from "react-router-dom";
import { Files, Download, FileText, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PortalData } from "@/hooks/usePortalToken";

interface PortalContext {
  portalData: PortalData;
  token: string;
}

interface Document {
  id: string;
  title: string | null;
  file_name: string | null;
  file_path: string | null;
  document_type: string;
  created_at: string | null;
  order_id: string | null;
  order_number?: number;
}

const documentTypeLabels: Record<string, string> = {
  offerte: "Offerte",
  orderbevestiging: "Orderbevestiging",
  factuur: "Factuur",
  tekening: "Tekening",
  montagebon: "Montagebon",
  overig: "Overig",
};

export default function PortalDocuments() {
  const { portalData } = useOutletContext<PortalContext>();
  const { orders } = portalData;

  // Fetch all visible documents for customer's orders
  const { data: documents, isLoading } = useQuery({
    queryKey: ["portal-documents", orders.map((o) => o.id)],
    queryFn: async () => {
      if (orders.length === 0) return [];

      const { data, error } = await supabase
        .from("order_documents")
        .select("id, title, file_name, file_path, document_type, created_at, order_id")
        .in("order_id", orders.map((o) => o.id))
        .eq("visible_to_customer", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Add order number to each document
      return (data || []).map((doc) => {
        const order = orders.find((o) => o.id === doc.order_id);
        return {
          ...doc,
          order_number: order?.order_number,
        };
      }) as Document[];
    },
    enabled: orders.length > 0,
  });

  const handleDownload = async (doc: Document) => {
    if (!doc.file_path) return;

    try {
      const { data, error } = await supabase.storage
        .from("order-documents")
        .createSignedUrl(doc.file_path, 60);

      if (error) throw error;

      window.open(data.signedUrl, "_blank");
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Documenten</h1>
          <p className="text-muted-foreground mt-1">
            Bekijk en download uw documenten.
          </p>
        </div>
        
        <div className="text-center py-12">
          <Files className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-medium text-foreground">Geen documenten</h2>
          <p className="text-muted-foreground">
            Er zijn nog geen documenten voor u beschikbaar.
          </p>
        </div>
      </div>
    );
  }

  // Group documents by order
  const documentsByOrder = documents.reduce((acc, doc) => {
    const key = doc.order_id || "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Documenten</h1>
        <p className="text-muted-foreground mt-1">
          Bekijk en download uw documenten. Totaal {documents.length} document(en).
        </p>
      </div>

      {Object.entries(documentsByOrder).map(([orderId, docs]) => {
        const orderNumber = docs[0]?.order_number;
        
        return (
          <Card key={orderId}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                {orderNumber ? `Order #${orderNumber}` : "Overige documenten"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div>
                      <p className="font-medium">{doc.title || doc.file_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{documentTypeLabels[doc.document_type] || doc.document_type}</span>
                        {doc.created_at && (
                          <>
                            <span>•</span>
                            <span>{new Date(doc.created_at).toLocaleDateString("nl-NL")}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
