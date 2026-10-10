drop policy "admin links" on public.user_roles;
create policy "admin links"
  on public.user_roles for insert to authenticated
  with check (
    (
      role = 'franqueado'::app_role
      and unidade_id is not null
      and is_rede_admin(auth.uid(), rede_id)
      and exists (
        select 1 from public.unidades u
        where u.id = user_roles.unidade_id and u.rede_id = user_roles.rede_id
      )
    )
    or
    (
      role = 'admin'::app_role
      and unidade_id is null
      and exists (
        select 1 from public.user_roles ur
        where ur.user_id = auth.uid() and ur.role = 'admin'
      )
    )
  );