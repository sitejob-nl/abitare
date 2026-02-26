
ALTER TABLE public.quotes
  ADD COLUMN show_line_prices boolean NOT NULL DEFAULT true,
  ADD COLUMN show_article_codes boolean NOT NULL DEFAULT true;
