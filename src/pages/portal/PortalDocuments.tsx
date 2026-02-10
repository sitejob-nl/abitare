import { useOutletContext } from "react-router-dom";
import { Files, Download, FileText, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePortalDocuments, usePortalDocumentUrl } from "@/hooks/usePortalData";
import type { PortalData } from "@/hooks/usePortalData";

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
  const { token } = useOutletContext<PortalContext>();
  const { data, isLoading } = usePortalDocuments(token);
  const getDocumentUrl = usePortalDocumentUrl();

  const documents: Document[] = (data?.documents || []).map((doc: Document) => {
    const order = (data?.orders || []).find((o: { id: string; order_number: number }) => o.id === doc.order_id);
    return { ...doc, order_number: order?.order_number };
  });

  const handleDownload = async (doc: Document) => {
    if (!doc.file_path) return;
    try {
      const result = await getDocumentUrl.mutateAsync({ token, filePath: doc.file_path });
      window.open(result.signedUrl, "_blank");
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

  if (documents.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Documenten</h1>
          <p className="text-muted-foreground mt-1">Bekijk en download uw documenten.</p>
        </div>
        <div className="text-center py-12">
          <Files className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-medium text-foreground">Geen documenten</h2>
          <p className="text-muted-foreground">Er zijn nog geen documenten voor u beschikbaar.</p>
        </div>
      </div>
    );
  }

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
        <p className="text-muted-foreground mt-1">Bekijk en download uw documenten. Totaal {documents.length} document(en).</p>
      </div>

      {Object.entries(documentsByOrder).map(([orderId, docs]) => (
        <Card key={orderId}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              {docs[0]?.order_number ? `Order #${docs[0].order_number}` : "Overige documenten"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
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
                  <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>
                    <Download className="h-4 w-4 mr-1" /> Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
