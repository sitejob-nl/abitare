import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type WorkReport = Database["public"]["Tables"]["work_reports"]["Row"];
type WorkReportInsert = Database["public"]["Tables"]["work_reports"]["Insert"];
type WorkReportUpdate = Database["public"]["Tables"]["work_reports"]["Update"];
type WorkReportPhoto = Database["public"]["Tables"]["work_report_photos"]["Row"];
type WorkReportTask = Database["public"]["Tables"]["work_report_tasks"]["Row"];

export function useWorkReports() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["work-reports", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("work_reports")
        .select(`
          *,
          order:orders(id, order_number),
          customer:customers(id, first_name, last_name, company_name)
        `)
        .eq("installer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

export function useWorkReport(id: string | undefined) {
  return useQuery({
    queryKey: ["work-report", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("work_reports")
        .select(`
          *,
          order:orders(id, order_number),
          customer:customers(id, first_name, last_name, company_name, phone, mobile, email),
          work_report_photos(*),
          work_report_tasks(*)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as WorkReport & {
        order: { id: string; order_number: number } | null;
        customer: { id: string; first_name: string | null; last_name: string; company_name: string | null; phone: string | null; mobile: string | null; email: string | null } | null;
        work_report_photos: WorkReportPhoto[];
        work_report_tasks: WorkReportTask[];
      };
    },
    enabled: !!id,
  });
}

// Get work report by order ID (for admin viewing)
export function useWorkReportByOrderAdmin(orderId: string | undefined) {
  return useQuery({
    queryKey: ["work-report-by-order-admin", orderId],
    queryFn: async () => {
      if (!orderId) return null;

      // Step 1: Get work report without installer join
      const { data: report, error } = await supabase
        .from("work_reports")
        .select(`
          *,
          order:orders(id, order_number),
          customer:customers(id, first_name, last_name, company_name, phone, mobile, email),
          work_report_photos(*),
          work_report_tasks(*)
        `)
        .eq("order_id", orderId)
        .maybeSingle();

      if (error) throw error;
      if (!report) return null;

      // Step 2: Get installer profile separately
      let installer: { id: string; full_name: string | null } | null = null;
      if (report.installer_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", report.installer_id)
          .maybeSingle();
        
        installer = profile;
      }

      return {
        ...report,
        installer,
      } as WorkReport & {
        order: { id: string; order_number: number } | null;
        customer: { id: string; first_name: string | null; last_name: string; company_name: string | null; phone: string | null; mobile: string | null; email: string | null } | null;
        installer: { id: string; full_name: string | null } | null;
        work_report_photos: WorkReportPhoto[];
        work_report_tasks: WorkReportTask[];
      };
    },
    enabled: !!orderId,
  });
}

export function useWorkReportByOrder(orderId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["work-report-by-order", orderId],
    queryFn: async () => {
      if (!orderId || !user?.id) return null;

      const { data, error } = await supabase
        .from("work_reports")
        .select("id, status")
        .eq("order_id", orderId)
        .eq("installer_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!orderId && !!user?.id,
  });
}

export function useCreateWorkReport() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Omit<WorkReportInsert, "installer_id">) => {
      if (!user?.id) throw new Error("Niet ingelogd");

      const { data: result, error } = await supabase
        .from("work_reports")
        .insert({
          ...data,
          installer_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-reports"] });
      queryClient.invalidateQueries({ queryKey: ["work-report-by-order"] });
      toast.success("Werkbon aangemaakt");
    },
    onError: (error) => {
      console.error("Error creating work report:", error);
      toast.error("Fout bij aanmaken werkbon");
    },
  });
}

export function useUpdateWorkReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: WorkReportUpdate }) => {
      const { data: result, error } = await supabase
        .from("work_reports")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["work-reports"] });
      queryClient.invalidateQueries({ queryKey: ["work-report", id] });
      toast.success("Werkbon opgeslagen");
    },
    onError: (error) => {
      console.error("Error updating work report:", error);
      toast.error("Fout bij opslaan werkbon");
    },
  });
}

export function useSubmitWorkReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: result, error } = await supabase
        .from("work_reports")
        .update({ status: "ingediend" as const })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["work-reports"] });
      queryClient.invalidateQueries({ queryKey: ["work-report", id] });
      toast.success("Werkbon ingediend");
    },
    onError: (error) => {
      console.error("Error submitting work report:", error);
      toast.error("Fout bij indienen werkbon");
    },
  });
}

// Photo management
export function useUploadWorkReportPhoto() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      workReportId,
      file,
      photoType,
      caption,
    }: {
      workReportId: string;
      file: File;
      photoType: "voor" | "tijdens" | "na" | "schade";
      caption?: string;
    }) => {
      if (!user?.id) throw new Error("Niet ingelogd");

      // Upload file to storage
      const filePath = `${user.id}/${workReportId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("work-report-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create photo record
      const { data, error } = await supabase
        .from("work_report_photos")
        .insert({
          work_report_id: workReportId,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          photo_type: photoType,
          caption,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { workReportId }) => {
      queryClient.invalidateQueries({ queryKey: ["work-report", workReportId] });
      toast.success("Foto geüpload");
    },
    onError: (error) => {
      console.error("Error uploading photo:", error);
      toast.error("Fout bij uploaden foto");
    },
  });
}

export function useDeleteWorkReportPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ photoId, filePath, workReportId }: { photoId: string; filePath: string; workReportId: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("work-report-photos")
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete record
      const { error } = await supabase
        .from("work_report_photos")
        .delete()
        .eq("id", photoId);

      if (error) throw error;
    },
    onSuccess: (_, { workReportId }) => {
      queryClient.invalidateQueries({ queryKey: ["work-report", workReportId] });
      toast.success("Foto verwijderd");
    },
    onError: (error) => {
      console.error("Error deleting photo:", error);
      toast.error("Fout bij verwijderen foto");
    },
  });
}

// Task management
export function useAddWorkReportTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workReportId, description }: { workReportId: string; description: string }) => {
      const { data, error } = await supabase
        .from("work_report_tasks")
        .insert({
          work_report_id: workReportId,
          description,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { workReportId }) => {
      queryClient.invalidateQueries({ queryKey: ["work-report", workReportId] });
    },
  });
}

export function useToggleWorkReportTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, isCompleted, workReportId }: { taskId: string; isCompleted: boolean; workReportId: string }) => {
      const { error } = await supabase
        .from("work_report_tasks")
        .update({ is_completed: isCompleted })
        .eq("id", taskId);

      if (error) throw error;
    },
    onSuccess: (_, { workReportId }) => {
      queryClient.invalidateQueries({ queryKey: ["work-report", workReportId] });
    },
  });
}
