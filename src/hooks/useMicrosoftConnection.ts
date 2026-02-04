import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MicrosoftConnection {
  id: string;
  user_id: string;
  microsoft_email: string | null;
  connected_at: string;
  is_active: boolean;
}

export function useMicrosoftConnection() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["microsoft-connection", user?.id],
    queryFn: async (): Promise<MicrosoftConnection | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("microsoft_connections")
        .select("id, user_id, microsoft_email, connected_at, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Error fetching Microsoft connection:", error);
        throw error;
      }

      return data as MicrosoftConnection | null;
    },
    enabled: !!user,
  });
}

export function useStartMicrosoftAuth() {
  return useMutation({
    mutationFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Je moet ingelogd zijn om te verbinden met Microsoft");
      }

      const { data, error } = await supabase.functions.invoke("microsoft-auth", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message || "Kon Microsoft authenticatie niet starten");
      }

      if (!data?.authUrl) {
        throw new Error("Geen authenticatie URL ontvangen");
      }

      return data.authUrl as string;
    },
    onSuccess: (authUrl) => {
      // Redirect to Microsoft login
      window.location.href = authUrl;
    },
    onError: (error: Error) => {
      toast.error("Fout bij verbinden", {
        description: error.message,
      });
    },
  });
}

export function useDisconnectMicrosoft() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Niet ingelogd");

      const { error } = await supabase
        .from("microsoft_connections")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["microsoft-connection"] });
      toast.success("Microsoft account ontkoppeld");
    },
    onError: (error: Error) => {
      toast.error("Fout bij ontkoppelen", {
        description: error.message,
      });
    },
  });
}

export function useMicrosoftApi() {
  return useMutation({
    mutationFn: async ({
      endpoint,
      method = "GET",
      data,
    }: {
      endpoint: string;
      method?: string;
      data?: unknown;
    }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Niet ingelogd");
      }

      const { data: responseData, error } = await supabase.functions.invoke(
        "microsoft-api",
        {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: { endpoint, method, data },
        }
      );

      if (error) {
        throw new Error(error.message || "API aanroep mislukt");
      }

      return responseData;
    },
  });
}
