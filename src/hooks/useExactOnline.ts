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
