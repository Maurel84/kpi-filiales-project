-- Module-level permissions per user (managed by admin siege).
create table if not exists user_module_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users_profiles(id) on delete cascade,
  module_id text not null,
  enabled boolean default true,
  created_at timestamptz default now(),
  unique (user_id, module_id)
);

create index if not exists idx_user_module_permissions_user_id on user_module_permissions(user_id);
create index if not exists idx_user_module_permissions_module_id on user_module_permissions(module_id);

alter table user_module_permissions enable row level security;

drop policy if exists "Admins manage module permissions" on user_module_permissions;
drop policy if exists "Users read own module permissions" on user_module_permissions;

create policy "Admins manage module permissions"
  on user_module_permissions
  for all
  to authenticated
  using (
    exists (
      select 1
      from users_profiles up
      where up.id = auth.uid()
        and up.role = 'admin_siege'
    )
  )
  with check (
    exists (
      select 1
      from users_profiles up
      where up.id = auth.uid()
        and up.role = 'admin_siege'
    )
  );

create policy "Users read own module permissions"
  on user_module_permissions
  for select
  to authenticated
  using (user_id = auth.uid());
