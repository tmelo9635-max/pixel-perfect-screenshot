-- Anotações dos leads
create table public.anotacoes_lead (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  autor_id uuid not null,
  texto text not null,
  criado_em timestamptz not null default now()
);

GRANT SELECT, INSERT ON public.anotacoes_lead TO authenticated;
GRANT ALL ON public.anotacoes_lead TO service_role;
ALTER TABLE public.anotacoes_lead ENABLE ROW LEVEL SECURITY;

create policy "ve anotacoes do lead"
  on public.anotacoes_lead for select to authenticated
  using (
    exists (
      select 1 from public.leads l
      where l.id = anotacoes_lead.lead_id
        and can_see_unidade(auth.uid(), l.rede_id, l.unidade_id)
    )
  );

create policy "autor grava anotacao"
  on public.anotacoes_lead for insert to authenticated
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from public.leads l
      where l.id = anotacoes_lead.lead_id
        and can_see_unidade(auth.uid(), l.rede_id, l.unidade_id)
    )
  );

-- Franqueados e admins podem editar os leads que veem (status, anotações etc.)
GRANT UPDATE (nome, telefone, cidade, interesse, status) ON public.leads TO authenticated;
GRANT INSERT ON public.leads TO authenticated;

create policy "edita lead visivel"
  on public.leads for update to authenticated
  using (can_see_unidade(auth.uid(), rede_id, unidade_id))
  with check (can_see_unidade(auth.uid(), rede_id, unidade_id));

create policy "grava lead da propria unidade"
  on public.leads for insert to authenticated
  with check (
    unidade_id is not null
    and can_see_unidade(auth.uid(), rede_id, unidade_id)
  );

-- Admin da rede cadastra e edita unidades
GRANT INSERT, UPDATE ON public.unidades TO authenticated;

create policy "admin cadastra unidade"
  on public.unidades for insert to authenticated
  with check (is_rede_admin(auth.uid(), rede_id));

create policy "admin edita unidade"
  on public.unidades for update to authenticated
  using (is_rede_admin(auth.uid(), rede_id))
  with check (is_rede_admin(auth.uid(), rede_id));

-- Admin cria novas redes
GRANT INSERT ON public.redes TO authenticated;

create policy "admin cria rede"
  on public.redes for insert to authenticated
  with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.role = 'admin'
    )
  );

-- Um admin de qualquer rede pode se tornar admin de uma rede nova (fluxo de criação).
-- Franqueados continuam presos às regras anteriores.
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
      and is_rede_admin(auth.uid(), rede_id)
    )
  );