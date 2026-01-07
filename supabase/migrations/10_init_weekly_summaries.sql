-- Weekly summaries table
create table public.weekly_summaries (
  summary_id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade,
  week_start date not null,
  week_end date not null,
  summary_text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, week_start, week_end)
);

-- Index for faster lookups
create index idx_weekly_summaries_user_week on public.weekly_summaries(user_id, week_start, week_end);

-- Security policy: Users can read their own summaries
create policy "Users can read own weekly summaries"
on public.weekly_summaries for select
using (auth.uid() = user_id);

-- Security policy: Users can insert their own summaries
create policy "Users can insert own weekly summaries"
on public.weekly_summaries for insert
with check (auth.uid() = user_id);

-- Security policy: Users can update their own summaries
create policy "Users can update own weekly summaries"
on public.weekly_summaries for update
using (auth.uid() = user_id);

-- Enable RLS
alter table public.weekly_summaries enable row level security;

