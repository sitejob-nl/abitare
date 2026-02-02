-- Add configuration columns to quote_sections
ALTER TABLE public.quote_sections
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS front_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS front_color VARCHAR(100),
ADD COLUMN IF NOT EXISTS plinth_color VARCHAR(100),
ADD COLUMN IF NOT EXISTS corpus_color VARCHAR(100),
ADD COLUMN IF NOT EXISTS hinge_color VARCHAR(100),
ADD COLUMN IF NOT EXISTS drawer_color VARCHAR(100),
ADD COLUMN IF NOT EXISTS handle_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS column_height_mm INTEGER,
ADD COLUMN IF NOT EXISTS countertop_height_mm INTEGER,
ADD COLUMN IF NOT EXISTS countertop_thickness_mm INTEGER,
ADD COLUMN IF NOT EXISTS workbench_material VARCHAR(255),
ADD COLUMN IF NOT EXISTS workbench_edge VARCHAR(50),
ADD COLUMN IF NOT EXISTS workbench_color VARCHAR(255),
ADD COLUMN IF NOT EXISTS configuration JSONB DEFAULT '{}';

-- Add dimension and sub-line columns to quote_lines
ALTER TABLE public.quote_lines
ADD COLUMN IF NOT EXISTS height_mm INTEGER,
ADD COLUMN IF NOT EXISTS width_mm INTEGER,
ADD COLUMN IF NOT EXISTS parent_line_id UUID REFERENCES public.quote_lines(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS sub_line_number VARCHAR(10),
ADD COLUMN IF NOT EXISTS extra_description TEXT;

-- Create index for parent line lookups
CREATE INDEX IF NOT EXISTS idx_quote_lines_parent_line_id ON public.quote_lines(parent_line_id);