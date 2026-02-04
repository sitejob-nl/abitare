import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMicrosoftConnection } from "./useMicrosoftConnection";
import { MicrosoftEmail } from "./useMicrosoftMail";

export function useCustomerEmails(customerEmail: string | null | undefined) {
  const { data: connection } = useMicrosoftConnection();

  return useQuery({
    queryKey: ["customer-emails", customerEmail],
    queryFn: async (): Promise<MicrosoftEmail[]> => {
      if (!customerEmail) return [];

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Niet ingelogd");
      }

      // Use $search to find emails from/to this customer
      const searchQuery = encodeURIComponent(`"${customerEmail}"`);
      
      const { data, error } = await supabase.functions.invoke("microsoft-api", {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
        body: {
          endpoint: `/me/messages?$search=${searchQuery}&$top=50&$orderby=receivedDateTime desc&$select=id,subject,bodyPreview,from,toRecipients,receivedDateTime,isRead,hasAttachments,importance,flag,webLink`,
          method: "GET",
        },
      });

      if (error) {
        throw new Error(error.message || "Kon emails niet ophalen");
      }

      // Filter to only include emails where the customer email is in from OR to
      const emails = (data?.value || []) as MicrosoftEmail[];
      return emails.filter((email) => {
        const fromAddress = email.from?.emailAddress?.address?.toLowerCase();
        const toAddresses = email.toRecipients?.map((r) => r.emailAddress?.address?.toLowerCase()) || [];
        const customerEmailLower = customerEmail.toLowerCase();
        
        return fromAddress === customerEmailLower || toAddresses.includes(customerEmailLower);
      });
    },
    enabled: !!connection?.is_active && !!customerEmail,
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useUnreadCustomerEmailsCount(customerEmail: string | null | undefined) {
  const { data: emails } = useCustomerEmails(customerEmail);
  
  const unreadCount = emails?.filter((email) => !email.isRead).length || 0;
  return unreadCount;
}
