-- Create avatars bucket for profile photos.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Policies for avatars bucket.
drop policy if exists "Avatar read access" on storage.objects;
drop policy if exists "Avatar insert access" on storage.objects;
drop policy if exists "Avatar update access" on storage.objects;
drop policy if exists "Avatar delete access" on storage.objects;

create policy "Avatar read access"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'avatars');

create policy "Avatar insert access"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatar update access"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatar delete access"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
