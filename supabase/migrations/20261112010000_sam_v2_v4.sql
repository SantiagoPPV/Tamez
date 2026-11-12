-- =============================================================================
-- Sistemas a la medida · software interno · versiones 2, 3 y 4
--
-- v1 completa: puertas (solo un administrador las aprueba) y criterios de aceptación.
-- v2: documentos generados, con versión y lo que se envió congelado.
-- v3: servicio mensual (solicitudes en la bitácora de cambios, rutinas) y portal del
--     cliente: el cliente entra con su propio usuario y solo ve su proyecto, por medio
--     de funciones que devuelven lo que le corresponde (nunca costos, horas internas ni
--     márgenes).
-- v4: prospectos, propuestas, desgloses tipo y versiones de la tabla de horas base.
--
-- Requiere 20261112000000_sam_v1_nucleo.sql. Se puede aplicar dos veces sin error.
-- =============================================================================

-- ------------------------------------------------- columnas nuevas de v1 ----
alter table public.sam_projects add column if not exists facts jsonb not null default '{"fields": {}, "lists": {}}'::jsonb;
alter table public.sam_segments add column if not exists title text;
alter table public.sam_segments add column if not exists result text;
alter table public.sam_segments add column if not exists criterion text;
alter table public.sam_milestones add column if not exists result text;
alter table public.sam_milestones add column if not exists criterion text;
alter table public.sam_milestones add column if not exists client_comment text;
alter table public.sam_members add column if not exists position text;
alter table public.sam_members add column if not exists email text;
alter table public.sam_members add column if not exists phone text;
alter table public.sam_contacts add column if not exists role_key text;
alter table public.sam_contacts add column if not exists position text;
alter table public.sam_contacts add column if not exists email text;
alter table public.sam_contacts add column if not exists phone text;
alter table public.sam_contacts drop constraint if exists sam_contacts_role_key_check;
alter table public.sam_contacts add constraint sam_contacts_role_key_check
  check (role_key is null or role_key in ('decides', 'responsible', 'systems', 'billing', 'tester', 'other'));

-- Solicitudes de soporte: viven en la bitácora de cambios (D13), marcadas «servicio».
alter table public.sam_changes add column if not exists service boolean not null default false;
alter table public.sam_changes add column if not exists urgency text;
alter table public.sam_changes add column if not exists received_at timestamp;
alter table public.sam_changes add column if not exists first_response_at timestamp;
alter table public.sam_changes add column if not exists resolved_at timestamp;
alter table public.sam_changes drop constraint if exists sam_changes_urgency_check;
alter table public.sam_changes add constraint sam_changes_urgency_check check (urgency is null or urgency in ('urgent', 'normal'));
alter table public.sam_changes drop constraint if exists sam_changes_channel_check;
alter table public.sam_changes add constraint sam_changes_channel_check
  check (channel is null or channel in ('meeting', 'email', 'whatsapp', 'portal', 'phone'));

create or replace function public.sam_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.sam_staff s where s.user_id = (select auth.uid()) and s.is_admin);
$$;
revoke all on function public.sam_is_admin() from public;
grant execute on function public.sam_is_admin() to authenticated;

