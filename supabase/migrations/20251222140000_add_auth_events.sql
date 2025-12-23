-- Audit authentication events (login/logout).
create table if not exists auth_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event text not null check (event in ('signed_in', 'signed_out')),
  user_agent text,
  ip_address text,
  created_at timestamptz default now()
);

create index if not exists idx_auth_events_user_id on auth_events(user_id);
create index if not exists idx_auth_events_created_at on auth_events(created_at);

alter table auth_events enable row level security;

drop policy if exists "Users read own auth events" on auth_events;
drop policy if exists "Admins read all auth events" on auth_events;
drop policy if exists "Users insert auth events" on auth_events;

create policy "Users read own auth events"
  on auth_events
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Admins read all auth events"
  on auth_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from users_profiles up
      where up.id = auth.uid()
        and up.role = 'admin_siege'
    )
  );

create policy "Users insert auth events"
  on auth_events
  for insert
  to authenticated
  with check (user_id = auth.uid());
