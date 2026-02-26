
-- Enable realtime on all key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_lines;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_status_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_checklist_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_sections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_ticket_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_lines;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_sections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_mentions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_log;
