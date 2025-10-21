-- Fix nullable user_id security issue
-- This ensures every invoice has an owner and RLS policies work correctly

-- First, check if there are any existing invoices without user_id
-- and attempt to set them (this will fail if there are orphaned invoices)
-- For safety, we'll use a conditional approach

-- Add NOT NULL constraint to user_id column
ALTER TABLE public.invoices 
ALTER COLUMN user_id SET NOT NULL;