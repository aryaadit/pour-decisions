-- Create table for custom drink types
CREATE TABLE public.custom_drink_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🍹',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_drink_types ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own custom drink types"
ON public.custom_drink_types
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom drink types"
ON public.custom_drink_types
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom drink types"
ON public.custom_drink_types
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_custom_drink_types_user_id ON public.custom_drink_types(user_id);