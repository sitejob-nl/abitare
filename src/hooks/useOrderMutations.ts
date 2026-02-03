import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];
type PaymentStatus = Database["public"]["Enums"]["payment_status"];

interface UpdateOrderStatusParams {
  orderId: string;
  status: OrderStatus;
  notes?: string;
}

interface RegisterPaymentParams {
  orderId: string;
  amount: number;
  currentAmountPaid: number;
  totalInclVat: number;
}

interface UploadDocumentParams {
  orderId: string;
  file: File;
  documentType: string;
  title?: string;
  visibleToCustomer?: boolean;
  visibleToInstaller?: boolean;
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status, notes }: UpdateOrderStatusParams) => {
      // Get current order status for history
      const { data: currentOrder } = await supabase
        .from("orders")
        .select("status")
        .eq("id", orderId)
        .single();

      // Update order status
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Add to status history
      const { error: historyError } = await supabase
        .from("order_status_history")
        .insert({
          order_id: orderId,
          from_status: currentOrder?.status,
          to_status: status,
          notes,
        });

      if (historyError) throw historyError;

      return { orderId, status };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["order", data.orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useRegisterPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, amount, currentAmountPaid, totalInclVat }: RegisterPaymentParams) => {
      const newAmountPaid = currentAmountPaid + amount;
      
      // Determine payment status
      let paymentStatus: PaymentStatus = "open";
      if (newAmountPaid >= totalInclVat) {
        paymentStatus = "betaald";
      } else if (newAmountPaid > 0) {
        paymentStatus = "deels_betaald";
      }

      const { error } = await supabase
        .from("orders")
        .update({
          amount_paid: newAmountPaid,
          payment_status: paymentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (error) throw error;

      return { orderId, newAmountPaid, paymentStatus };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["order", data.orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useUploadOrderDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      file,
      documentType,
      title,
      visibleToCustomer = false,
      visibleToInstaller = false,
    }: UploadDocumentParams) => {
      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${orderId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("order-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { error: insertError } = await supabase
        .from("order_documents")
        .insert({
          order_id: orderId,
          document_type: documentType,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
          title: title || file.name,
          visible_to_customer: visibleToCustomer,
          visible_to_installer: visibleToInstaller,
        });

      if (insertError) throw insertError;

      return { orderId, fileName };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["order", data.orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-documents", data.orderId] });
    },
  });
}

export function useDeleteOrderDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, filePath, orderId }: { documentId: string; filePath: string; orderId: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("order-documents")
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete record
      const { error: deleteError } = await supabase
        .from("order_documents")
        .delete()
        .eq("id", documentId);

      if (deleteError) throw deleteError;

      return { orderId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["order", data.orderId] });
      queryClient.invalidateQueries({ queryKey: ["order-documents", data.orderId] });
    },
  });
}

interface AddNoteParams {
  orderId: string;
  content: string;
  noteType: string;
}

export function useAddOrderNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, content, noteType }: AddNoteParams) => {
      const { error } = await supabase
        .from("order_notes")
        .insert({
          order_id: orderId,
          content,
          note_type: noteType,
        });

      if (error) throw error;

      return { orderId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["order", data.orderId] });
    },
  });
}

export function useDeleteOrderNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, orderId }: { noteId: string; orderId: string }) => {
      const { error } = await supabase
        .from("order_notes")
        .delete()
        .eq("id", noteId);

      if (error) throw error;

      return { orderId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["order", data.orderId] });
    },
  });
}
