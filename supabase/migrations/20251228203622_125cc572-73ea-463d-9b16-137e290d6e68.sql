-- Add category column to bug_reports table
ALTER TABLE public.bug_reports 
ADD COLUMN category text NOT NULL DEFAULT 'general';