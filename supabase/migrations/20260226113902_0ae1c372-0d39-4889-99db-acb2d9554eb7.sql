
-- Populate hex_color for all stosa_colors
UPDATE public.stosa_colors SET hex_color = '#8B6914' WHERE code = 'noce_eucalipto';
UPDATE public.stosa_colors SET hex_color = '#D4C5A9' WHERE code = 'cachemere_opaco';
UPDATE public.stosa_colors SET hex_color = '#F5F5F0' WHERE code = 'bianco' AND color_type = 'front';
UPDATE public.stosa_colors SET hex_color = '#8C8C8C' WHERE code = 'grigio' AND color_type = 'front';
UPDATE public.stosa_colors SET hex_color = '#2C2C2C' WHERE code = 'nero' AND color_type = 'front';
UPDATE public.stosa_colors SET hex_color = '#D4A6A1' WHERE code = 'rose';
UPDATE public.stosa_colors SET hex_color = '#F5F5F0' WHERE code = 'bianco_corpus';
UPDATE public.stosa_colors SET hex_color = '#8C8C8C' WHERE code = 'grigio_corpus';
UPDATE public.stosa_colors SET hex_color = '#878681' WHERE code = 'titanio';
UPDATE public.stosa_colors SET hex_color = '#2C2C2C' WHERE code = 'nero_handle';
UPDATE public.stosa_colors SET hex_color = '#C0C0C0' WHERE code = 'inox';
UPDATE public.stosa_colors SET hex_color = '#878681' WHERE code = 'pvc_titanio';
UPDATE public.stosa_colors SET hex_color = '#2C2C2C' WHERE code = 'pvc_nero';
UPDATE public.stosa_colors SET hex_color = '#A8A9AD' WHERE code = 'pvc_alluminio';
