-- =============================================================================
-- Sistemas a la medida · software interno · versión 1 (núcleo)
--
-- Lo que hoy hace la hoja de control: proyecto y parámetros, tramos e hitos,
-- desglose con listas de calidad, bitácora de trabajo, decisiones, cambios,
-- riesgos, pendientes del cliente, cobranza, sombreros y cortes semanales.
-- Los cálculos (indicadores, semáforos, alertas) viven en el código
-- (src/domain/control.ts) y se prueban contra el caso ficticio CE-INV.
--
-- Todas las tablas llevan el prefijo sam_ para convivir con otros sistemas en
-- el mismo proyecto de Supabase.
--
-- Acceso: RLS en todas las tablas. Solo leen y escriben los usuarios
-- autenticados que están en sam_staff (los socios). Estar autenticado en el
-- mismo proyecto de Supabase por otro sistema NO da acceso.
--
-- Bitácoras (trabajo, decisiones, cambios, riesgos): ningún renglón se borra;
-- un error se corrige con un renglón nuevo que cita el folio anterior. Por eso
-- esas tablas no tienen política de borrado.
-- =============================================================================

-- gen_random_uuid() es nativo desde Postgres 13: no hace falta pgcrypto.

-- ------------------------------------------------------------- personal ----
create table if not exists public.sam_staff (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text not null check (char_length(trim(name)) between 1 and 80),
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);
comment on table public.sam_staff is
  'Usuarios del despacho con acceso al software interno. Se da de alta a mano (ver DEPLOY.md).';

create or replace function public.sam_is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.sam_staff s where s.user_id = (select auth.uid()));
$$;
revoke all on function public.sam_is_staff() from public;
grant execute on function public.sam_is_staff() to authenticated;

