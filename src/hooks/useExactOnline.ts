import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExactOnlineConnection {
  id: string;
  division_id: string;
  exact_division: number | null;
  is_active: boolean;
  connected_at: string | null;
  token_expires_at: string | null;
  webhooks_enabled: boolean | null;
}

export function useExactOnlineConnections() {
  return useQuery({
    queryKey: ["exact-online-connections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exact_online_connections")
        .select("*")
        .order("connected_at", { ascending: false });

      if (error) throw error;
      return data as ExactOnlineConnection[];
    },
  });
}

export function useStartExactAuth() {
  return useMutation({
    mutationFn: async (divisionId: string) => {
      const { data, error } = await supabase.functions.invoke("exact-auth", {
        body: { divisionId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data.authUrl as string;
    },
    onSuccess: (authUrl) => {
      // Redirect to Exact Online OAuth
      window.location.href = authUrl;
    },
    onError: (error) => {
      toast.error(`Fout bij starten OAuth: ${error.message}`);
    },
  });
}

export function useDisconnectExact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from("exact_online_connections")
        .delete()
        .eq("id", connectionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exact-online-connections"] });
      toast.success("Exact Online verbinding verwijderd");
    },
    onError: (error) => {
      toast.error(`Fout bij ontkoppelen: ${error.message}`);
    },
  });
}

export function useExactApi() {
  return useMutation({
    mutationFn: async ({
      divisionId,
      endpoint,
      method = "GET",
      body,
    }: {
      divisionId: string;
      endpoint: string;
      method?: string;
      body?: object;
    }) => {
      const { data, error } = await supabase.functions.invoke("exact-api", {
        body: { divisionId, endpoint, method, body },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
  });
}

export function useManageWebhooks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      divisionId,
    }: {
      action: "subscribe" | "unsubscribe" | "status";
      divisionId: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("exact-webhooks-manage", {
        body: { action, divisionId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["exact-online-connections"] });
      if (variables.action === "subscribe") {
        toast.success("Webhooks ingeschakeld");
      } else if (variables.action === "unsubscribe") {
        toast.success("Webhooks uitgeschakeld");
      }
    },
    onError: (error) => {
      toast.error(`Webhook fout: ${error.message}`);
    },
  });
}

export function useSyncCustomers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      divisionId,
      customerId,
    }: {
      action: "push" | "pull" | "sync";
      divisionId: string;
      customerId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("exact-sync-customers", {
        body: { action, divisionId, customerId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      
      if (variables.action === "push") {
        const msg = `Klanten gepusht: ${data.created} nieuw, ${data.updated} bijgewerkt`;
        if (data.failed > 0) {
          toast.warning(`${msg}, ${data.failed} mislukt`);
        } else {
          toast.success(msg);
        }
      } else if (variables.action === "pull") {
        const msg = `Klanten opgehaald: ${data.imported} nieuw, ${data.updated} bijgewerkt`;
        toast.success(msg);
      } else {
        toast.success("Synchronisatie voltooid");
      }
    },
    onError: (error) => {
      toast.error(`Sync fout: ${error.message}`);
    },
  });
}

export function useSyncInvoices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      divisionId,
      orderId,
    }: {
      action: "push" | "pull_status" | "sync";
      divisionId: string;
      orderId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("exact-sync-invoices", {
        body: { action, divisionId, orderId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-stats"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      
      if (variables.action === "push") {
        const msg = `Facturen gepusht: ${data.created} aangemaakt`;
        if (data.failed > 0) {
          toast.warning(`${msg}, ${data.failed} mislukt`);
        } else {
          toast.success(msg);
        }
      } else if (variables.action === "pull_status") {
        toast.success(`Betalingsstatussen bijgewerkt: ${data.updated} gewijzigd`);
      } else {
        const pushMsg = data.pushed ? `${data.pushed.created} facturen gepusht` : "";
        const pullMsg = data.pulled ? `${data.pulled.updated} statussen bijgewerkt` : "";
        toast.success(`Synchronisatie voltooid: ${[pushMsg, pullMsg].filter(Boolean).join(", ")}`);
      }
    },
    onError: (error) => {
      toast.error(`Factuur sync fout: ${error.message}`);
    },
  });
}
