-- Suggestions de policies RLS à appliquer dans Supabase
-- Adapter les noms de colonnes et contraintes selon votre schéma.

-- Plan d'actions : admin siège et manager_filiale (sur sa filiale) peuvent insérer.
create policy "plan_actions_insert_admin_manager"
  on plan_actions
  for insert to authenticated
  using (
    exists (
      select 1 from users_profiles up
      where up.id = auth.uid()
      and (
        up.role = 'admin_siege'
        or (up.role = 'manager_filiale' and up.filiale_id = plan_actions.filiale_id)
      )
    )
  );

-- Visites clients
create policy "visites_clients_insert_admin_manager"
  on visites_clients
  for insert to authenticated
  using (
    exists (
      select 1 from users_profiles up
      where up.id = auth.uid()
      and (
        up.role = 'admin_siege'
        or (up.role = 'manager_filiale' and up.filiale_id = visites_clients.filiale_id)
      )
    )
  );

-- Opportunités
create policy "opportunites_insert_admin_manager"
  on opportunites
  for insert to authenticated
  using (
    exists (
      select 1 from users_profiles up
      where up.id = auth.uid()
      and (
        up.role = 'admin_siege'
        or (up.role = 'manager_filiale' and up.filiale_id = opportunites.filiale_id)
      )
    )
  );

-- Commandes clients
create policy "commandes_clients_insert_admin_manager"
  on commandes_clients
  for insert to authenticated
  using (
    exists (
      select 1 from users_profiles up
      where up.id = auth.uid()
      and (
        up.role = 'admin_siege'
        or (up.role = 'manager_filiale' and up.filiale_id = commandes_clients.filiale_id)
      )
    )
  );

-- Commandes fournisseurs
create policy "commandes_fournisseurs_insert_admin_manager"
  on commandes_fournisseurs
  for insert to authenticated
  using (
    exists (
      select 1 from users_profiles up
      where up.id = auth.uid()
      and (
        up.role = 'admin_siege'
        or (up.role = 'manager_filiale' and up.filiale_id = commandes_fournisseurs.filiale_id)
      )
    )
  );

-- Ventes
create policy "ventes_insert_admin_manager"
  on ventes
  for insert to authenticated
  using (
    exists (
      select 1 from users_profiles up
      where up.id = auth.uid()
      and (
        up.role = 'admin_siege'
        or (up.role = 'manager_filiale' and up.filiale_id = ventes.filiale_id)
      )
    )
  );

-- Vérifier les profils admin/manager (exécution manuelle côté SQL)
-- SELECT email, role, filiale_id FROM users_profiles WHERE role in ('admin_siege','manager_filiale');