-- ------------------------------------------------------------- proyecto ----
create table if not exists public.sam_projects (
  id                 uuid primary key default gen_random_uuid(),
  key                text not null unique check (char_length(trim(key)) between 1 and 20),
  name               text not null default '',
  client             text not null default '',
  budget_version     text not null default 'v1',
  start_date         date,
  cutoff_date        date,
  baseline_hours     numeric check (baseline_hours is null or baseline_hours >= 0),
  baseline_signed_on date,
  non_working_days   date[] not null default '{}',
  params             jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
comment on column public.sam_projects.params is
  'Parámetros de negocio (bloque 1 de la hoja). Lo que falte toma el valor inicial del código (src/domain/defaults.ts).';

create table if not exists public.sam_segments (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sam_projects (id) on delete cascade,
  position   integer not null,
  name       text not null,
  created_at timestamptz not null default now(),
  unique (project_id, position) deferrable initially deferred
);

create table if not exists public.sam_members (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.sam_projects (id) on delete cascade,
  name         text not null,
  hourly_cost  numeric check (hourly_cost is null or hourly_cost >= 0),
  weekly_hours numeric check (weekly_hours is null or weekly_hours >= 0),
  user_id      uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create table if not exists public.sam_contacts (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sam_projects (id) on delete cascade,
  name       text not null,
  role       text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.sam_milestones (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.sam_projects (id) on delete cascade,
  segment_id        uuid not null references public.sam_segments (id) on delete cascade,
  key               text not null,
  title             text not null default '',
  payment_amount    numeric check (payment_amount is null or payment_amount >= 0),
  planned_delivery  date,
  forecast_delivery date,
  actual_delivery   date,
  acta_date         date,
  deviation_cause   text check (deviation_cause in ('ours', 'client')),
  client_rating     integer check (client_rating between 1 and 10),
  created_at        timestamptz not null default now(),
  unique (project_id, key)
);

-- ------------------------------------------------------------- desglose ----
create table if not exists public.sam_wbs_items (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.sam_projects (id) on delete cascade,
  position           integer not null default 0,
  row_class          text not null default 'activity' check (row_class in ('deliverable', 'activity', 'subactivity')),
  key                text not null check (char_length(trim(key)) between 1 and 30),
  name               text not null default '',
  segment_id         uuid references public.sam_segments (id) on delete set null,
  deliverable        text not null default '',
  block              integer check (block between 1 and 9),
  activity_type      text check (activity_type in ('screen', 'integration', 'database', 'report', 'data_load', 'release', 'document')),
  level              text check (level in ('simple', 'medium', 'complex', 'own')),
  owner_id           uuid references public.sam_members (id) on delete set null,
  estimated_hours    numeric check (estimated_hours is null or estimated_hours >= 0),
  planned_date       date,
  remaining_hours    numeric check (remaining_hours is null or remaining_hours >= 0),
  forecast_date      date,
  status             text check (status in ('todo', 'in_progress', 'in_review', 'done')),
  checklist_complete boolean,
  checklist          text[] not null default '{}',
  evidence           text not null default '',
  reviewer_id        uuid references public.sam_members (id) on delete set null,
  review_date        date,
  internal_defects   integer check (internal_defects is null or internal_defects >= 0),
  actual_end_date    date,
  correction_budget  boolean not null default false,
  change_folio       text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (project_id, key),
  -- Nadie aprueba su propio trabajo.
  constraint sam_wbs_reviewer_not_owner check (reviewer_id is null or owner_id is null or reviewer_id <> owner_id)
);

-- --------------------------------------------- bitácoras con folio (seq) ----
create table if not exists public.sam_work_logs (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.sam_projects (id) on delete cascade,
  seq           integer not null,
  date          date not null,
  person_id     uuid references public.sam_members (id) on delete set null,
  activity_key  text not null default '',
  description   text not null default '',
  hours         numeric check (hours is null or (hours >= 0 and hours <= 24)),
  hour_class    text check (hour_class in ('planned', 'correction', 'minor_adjustment', 'unplanned')),
  mark          text check (mark in ('training', 'warranty')),
  related_folio text,
  direct_cost   numeric check (direct_cost is null or direct_cost >= 0),
  evidence      text not null default '',
  blocker       text not null default '',
  created_at    timestamptz not null default now(),
  created_by    uuid default auth.uid(),
  unique (project_id, seq)
);

create table if not exists public.sam_decisions (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.sam_projects (id) on delete cascade,
  seq         integer not null,
  date        date not null,
  decision    text not null default '',
  decided_by  text not null default '',
  why         text not null default '',
  discarded   text not null default '',
  recorded_in text not null default '',
  created_at  timestamptz not null default now(),
  created_by  uuid default auth.uid(),
  unique (project_id, seq)
);

create table if not exists public.sam_changes (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.sam_projects (id) on delete cascade,
  seq                 integer not null,
  date                date not null,
  channel             text check (channel in ('meeting', 'email', 'whatsapp')),
  requested_by_id     uuid references public.sam_contacts (id) on delete set null,
  description         text not null default '',
  kind                text check (kind in ('defect', 'minor_adjustment', 'scope_change')),
  hours               numeric check (hours is null or hours >= 0),
  amount              numeric check (amount is null or amount >= 0),
  segment_id          uuid references public.sam_segments (id) on delete set null,
  business_days_moved integer,
  billing             text check (billing in ('yes', 'pool', 'defect')),
  status              text check (status in ('in_review', 'waiting_client', 'approved', 'rejected', 'in_baseline', 'done')),
  decided_by_id       uuid references public.sam_contacts (id) on delete set null,
  response_date       date,
  recorded_in         text not null default '',
  baseline_note       text not null default '',
  created_at          timestamptz not null default now(),
  created_by          uuid default auth.uid(),
  unique (project_id, seq)
);

create table if not exists public.sam_risks (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.sam_projects (id) on delete cascade,
  seq             integer not null,
  date            date not null,
  risk_class      text check (risk_class in ('risk', 'incident')),
  description     text not null default '',
  severity        text check (severity in ('high', 'medium', 'low')),
  depends_on      text check (depends_on in ('us', 'client')),
  commitment_date date,
  owner_id        uuid references public.sam_members (id) on delete set null,
  action          text not null default '',
  status          text check (status in ('open', 'in_progress', 'closed')),
  last_review     date,
  created_at      timestamptz not null default now(),
  created_by      uuid default auth.uid(),
  unique (project_id, seq)
);

-- ------------------------------------------- pendientes, cobranza, otros ----
create table if not exists public.sam_pendings (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.sam_projects (id) on delete cascade,
  position     integer not null default 0,
  description  text not null default '',
  contact_id   uuid references public.sam_contacts (id) on delete set null,
  requested_on date,
  due_on       date,
  received_on  date,
  blocks_key   text,
  created_at   timestamptz not null default now()
);

create table if not exists public.sam_invoices (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.sam_projects (id) on delete cascade,
  position       integer not null default 0,
  concept        text check (concept in ('initial', 'milestone', 'scope_change', 'monthly')),
  description    text not null default '',
  amount         numeric check (amount is null or amount >= 0),
  purchase_order text not null default '',
  invoice_date   date,
  paid_date      date,
  created_at     timestamptz not null default now()
);

create table if not exists public.sam_hats (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sam_projects (id) on delete cascade,
  hat        text not null check (hat in ('sales', 'project_lead', 'analysis', 'architecture', 'construction', 'quality', 'administration', 'support')),
  holder_id  uuid references public.sam_members (id) on delete set null,
  level      text not null default 'na' check (level in ('observes', 'full_review', 'gate_review', 'autonomous', 'na')),
  backup_id  uuid references public.sam_members (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, hat)
);

create table if not exists public.sam_snapshots (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.sam_projects (id) on delete cascade,
  week            integer not null check (week >= 0),
  cutoff          date not null,
  snapshot_values jsonb not null,
  snapshot_lights jsonb not null,
  created_at      timestamptz not null default now(),
  created_by      uuid default auth.uid(),
  unique (project_id, week)
);
comment on table public.sam_snapshots is
  'Corte semanal: lo que se reportó cada viernes. No cambia con las reestimaciones.';

-- ----------------------------------------------------------------- índices --
create index if not exists sam_segments_project_idx  on public.sam_segments (project_id);
create index if not exists sam_members_project_idx   on public.sam_members (project_id);
create index if not exists sam_contacts_project_idx  on public.sam_contacts (project_id);
create index if not exists sam_milestones_project_idx on public.sam_milestones (project_id);
create index if not exists sam_milestones_segment_idx on public.sam_milestones (segment_id);
create index if not exists sam_wbs_segment_idx       on public.sam_wbs_items (segment_id);
create index if not exists sam_wbs_owner_idx         on public.sam_wbs_items (owner_id);
create index if not exists sam_wbs_reviewer_idx      on public.sam_wbs_items (reviewer_id);
create index if not exists sam_work_logs_person_idx  on public.sam_work_logs (person_id);
create index if not exists sam_changes_requested_idx on public.sam_changes (requested_by_id);
create index if not exists sam_changes_decided_idx   on public.sam_changes (decided_by_id);
create index if not exists sam_changes_segment_idx   on public.sam_changes (segment_id);
create index if not exists sam_risks_owner_idx       on public.sam_risks (owner_id);
create index if not exists sam_pendings_project_idx  on public.sam_pendings (project_id);
create index if not exists sam_pendings_contact_idx  on public.sam_pendings (contact_id);
create index if not exists sam_invoices_project_idx  on public.sam_invoices (project_id);
create index if not exists sam_hats_holder_idx       on public.sam_hats (holder_id);
create index if not exists sam_hats_backup_idx       on public.sam_hats (backup_id);
create index if not exists sam_members_user_idx      on public.sam_members (user_id);

-- ---------------------------------------------------------------- folios ----
-- El folio (T-001, DE-01, C-01, R-01) sale del consecutivo por proyecto.
create or replace function public.sam_assign_seq()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  next_seq integer;
begin
  if new.seq is null or new.seq <= 0 then
    perform pg_advisory_xact_lock(hashtext(tg_table_name || new.project_id::text));
    execute format('select coalesce(max(seq), 0) + 1 from public.%I where project_id = $1', tg_table_name)
      into next_seq using new.project_id;
    new.seq := next_seq;
  end if;
  return new;
end;
$$;

create or replace function public.sam_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['sam_work_logs', 'sam_decisions', 'sam_changes', 'sam_risks'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_seq', t);
    execute format('create trigger %I before insert on public.%I for each row execute function public.sam_assign_seq()', t || '_seq', t);
  end loop;
  foreach t in array array['sam_projects', 'sam_wbs_items'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.sam_set_updated_at()', t || '_updated_at', t);
  end loop;
end
$$;

-- -------------------------------------------------------------------- RLS ----
alter table public.sam_staff enable row level security;
drop policy if exists sam_staff_read on public.sam_staff;
create policy sam_staff_read on public.sam_staff
  for select to authenticated using ((select public.sam_is_staff()));

do $$
declare
  t text;
  -- Tablas que se pueden borrar (catálogos y planeación).
  editable text[] := array['sam_projects', 'sam_segments', 'sam_members', 'sam_contacts', 'sam_milestones',
                           'sam_wbs_items', 'sam_pendings', 'sam_invoices', 'sam_hats', 'sam_snapshots'];
  -- Bitácoras: ningún renglón se borra.
  logs text[] := array['sam_work_logs', 'sam_decisions', 'sam_changes', 'sam_risks'];
begin
  foreach t in array editable || logs loop
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
  foreach t in array logs loop
    execute format('revoke delete on public.%I from authenticated', t);
  end loop;
end
$$;

revoke all on public.sam_staff from anon;
