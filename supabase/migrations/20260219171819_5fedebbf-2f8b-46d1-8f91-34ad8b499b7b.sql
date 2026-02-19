
INSERT INTO public.service_tickets (subject, priority, status, submitter_name, submitter_email, division_id, customer_id)
SELECT 'Lekkage onder spoelbak', 'hoog', 'wacht_op_onderdelen', 'Jan de Vries', 'jan@devries.nl', '22222222-2222-2222-2222-222222222222', c.id
FROM public.customers c WHERE c.last_name = 'de Vries' AND c.division_id = '22222222-2222-2222-2222-222222222222' LIMIT 1;

INSERT INTO public.service_tickets (subject, priority, status, submitter_name, submitter_email, division_id, customer_id)
SELECT 'Scharnier kast rechts kapot', 'normaal', 'wacht_op_onderdelen', 'Maria Bakker', 'maria@bakker.nl', '22222222-2222-2222-2222-222222222222', c.id
FROM public.customers c WHERE c.last_name = 'Bakker' AND c.division_id = '22222222-2222-2222-2222-222222222222' LIMIT 1;

INSERT INTO public.service_tickets (subject, priority, status, submitter_name, submitter_email, division_id, customer_id)
SELECT 'Werkblad beschadigd bij levering', 'urgent', 'wacht_op_onderdelen', 'Peter van den Berg', 'peter@vandenberg.nl', '22222222-2222-2222-2222-222222222222', c.id
FROM public.customers c WHERE c.last_name = 'van den Berg' AND c.division_id = '22222222-2222-2222-2222-222222222222' LIMIT 1;

INSERT INTO public.service_tickets (subject, priority, status, submitter_name, submitter_email, division_id)
VALUES ('Lade loopt niet soepel', 'laag', 'klaar_voor_planning', 'Sophie Mulder', 'sophie@mulder.nl', '22222222-2222-2222-2222-222222222222');