-- --------------------------------------------------------------- puertas ----
create table if not exists public.sam_gates (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.sam_projects (id) on delete cascade,
  gate           integer not null check (gate between 1 and 5),
  milestone_id   uuid references public.sam_milestones (id) on delete cascade,
  checklist      text[] not null default '{}',
  requested_on   date,
  approved_by_id uuid references public.sam_members (id) on delete set null,
  approved_on    date,
  notes          text not null default '',
  created_at     timestamptz not null default now(),
  constraint sam_gates_milestone_only_gate4 check ((gate = 4) = (milestone_id is not null))
);
create unique index if not exists sam_gates_unique
  on public.sam_gates (project_id, gate, coalesce(milestone_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists sam_gates_milestone_idx on public.sam_gates (milestone_id);
create index if not exists sam_gates_approver_idx on public.sam_gates (approved_by_id);

-- Las cinco puertas las aprueba Santiago: solo un administrador pone o quita la aprobación.
create or replace function public.sam_gates_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' and new.approved_on is not null)
     or (tg_op = 'UPDATE' and (new.approved_on is distinct from old.approved_on or new.approved_by_id is distinct from old.approved_by_id)) then
    if not public.sam_is_admin() then
      raise exception 'Solo un administrador (Santiago) aprueba las puertas' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists sam_gates_guard on public.sam_gates;
create trigger sam_gates_guard before insert or update on public.sam_gates for each row execute function public.sam_gates_guard();

-- --------------------------------------------- criterios de aceptación ----
create table if not exists public.sam_criteria (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.sam_projects (id) on delete cascade,
  milestone_id   uuid not null references public.sam_milestones (id) on delete cascade,
  code           text not null,
  deliverable    text not null default '',
  action         text not null default '',
  expected       text not null default '',
  result         text check (result is null or result in ('pass', 'fail')),
  obtained       text not null default '',
  evidence       text not null default '',
  classification text check (classification is null or classification in ('none', 'defect', 'minor_adjustment', 'scope_change')),
  note           text not null default '',
  created_at     timestamptz not null default now(),
  unique (project_id, code)
);
create index if not exists sam_criteria_milestone_idx on public.sam_criteria (milestone_id);

-- ------------------------------------------------------------ documentos ----
create table if not exists public.sam_documents (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sam_projects (id) on delete cascade,
  code       text not null check (code in ('D01','D02','D03','D04','D05','D06','D07','D08','D09','D10','D11','D12','D13','D14')),
  version    integer not null default 1 check (version >= 1),
  status     text not null default 'draft' check (status in ('draft', 'sent', 'signed')),
  context    jsonb not null default '{}'::jsonb,
  overrides  jsonb not null default '{"fields": {}, "lists": {}}'::jsonb,
  snapshot   jsonb,
  created_on date not null default current_date,
  sent_on    date,
  signed_on  date,
  notes      text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index if not exists sam_documents_project_idx on public.sam_documents (project_id, code);
comment on column public.sam_documents.snapshot is 'Lo que se envió al cliente, congelado: ya no cambia con los datos del proyecto.';

-- --------------------------------------------------- servicio mensual ----
create table if not exists public.sam_routines (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.sam_projects (id) on delete cascade,
  name          text not null,
  frequency     text not null check (frequency in ('continuous', 'daily', 'weekly', 'monthly', 'bimonthly', 'quarterly')),
  owner_id      uuid references public.sam_members (id) on delete set null,
  reviewer      text not null default '',
  evidence_hint text not null default '',
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists sam_routines_project_idx on public.sam_routines (project_id);
create index if not exists sam_routines_owner_idx on public.sam_routines (owner_id);

create table if not exists public.sam_routine_runs (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sam_projects (id) on delete cascade,
  routine_id uuid not null references public.sam_routines (id) on delete cascade,
  date       date not null,
  done       boolean not null default true,
  evidence   text not null default '',
  notes      text not null default '',
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid()
);
create index if not exists sam_routine_runs_routine_idx on public.sam_routine_runs (routine_id, date);
create index if not exists sam_routine_runs_project_idx on public.sam_routine_runs (project_id);

-- --------------------------------------------------- portal del cliente ----
create table if not exists public.sam_portal_access (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sam_projects (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  contact_id uuid references public.sam_contacts (id) on delete set null,
  email      text not null default '',
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);
create index if not exists sam_portal_access_user_idx on public.sam_portal_access (user_id);
create index if not exists sam_portal_access_contact_idx on public.sam_portal_access (contact_id);

-- ------------------------------------------------ preventa y aprendizaje ----
create table if not exists public.sam_prospects (
  id             uuid primary key default gen_random_uuid(),
  company        text not null,
  contact_name   text not null default '',
  contact_role   text not null default '',
  source         text not null default '',
  stage          text not null default 'qualify' check (stage in ('qualify', 'discovery', 'feasibility', 'proposal', 'won', 'lost')),
  problem        text not null default '',
  budget         text not null default '',
  decision_maker text not null default '',
  decision_date  date,
  next_step      text not null default '',
  next_step_date date,
  lost_reason    text not null default '',
  project_id     uuid references public.sam_projects (id) on delete set null,
  created_on     date not null default current_date,
  notes          text not null default '',
  created_at     timestamptz not null default now()
);
create index if not exists sam_prospects_project_idx on public.sam_prospects (project_id);

create table if not exists public.sam_proposals (
  id                 uuid primary key default gen_random_uuid(),
  prospect_id        uuid not null references public.sam_prospects (id) on delete cascade,
  name               text not null default '',
  variant            text not null default 'preliminar' check (variant in ('preliminar', 'definitiva')),
  version            integer not null default 1,
  date               date not null default current_date,
  valid_until        date,
  template_id        text not null default 'estandar-v1',
  size               text not null default 'medium' check (size in ('small', 'medium', 'large')),
  units              jsonb not null default '{}'::jsonb,
  row_overrides      jsonb not null default '{}'::jsonb,
  hourly_cost        numeric not null default 0,
  reserve_pct        numeric not null default 0.15,
  pool_pct           numeric not null default 0.08,
  direct_costs       numeric not null default 0,
  target_margin      numeric not null default 0.15,
  price              numeric,
  payments           jsonb not null default '[]'::jsonb,
  monthly_fee        numeric,
  monthly_pool_hours numeric not null default 8,
  status             text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected')),
  notes              text not null default '',
  created_at         timestamptz not null default now()
);
create index if not exists sam_proposals_prospect_idx on public.sam_proposals (prospect_id);

create table if not exists public.sam_wbs_templates (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  project_class text not null default '',
  description   text not null default '',
  rows          jsonb not null default '[]'::jsonb,
  created_on    date not null default current_date,
  created_at    timestamptz not null default now()
);

create table if not exists public.sam_base_hours (
  id          uuid primary key default gen_random_uuid(),
  version     text not null,
  date        date not null default current_date,
  approved_by text not null default '',
  base_table  jsonb not null,
  notes       text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists public.sam_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------- RLS ----
do $$
declare
  t text;
  editable text[] := array['sam_gates', 'sam_criteria', 'sam_routines', 'sam_portal_access', 'sam_prospects', 'sam_proposals',
                           'sam_wbs_templates', 'sam_settings'];
  logs text[] := array['sam_routine_runs', 'sam_base_hours'];
begin
  foreach t in array editable || logs || array['sam_documents'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.sam_is_staff()))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.sam_is_staff()))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.sam_is_staff())) with check ((select public.sam_is_staff()))', t || '_update', t);
  end loop;
  foreach t in array editable loop
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.sam_is_staff()))', t || '_delete', t);
  end loop;
  -- Rutinas hechas y versiones de horas base: no se borran (son registro).
  foreach t in array logs loop
    execute format('revoke delete on public.%I from authenticated', t);
  end loop;
