-- Add UPDATE policy for custom_drink_types table
CREATE POLICY "Users can update their own custom drink types"
ON public.custom_drink_types
FOR UPDATE
USING (auth.uid() = user_id);