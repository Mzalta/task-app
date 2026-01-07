-- Add estimated_minutes column to tasks table
alter table public.tasks
  add column estimated_minutes integer;