end
$$;

-- Documentos: solo se borra un borrador; lo enviado queda como constancia.
drop policy if exists sam_documents_delete on public.sam_documents;
create policy sam_documents_delete on public.sam_documents
  for delete to authenticated using ((select public.sam_is_staff()) and status = 'draft');

-- ================================================ funciones del portal ====
-- El cliente no tiene permiso sobre ninguna tabla: todo pasa por estas funciones,
-- que revisan su acceso al proyecto y devuelven solo lo que le corresponde.

create or replace function public.sam_portal_contact(p_project uuid)
returns public.sam_portal_access
language sql
stable
security definer
set search_path = ''
as $$
  select a.* from public.sam_portal_access a where a.project_id = p_project and a.user_id = (select auth.uid()) limit 1;
$$;
revoke all on function public.sam_portal_contact(uuid) from public;

create or replace function public.sam_portal_projects()
returns table (id uuid, key text, name text, client text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.key, p.name, p.client
  from public.sam_projects p
  join public.sam_portal_access a on a.project_id = p.id
  where a.user_id = (select auth.uid())
  order by p.key;
$$;
revoke all on function public.sam_portal_projects() from public;
grant execute on function public.sam_portal_projects() to authenticated;

create or replace function public.sam_portal_data(p_project uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  acc public.sam_portal_access;
  result jsonb;
begin
  acc := public.sam_portal_contact(p_project);
  if acc.id is null then
    raise exception 'Sin acceso a este proyecto' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'project', (
      select jsonb_build_object(
        'id', p.id, 'key', p.key, 'name', p.name, 'client', p.client,
        'start_date', p.start_date, 'cutoff_date', p.cutoff_date, 'non_working_days', p.non_working_days,
        -- Solo los parámetros que el cliente conoce por contrato: nada de costos ni márgenes.
        'params', jsonb_strip_nulls(jsonb_build_object(
          'price', p.params -> 'price', 'clientReviewDays', p.params -> 'clientReviewDays',
          'fixVerifyDays', p.params -> 'fixVerifyDays', 'warrantyDays', p.params -> 'warrantyDays',
          'creditDays', p.params -> 'creditDays', 'monthlyFee', p.params -> 'monthlyFee',
          'serviceStart', p.params -> 'serviceStart', 'monthlyPoolHours', p.params -> 'monthlyPoolHours',
          'unusedHoursRule', p.params -> 'unusedHoursRule', 'urgentResponseHours', p.params -> 'urgentResponseHours',
          'urgentResponseOffHours', p.params -> 'urgentResponseOffHours', 'urgentSolutionHours', p.params -> 'urgentSolutionHours',
          'normalResponseDays', p.params -> 'normalResponseDays', 'normalSolutionDays', p.params -> 'normalSolutionDays'))
      ) from public.sam_projects p where p.id = p_project),
    'segments', coalesce((select jsonb_agg(to_jsonb(s) order by s.position) from public.sam_segments s where s.project_id = p_project), '[]'),
    'milestones', coalesce((select jsonb_agg(to_jsonb(m)) from public.sam_milestones m where m.project_id = p_project), '[]'),
    'criteria', coalesce((select jsonb_agg(to_jsonb(c) order by c.code) from public.sam_criteria c where c.project_id = p_project), '[]'),
    'contacts', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'role', c.role, 'role_key', c.role_key, 'position', c.position))
                          from public.sam_contacts c where c.project_id = p_project), '[]'),
    'changes', coalesce((select jsonb_agg(to_jsonb(c) - 'created_by' order by c.seq) from public.sam_changes c where c.project_id = p_project), '[]'),
    'pendings', coalesce((select jsonb_agg(to_jsonb(x) order by x.position) from public.sam_pendings x where x.project_id = p_project), '[]'),
    'documents', coalesce((select jsonb_agg(to_jsonb(d) - 'overrides' - 'created_by' order by d.code, d.version)
                           from public.sam_documents d
                           where d.project_id = p_project and d.status <> 'draft'
                             and d.code in ('D01','D02','D03','D04','D05','D06','D07','D08','D09')), '[]'),
    -- Horas de soporte: solo fecha, horas y folio, para la bolsa del mes.
    'work_logs', coalesce((select jsonb_agg(jsonb_build_object('id', w.id, 'seq', w.seq, 'date', w.date, 'hours', w.hours,
                                                                'related_folio', w.related_folio, 'mark', w.mark, 'hour_class', w.hour_class))
                           from public.sam_work_logs w
                           where w.project_id = p_project
                             and w.related_folio in (select 'C-' || case when c.seq < 10 then '0' || c.seq::text else c.seq::text end
                                                     from public.sam_changes c where c.project_id = p_project and c.service)), '[]'),
    'routines', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'frequency', r.frequency, 'active', r.active,
                                                               'reviewer', r.reviewer, 'evidence_hint', r.evidence_hint))
                          from public.sam_routines r where r.project_id = p_project), '[]'),
    'routine_runs', coalesce((select jsonb_agg(to_jsonb(x) - 'created_by') from public.sam_routine_runs x where x.project_id = p_project), '[]'),
    'me', jsonb_build_object('contact_id', acc.contact_id, 'email', acc.email,
                             'role_key', (select c.role_key from public.sam_contacts c where c.id = acc.contact_id))
  ) into result;
  return result;
