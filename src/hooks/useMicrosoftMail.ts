import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMicrosoftConnection } from "./useMicrosoftConnection";
import { toast } from "sonner";

export interface MicrosoftEmailAddress {
  name?: string;
  address: string;
}

export interface MicrosoftEmail {
  id: string;
  subject: string;
  bodyPreview: string;
  body?: {
    contentType: string;
    content: string;
  };
  from: {
    emailAddress: MicrosoftEmailAddress;
  };
  toRecipients: Array<{
    emailAddress: MicrosoftEmailAddress;
  }>;
  ccRecipients?: Array<{
    emailAddress: MicrosoftEmailAddress;
  }>;
  receivedDateTime: string;
  sentDateTime?: string;
  isRead: boolean;
  hasAttachments: boolean;
  importance: "low" | "normal" | "high";
  flag?: {
    flagStatus: "notFlagged" | "flagged" | "complete";
  };
  webLink?: string;
}

export function useMicrosoftEmails(folder: string = "inbox") {
  const { data: connection } = useMicrosoftConnection();

  return useQuery({
    queryKey: ["microsoft-emails", folder],
    queryFn: async (): Promise<MicrosoftEmail[]> => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Niet ingelogd");
      }

      const { data, error } = await supabase.functions.invoke("microsoft-api", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: {
          endpoint: `/me/mailFolders/${folder}/messages?$top=50&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead,hasAttachments,importance,flag,webLink`,
          method: "GET",
        },
      });

      if (error) {
        throw new Error(error.message || "Kon emails niet ophalen");
      }

      return data?.value || [];
    },
    enabled: !!connection?.is_active,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useMicrosoftEmail(emailId: string | null) {
  const { data: connection } = useMicrosoftConnection();

  return useQuery({
    queryKey: ["microsoft-email", emailId],
    queryFn: async (): Promise<MicrosoftEmail | null> => {
      if (!emailId) return null;

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Niet ingelogd");
      }

      const { data, error } = await supabase.functions.invoke("microsoft-api", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: {
          endpoint: `/me/messages/${emailId}?$select=id,subject,body,bodyPreview,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,importance,flag,webLink`,
          method: "GET",
        },
      });

      if (error) {
        throw new Error(error.message || "Kon email niet ophalen");
      }

      // Mark as read
      if (data && !data.isRead) {
        await supabase.functions.invoke("microsoft-api", {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: {
            endpoint: `/me/messages/${emailId}`,
            method: "PATCH",
            data: { isRead: true },
          },
        });
      }

      return data;
    },
    enabled: !!connection?.is_active && !!emailId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      to,
      cc,
      subject,
      body,
      replyToId,
    }: {
      to: string[];
      cc?: string[];
      subject: string;
      body: string;
      replyToId?: string;
    }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Niet ingelogd");
      }

      const message = {
        message: {
          subject,
          body: {
            contentType: "HTML",
            content: body,
          },
          toRecipients: to.map((email) => ({
            emailAddress: { address: email },
          })),
          ccRecipients: cc?.map((email) => ({
            emailAddress: { address: email },
          })),
        },
        saveToSentItems: true,
      };

      let endpoint = "/me/sendMail";
      let requestData = message;

      // If replying, use the reply endpoint
      if (replyToId) {
        endpoint = `/me/messages/${replyToId}/reply`;
        requestData = {
          message: {
            toRecipients: to.map((email) => ({
              emailAddress: { address: email },
            })),
          },
          comment: body,
        } as any;
      }

      const { data, error } = await supabase.functions.invoke("microsoft-api", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: {
          endpoint,
          method: "POST",
          data: requestData,
        },
      });

      if (error) {
        throw new Error(error.message || "Kon email niet versturen");
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["microsoft-emails"] });
      toast.success("Email verzonden");
    },
    onError: (error: Error) => {
      toast.error("Fout bij verzenden", {
        description: error.message,
      });
    },
  });
}

export function useMarkEmailRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ emailId, isRead }: { emailId: string; isRead: boolean }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Niet ingelogd");
      }

      const { error } = await supabase.functions.invoke("microsoft-api", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: {
          endpoint: `/me/messages/${emailId}`,
          method: "PATCH",
          data: { isRead },
        },
      });

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["microsoft-emails"] });
    },
  });
}
