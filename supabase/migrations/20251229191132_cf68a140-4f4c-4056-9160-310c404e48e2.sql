-- Add is_favorite column to drinks table
ALTER TABLE public.drinks ADD COLUMN is_favorite boolean DEFAULT false;