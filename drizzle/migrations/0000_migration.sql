create type public.app_role as enum ('admin', 'franqueado');

create table public.redes (id uuid primary key default gen_random_uuid(), nome text not null, criado_em timestamptz not null default now());
create table public.unidades (id uuid primary key default gen_random_uuid(), rede_id uuid not null references public.redes(id) on delete cascade, nome text not null, cidade text not null default '', estado text not null default '');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  rede_id uuid not null references public.redes(id) on delete cascade,
  unidade_id uuid references public.unidades(id) on delete cascade,
  unique (user_id, role, rede_id)
);
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  rede_id uuid not null references public.redes(id) on delete cascade,
  unidade_id uuid not null references public.unidades(id) on delete cascade,
  nome text not null, telefone text not null default '', cidade text not null default '',
  interesse text not null default '', status text not null default 'Novo',
  criado_em timestamptz not null default now()
);

grant select on public.redes, public.unidades, public.user_roles, public.leads to authenticated;
grant all on public.redes, public.unidades, public.user_roles, public.leads to service_role;

alter table public.redes enable row level security;
alter table public.unidades enable row level security;
alter table public.user_roles enable row level security;
alter table public.leads enable row level security;

create or replace function public.is_rede_admin(_uid uuid, _rede uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id=_uid and rede_id=_rede and role='admin') $$;
create or replace function public.can_see_unidade(_uid uuid, _rede uuid, _unidade uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id=_uid and rede_id=_rede
    and (role='admin' or (role='franqueado' and unidade_id=_unidade))) $$;
create or replace function public.is_rede_member(_uid uuid, _rede uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id=_uid and rede_id=_rede) $$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "member redes" on public.redes for select to authenticated using (public.is_rede_member(auth.uid(), id));
create policy "visible unidades" on public.unidades for select to authenticated using (public.can_see_unidade(auth.uid(), rede_id, id));
create policy "visible leads" on public.leads for select to authenticated using (public.can_see_unidade(auth.uid(), rede_id, unidade_id));

-- Demo data
insert into public.redes (id, nome) values ('11111111-1111-1111-1111-111111111111', 'Rede Demo');
insert into public.unidades (id, rede_id, nome, cidade, estado) values
 ('22222222-2222-2222-2222-222222222221','11111111-1111-1111-1111-111111111111','Unidade Centro','São Paulo','SP'),
 ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','Unidade Savassi','Belo Horizonte','MG'),
 ('22222222-2222-2222-2222-222222222223','11111111-1111-1111-1111-111111111111','Unidade Batel','Curitiba','PR');
insert into public.leads (rede_id, unidade_id, nome, telefone, cidade, interesse, status) values
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222221','Mariana Souza','(11) 98888-1111','São Paulo','Plano anual','Novo'),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222221','Carlos Lima','(11) 97777-2222','Guarulhos','Plano mensal','Em contato'),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Fernanda Rocha','(31) 96666-3333','Belo Horizonte','Avaliação','Visita agendada'),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','João Pereira','(31) 95555-4444','Contagem','Plano anual','Proposta enviada'),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222223','Ana Martins','(41) 94444-5555','Curitiba','Plano família','Sem resposta'),
 ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222223','Rafael Costa','(41) 93333-6666','São José dos Pinhais','Plano mensal','Novo');

-- First user becomes admin of the demo network
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles) then
    insert into public.user_roles (user_id, role, rede_id) values (new.id, 'admin', '11111111-1111-1111-1111-111111111111');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();