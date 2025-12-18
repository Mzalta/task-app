-- Add priority column to tasks table
alter table public.tasks
  add column priority text check (priority in ('Low', 'Medium', 'High')) default 'Medium';

-- Backfill existing tasks with default priority
update public.tasks
  set priority = 'Medium'
  where priority is null;

-- Make priority not null after backfill
alter table public.tasks
  alter column priority set not null;

