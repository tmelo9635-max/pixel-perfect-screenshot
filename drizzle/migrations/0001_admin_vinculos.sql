create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, email text not null default '');
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
insert into public.profiles (id, email) select id, coalesce(email,'') from auth.users on conflict do nothing;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, coalesce(new.email,'')) on conflict do nothing;
  if not exists (select 1 from public.user_roles) then
    insert into public.user_roles (user_id, role, rede_id) values (new.id, 'admin', '11111111-1111-1111-1111-111111111111');
  end if;
  return new;
end $$;

create or replace function public.shares_rede_as_admin(_admin uuid, _user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles a join user_roles b on a.rede_id=b.rede_id
    where a.user_id=_admin and a.role='admin' and b.user_id=_user) $$;

create or replace function public.find_user_by_email(_email text) returns uuid
language sql stable security definer set search_path = public as $$
  select p.id from profiles p
  where lower(p.email)=lower(trim(_email))
    and exists (select 1 from user_roles where user_id=auth.uid() and role='admin')
  limit 1 $$;
revoke execute on function public.find_user_by_email(text) from anon, public;
grant execute on function public.find_user_by_email(text) to authenticated;

create policy "own profile" on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_rede_as_admin(auth.uid(), id));

grant insert, delete on public.user_roles to authenticated;
create policy "admin sees rede roles" on public.user_roles for select to authenticated
  using (public.is_rede_admin(auth.uid(), rede_id));
create policy "admin links" on public.user_roles for insert to authenticated
  with check (
    public.is_rede_admin(auth.uid(), rede_id)
    and ((role='franqueado' and unidade_id is not null and exists (select 1 from public.unidades u where u.id=unidade_id and u.rede_id=user_roles.rede_id))
      or (role='admin' and unidade_id is null)));
create policy "admin unlinks" on public.user_roles for delete to authenticated
  using (public.is_rede_admin(auth.uid(), rede_id) and user_id <> auth.uid());