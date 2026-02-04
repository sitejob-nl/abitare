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

export interface EmailAttachment {
  name: string;
  contentType: string;
  contentBytes: string; // base64 encoded
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
      queryClient.invalidateQueries({ queryKey: ["customer-emails"] });
      toast.success("Email verzonden");
    },
    onError: (error: Error) => {
      toast.error("Fout bij verzenden", {
        description: error.message,
      });
    },
  });
}

export function useSendEmailWithAttachments() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      to,
      cc,
      subject,
      body,
      attachments,
      replyToId,
    }: {
      to: string[];
      cc?: string[];
      subject: string;
      body: string;
      attachments?: EmailAttachment[];
      replyToId?: string;
    }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Niet ingelogd");
      }

      // Format attachments for Graph API
      const formattedAttachments = attachments?.map((att) => ({
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: att.name,
        contentType: att.contentType,
        contentBytes: att.contentBytes,
      }));

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
          attachments: formattedAttachments,
        },
        saveToSentItems: true,
      };

      let endpoint = "/me/sendMail";
      let requestData: any = message;

      // If replying with attachments, we need to create a draft, add attachments, then send
      if (replyToId && attachments && attachments.length > 0) {
        // Create reply draft
        const { data: draft, error: draftError } = await supabase.functions.invoke("microsoft-api", {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: {
            endpoint: `/me/messages/${replyToId}/createReply`,
            method: "POST",
            data: {},
          },
        });

        if (draftError || !draft?.id) {
          throw new Error(draftError?.message || "Kon reply niet aanmaken");
        }

        // Update draft with body and attachments
        const { error: updateError } = await supabase.functions.invoke("microsoft-api", {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: {
            endpoint: `/me/messages/${draft.id}`,
            method: "PATCH",
            data: {
              body: {
                contentType: "HTML",
                content: body,
              },
            },
          },
        });

        if (updateError) {
          throw new Error(updateError.message || "Kon bericht niet updaten");
        }

        // Add attachments one by one
        for (const att of formattedAttachments || []) {
          const { error: attError } = await supabase.functions.invoke("microsoft-api", {
            headers: {
              Authorization: `Bearer ${sessionData.session.access_token}`,
            },
            body: {
              endpoint: `/me/messages/${draft.id}/attachments`,
              method: "POST",
              data: att,
            },
          });

          if (attError) {
            throw new Error(attError.message || "Kon bijlage niet toevoegen");
          }
        }

        // Send the draft
        const { error: sendError } = await supabase.functions.invoke("microsoft-api", {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: {
            endpoint: `/me/messages/${draft.id}/send`,
            method: "POST",
            data: {},
          },
        });

        if (sendError) {
          throw new Error(sendError.message || "Kon email niet verzenden");
        }

        return { success: true };
      }

      // Simple send without reply
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
      queryClient.invalidateQueries({ queryKey: ["customer-emails"] });
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