end;
$$;
revoke all on function public.sam_portal_data(uuid) from public;
grant execute on function public.sam_portal_data(uuid) to authenticated;

-- Hoy en la hora del centro de México.
create or replace function public.sam_today_mx()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'America/Mexico_City')::date $$;

create or replace function public.sam_portal_request(p_project uuid, p_description text, p_service boolean, p_urgency text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.sam_portal_access;
  new_seq integer;
begin
  acc := public.sam_portal_contact(p_project);
  if acc.id is null then
    raise exception 'Sin acceso a este proyecto' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_description, ''))) < 3 then
    raise exception 'Describe qué necesitas' using errcode = '22023';
  end if;
  insert into public.sam_changes (project_id, seq, date, channel, requested_by_id, description, status, service, urgency, received_at)
  values (p_project, 0, public.sam_today_mx(), 'portal', acc.contact_id, trim(p_description), 'in_review',
          coalesce(p_service, false), case when p_urgency in ('urgent', 'normal') then p_urgency end,
          (now() at time zone 'America/Mexico_City'))
  returning seq into new_seq;
  return new_seq;
end;
$$;
revoke all on function public.sam_portal_request(uuid, text, boolean, text) from public;
grant execute on function public.sam_portal_request(uuid, text, boolean, text) to authenticated;

