-- Allow managers to read auth events for users in the same filiale.
drop policy if exists "Managers read filiale auth events" on auth_events;

create policy "Managers read filiale auth events"
  on auth_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from users_profiles manager
      join users_profiles target
        on target.id = auth_events.user_id
      where manager.id = auth.uid()
        and manager.role = 'manager_filiale'
        and manager.filiale_id is not null
        and manager.filiale_id = target.filiale_id
    )
  );
