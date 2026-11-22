create table if not exists public.user_progress (
    user_id uuid primary key references auth.users (id) on delete cascade,
    completed_lessons jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;

revoke all on table public.user_progress from anon, authenticated;
grant select, insert, update on table public.user_progress to authenticated;

drop policy if exists "Learners read their own progress" on public.user_progress;
create policy "Learners read their own progress"
    on public.user_progress for select to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "Learners save their own progress" on public.user_progress;
create policy "Learners save their own progress"
    on public.user_progress for insert to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "Learners update their own progress" on public.user_progress;
create policy "Learners update their own progress"
    on public.user_progress for update to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