create or replace function public.sam_portal_accept_milestone(p_milestone uuid, p_rating integer, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.sam_milestones;
  acc public.sam_portal_access;
  role_key text;
begin
  select * into m from public.sam_milestones where id = p_milestone;
  if m.id is null then
    raise exception 'No existe ese hito' using errcode = '22023';
  end if;
  acc := public.sam_portal_contact(m.project_id);
  if acc.id is null then
    raise exception 'Sin acceso a este proyecto' using errcode = '42501';
  end if;
  -- El hito lo acepta el responsable del cliente o quien decide y paga.
  select k.role_key into role_key from public.sam_contacts k where k.id = acc.contact_id;
  if coalesce(role_key, '') not in ('responsible', 'decides') then
    raise exception 'El hito lo acepta el responsable del proyecto o quien decide y paga' using errcode = '42501';
  end if;
  if m.actual_delivery is null then
    raise exception 'El hito todavía no se entrega a pruebas' using errcode = '22023';
  end if;
  if m.acta_date is not null then
    raise exception 'El hito ya está aceptado' using errcode = '22023';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 10 then
    raise exception 'La calificación va de 1 a 10' using errcode = '22023';
  end if;
  update public.sam_milestones
     set acta_date = public.sam_today_mx(), client_rating = p_rating, client_comment = coalesce(p_comment, '')
   where id = p_milestone;
end;
$$;
revoke all on function public.sam_portal_accept_milestone(uuid, integer, text) from public;
grant execute on function public.sam_portal_accept_milestone(uuid, integer, text) to authenticated;

-- Un cambio de alcance lo aprueba quien decide y paga.
create or replace function public.sam_portal_decide_change(p_change uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.sam_changes;
  acc public.sam_portal_access;
  role_key text;
begin
  select * into c from public.sam_changes where id = p_change;
  if c.id is null then
    raise exception 'No existe esa solicitud' using errcode = '22023';
  end if;
  acc := public.sam_portal_contact(c.project_id);
  if acc.id is null then
    raise exception 'Sin acceso a este proyecto' using errcode = '42501';
  end if;
  -- Solo un cambio de alcance ya clasificado y abierto espera la decisión del cliente.
  if c.kind is distinct from 'scope_change' or c.status is null or c.status not in ('in_review', 'waiting_client') then
    raise exception 'Esta solicitud no espera una decisión' using errcode = '22023';
  end if;
  select k.role_key into role_key from public.sam_contacts k where k.id = acc.contact_id;
  if coalesce(role_key, '') <> 'decides' then
    raise exception 'Un cambio de alcance lo aprueba quien decide y paga' using errcode = '42501';
  end if;
  update public.sam_changes
     set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by_id = acc.contact_id,
         response_date = public.sam_today_mx()
   where id = p_change;
end;
$$;
revoke all on function public.sam_portal_decide_change(uuid, boolean) from public;
grant execute on function public.sam_portal_decide_change(uuid, boolean) to authenticated;
