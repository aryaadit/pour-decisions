-- Add onboarding columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_seen_welcome boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step text DEFAULT 'welcome',
ADD COLUMN IF NOT EXISTS dismissed_onboarding_steps text[] DEFAULT '{}';