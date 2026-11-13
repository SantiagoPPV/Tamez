-- =============================================================================
-- Sistemas a la medida · software interno · CRM vinculado a operaciones
--
-- Estados del prospecto (inicial, factible, confirmado, cliente, perdido) con los pasos
-- del proceso de consultoría; expediente del proyecto que nace al aprobar la puerta 1
-- y pasa a Operaciones al cobrar el pago inicial; etapas del cliente; cobranza con CFDI;
-- archivos en Storage; firma electrónica simple; ligas para compartir documentos; avisos
-- para los socios; trabajos de IA; y acceso al portal con el correo del cliente.
--
-- Requiere las migraciones 20261112000000 y 20261112010000. Se puede aplicar dos veces.
-- =============================================================================

-- ------------------------------------------------------------- prospectos ----
alter table public.sam_prospects drop constraint if exists sam_prospects_stage_check;
update public.sam_prospects
   set stage = case stage when 'qualify' then 'initial' when 'discovery' then 'initial' when 'feasibility' then 'initial'
                          when 'proposal' then 'feasible' when 'won' then 'client' else stage end
 where stage in ('qualify', 'discovery', 'feasibility', 'proposal', 'won');
alter table public.sam_prospects alter column stage set default 'initial';
alter table public.sam_prospects add constraint sam_prospects_stage_check
  check (stage in ('initial', 'feasible', 'confirmed', 'client', 'lost'));
alter table public.sam_prospects add column if not exists contact_email text not null default '';
alter table public.sam_prospects add column if not exists contact_phone text not null default '';
alter table public.sam_prospects add column if not exists industry text not null default '';
alter table public.sam_prospects add column if not exists company_employees integer check (company_employees is null or company_employees >= 0);
alter table public.sam_prospects add column if not exists project_users integer check (project_users is null or project_users >= 0);
alter table public.sam_prospects add column if not exists decision_maker_role text not null default '';
alter table public.sam_prospects add column if not exists project_key text not null default '';
alter table public.sam_prospects add column if not exists discovery jsonb not null default '{}'::jsonb;
alter table public.sam_prospects add column if not exists feasibility jsonb not null default '{}'::jsonb;
alter table public.sam_prospects add column if not exists sale jsonb not null default '{}'::jsonb;
alter table public.sam_prospects add column if not exists follow_ups jsonb not null default '[]'::jsonb;
alter table public.sam_prospects add column if not exists lost jsonb;
alter table public.sam_prospects add column if not exists gate1 jsonb not null default '{}'::jsonb;

-- La puerta 1 la aprueba Santiago; sin ella, el prospecto no pasa a confirmado.
create or replace function public.sam_prospects_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' and coalesce(new.gate1 ->> 'approvedOn', '') <> '')
     or (tg_op = 'UPDATE' and coalesce(new.gate1 ->> 'approvedOn', '') is distinct from coalesce(old.gate1 ->> 'approvedOn', '')) then
    if not public.sam_is_admin() then
      raise exception 'Solo un administrador (Santiago) aprueba la puerta 1' using errcode = '42501';
    end if;
  end if;
  if new.stage in ('confirmed', 'client') and coalesce(new.gate1 ->> 'approvedOn', '') = '' and new.project_id is null then
    raise exception 'El prospecto se confirma al aprobar la puerta 1' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists sam_prospects_guard on public.sam_prospects;
create trigger sam_prospects_guard before insert or update on public.sam_prospects for each row execute function public.sam_prospects_guard();

-- ------------------------------------------------------------- propuestas ----
alter table public.sam_proposals add column if not exists content jsonb not null default '{}'::jsonb;
alter table public.sam_proposals add column if not exists validation jsonb not null default '{}'::jsonb;

-- Ninguna propuesta sale sin la validación de dirección general (un administrador).
create or replace function public.sam_proposals_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Validar la pone un administrador; quitarla (porque la propuesta cambió) cualquier socio.
  if coalesce(new.validation ->> 'approvedOn', '') <> ''
     and (tg_op = 'INSERT' or coalesce(new.validation ->> 'approvedOn', '') is distinct from coalesce(old.validation ->> 'approvedOn', '')) then
    if not public.sam_is_admin() then
      raise exception 'Solo dirección general (un administrador) valida la propuesta' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists sam_proposals_guard on public.sam_proposals;
create trigger sam_proposals_guard before insert or update on public.sam_proposals for each row execute function public.sam_proposals_guard();

-- --------------------------------------------- proyecto: etapa y cobranza ----
alter table public.sam_projects add column if not exists stage text;
alter table public.sam_projects drop constraint if exists sam_projects_stage_check;
alter table public.sam_projects add constraint sam_projects_stage_check
  check (stage is null or stage in ('confirmed', 'start', 'planning', 'execution', 'closing', 'service', 'closed', 'cancelled'));
alter table public.sam_projects add column if not exists fiscal jsonb;
alter table public.sam_projects add column if not exists closing jsonb;
alter table public.sam_projects add column if not exists process jsonb not null default '{}'::jsonb;
alter table public.sam_projects add column if not exists prospect_id uuid references public.sam_prospects (id) on delete set null;
create index if not exists sam_projects_prospect_idx on public.sam_projects (prospect_id);

alter table public.sam_invoices add column if not exists cfdi jsonb;
alter table public.sam_invoices add column if not exists payment jsonb;

-- ----------------------------------------- documentos: formatos y firmas ----
alter table public.sam_documents drop constraint if exists sam_documents_code_check;
alter table public.sam_documents add constraint sam_documents_code_check
  check (code in ('D01','D02','D03','D04','D05','D06','D07','D08','D09','D10','D11','D12','D13','D14','D15','D16','D17','D18'));
alter table public.sam_documents add column if not exists signers jsonb not null default '[]'::jsonb;

create table if not exists public.sam_signatures (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.sam_projects (id) on delete cascade,
  document_id      uuid not null references public.sam_documents (id) on delete cascade,
  document_version integer not null,
  document_hash    text not null,
  signer_id        text not null,
  signer_name      text not null,
  signer_email     text not null default '',
  signer_role      text not null default '',
  kind             text not null check (kind in ('client', 'firm')),
  method           text not null check (method in ('portal', 'staff')),
  drawing          text,
  user_agent       text not null default '',
  user_id          uuid default auth.uid(),
  signed_at        timestamptz not null default now(),
  unique (document_id, document_version, signer_id)
);
create index if not exists sam_signatures_project_idx on public.sam_signatures (project_id);

-- Lo firmado no cambia: la huella de cada firma corresponde a esa versión.
create or replace function public.sam_documents_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.snapshot is distinct from old.snapshot
     and exists (select 1 from public.sam_signatures s where s.document_id = old.id and s.document_version = old.version) then
    raise exception 'El documento ya tiene firmas: una corrección es una versión nueva' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists sam_documents_guard on public.sam_documents;
create trigger sam_documents_guard before update on public.sam_documents for each row execute function public.sam_documents_guard();

-- ------------------------------------------------------------- archivos ----
create table if not exists public.sam_files (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid references public.sam_projects (id) on delete cascade,
  prospect_id    uuid references public.sam_prospects (id) on delete cascade,
  kind           text not null default 'other'
                 check (kind in ('audio', 'acta', 'nda', 'vendor', 'purchase_order', 'invoice_pdf', 'invoice_xml', 'payment_proof', 'closing', 'other')),
  name           text not null,
  mime           text not null default '',
  size           bigint not null default 0,
  path           text not null unique,
  client_visible boolean not null default false,
  uploaded_on    date not null default current_date,
  notes          text not null default '',
  created_by     uuid default auth.uid(),
  created_at     timestamptz not null default now()
);
create index if not exists sam_files_project_idx on public.sam_files (project_id);
create index if not exists sam_files_prospect_idx on public.sam_files (prospect_id);

-- ------------------------------------------------- ligas para compartir ----
create table if not exists public.sam_shares (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique check (char_length(token) >= 32),
  project_id  uuid references public.sam_projects (id) on delete cascade,
  document_id uuid references public.sam_documents (id) on delete cascade,
  proposal_id uuid references public.sam_proposals (id) on delete cascade,
  code        text not null,
  title       text not null default '',
  snapshot    jsonb not null,
  signers     jsonb not null default '[]'::jsonb,
  created_on  date not null default current_date,
  expires_on  date not null,
  revoked     boolean not null default false,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now()
);
create index if not exists sam_shares_document_idx on public.sam_shares (document_id);

-- ------------------------------------------------- avisos y trabajos IA ----
create table if not exists public.sam_notifications (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null default 'other' check (kind in ('new_client', 'validation', 'gate', 'signature', 'payment', 'other')),
  title       text not null,
  body        text not null default '',
  link        text not null default '',
  project_id  uuid references public.sam_projects (id) on delete cascade,
  prospect_id uuid references public.sam_prospects (id) on delete cascade,
  read_by     uuid[] not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists sam_notifications_created_idx on public.sam_notifications (created_at desc);

create table if not exists public.sam_ai_jobs (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null default 'discovery_summary' check (kind in ('discovery_summary')),
  prospect_id uuid references public.sam_prospects (id) on delete cascade,
  status      text not null default 'queued' check (status in ('queued', 'running', 'done', 'error')),
  input       jsonb not null default '{}'::jsonb,
  result      jsonb,
  error       text not null default '',
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists sam_ai_jobs_prospect_idx on public.sam_ai_jobs (prospect_id);

-- --------------------------------------------- portal: acceso por correo ----
alter table public.sam_portal_access alter column user_id drop not null;
create unique index if not exists sam_portal_access_email_idx on public.sam_portal_access (project_id, lower(email)) where email <> '';

-- -------------------------------------------------------------------- RLS ----
do $$
declare
  t text;
begin
  foreach t in array array['sam_files', 'sam_shares', 'sam_notifications', 'sam_ai_jobs', 'sam_signatures'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for select to authenticated using ((select public.sam_is_staff()))', t || '_select', t);
  end loop;
  foreach t in array array['sam_files', 'sam_shares', 'sam_notifications', 'sam_ai_jobs'] loop
    execute format('create policy %I on public.%I for insert to authenticated with check ((select public.sam_is_staff()))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select public.sam_is_staff())) with check ((select public.sam_is_staff()))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using ((select public.sam_is_staff()))', t || '_delete', t);
  end loop;
end
$$;
-- Las firmas solo se crean con las funciones de firma y nunca se editan ni se borran.
revoke insert, update, delete on public.sam_signatures from authenticated;

-- ============================================================ funciones ====
-- Correo verificado del usuario en sesión (el acceso al portal se da con el correo).
create or replace function public.sam_my_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email) from auth.users u where u.id = (select auth.uid()) and u.email_confirmed_at is not null;
$$;
revoke all on function public.sam_my_email() from public;

create or replace function public.sam_portal_contact(p_project uuid)
returns public.sam_portal_access
language sql
stable
security definer
set search_path = ''
as $$
  select a.* from public.sam_portal_access a
   where a.project_id = p_project
     and (a.user_id = (select auth.uid()) or (a.email <> '' and lower(a.email) = public.sam_my_email()))
   limit 1;
$$;
revoke all on function public.sam_portal_contact(uuid) from public;

create or replace function public.sam_portal_projects()
returns table (id uuid, key text, name text, client text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct p.id, p.key, p.name, p.client
  from public.sam_projects p
  join public.sam_portal_access a on a.project_id = p.id
  where a.user_id = (select auth.uid()) or (a.email <> '' and lower(a.email) = public.sam_my_email())
  order by p.key;
$$;
revoke all on function public.sam_portal_projects() from public;
grant execute on function public.sam_portal_projects() to authenticated;

-- Lo que ve el cliente: además de lo de la versión 3, los documentos por firmar con sus
-- firmantes, las firmas y los archivos que se le compartieron.
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
        'id', p.id, 'key', p.key, 'name', p.name, 'client', p.client, 'stage', p.stage,
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
                             and d.code in ('D01','D02','D03','D04','D05','D06','D07','D08','D09','D15','D17','D18')), '[]'),
    'signatures', coalesce((select jsonb_agg(to_jsonb(g) - 'user_id' - 'user_agent')
                            from public.sam_signatures g
                            join public.sam_documents d on d.id = g.document_id
                            where g.project_id = p_project and d.code in ('D01','D02','D03','D04','D05','D06','D07','D08','D09','D15','D17','D18')), '[]'),
    'files', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'kind', f.kind, 'mime', f.mime, 'size', f.size,
                                                            'path', f.path, 'uploaded_on', f.uploaded_on))
                       from public.sam_files f where f.project_id = p_project and f.client_visible), '[]'),
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
    'me', jsonb_build_object('contact_id', acc.contact_id, 'email', coalesce(nullif(acc.email, ''), public.sam_my_email(), ''),
                             'role_key', (select c.role_key from public.sam_contacts c where c.id = acc.contact_id))
  ) into result;
  return result;
end;
$$;
revoke all on function public.sam_portal_data(uuid) from public;
grant execute on function public.sam_portal_data(uuid) to authenticated;

-- Marca firmado el documento cuando ya firmaron todos sus firmantes.
create or replace function public.sam_complete_signing(p_document uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.sam_documents;
  pending integer;
begin
  select * into d from public.sam_documents where id = p_document;
  if d.id is null or jsonb_array_length(d.signers) = 0 then
    return;
  end if;
  select count(*) into pending
    from jsonb_array_elements(d.signers) e(value)
   where not exists (select 1 from public.sam_signatures s
                      where s.document_id = d.id and s.document_version = d.version and s.signer_id = e.value ->> 'id');
  if pending = 0 then
    update public.sam_documents set status = 'signed', signed_on = public.sam_today_mx() where id = d.id;
  end if;
end;
$$;
revoke all on function public.sam_complete_signing(uuid) from public;

-- Huella del documento enviado: SHA-256 de lo congelado al enviarlo.
create or replace function public.sam_document_hash(p_document uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select encode(sha256(convert_to(d.snapshot::text, 'UTF8')), 'hex') from public.sam_documents d where d.id = p_document;
$$;
revoke all on function public.sam_document_hash(uuid) from public;
grant execute on function public.sam_document_hash(uuid) to authenticated;

-- Firma del despacho (un socio, con su sesión).
create or replace function public.sam_sign_document(p_document uuid, p_signer text, p_name text, p_drawing text, p_user_agent text)
returns public.sam_signatures
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.sam_documents;
  s jsonb;
  sig public.sam_signatures;
begin
  if not public.sam_is_staff() then
    raise exception 'Sin acceso' using errcode = '42501';
  end if;
  select * into d from public.sam_documents where id = p_document;
  if d.id is null then
    raise exception 'No existe ese documento' using errcode = '22023';
  end if;
  if d.status <> 'sent' or d.snapshot is null then
    raise exception 'El documento todavía no se envía para firma' using errcode = '22023';
  end if;
  select e.value into s from jsonb_array_elements(d.signers) e(value) where e.value ->> 'id' = p_signer;
  if s is null or s ->> 'kind' <> 'firm' then
    raise exception 'Ese firmante no firma por el despacho' using errcode = '22023';
  end if;
  -- Si el firmante tiene correo, firma con su propio usuario.
  if coalesce(s ->> 'email', '') <> ''
     and lower(s ->> 'email') <> coalesce((select lower(u.email) from auth.users u where u.id = (select auth.uid())), '') then
    raise exception 'Esta firma le corresponde a %: entra con su usuario', s ->> 'name' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 3 then
    raise exception 'Escribe tu nombre completo para firmar' using errcode = '22023';
  end if;
  insert into public.sam_signatures (project_id, document_id, document_version, document_hash, signer_id, signer_name, signer_email,
                                     signer_role, kind, method, drawing, user_agent)
  values (d.project_id, d.id, d.version, public.sam_document_hash(d.id), p_signer, trim(p_name),
          coalesce((select lower(u.email) from auth.users u where u.id = (select auth.uid())), ''),
          coalesce(s ->> 'role', ''), 'firm', 'staff', left(p_drawing, 200000), left(coalesce(p_user_agent, ''), 300))
  returning * into sig;
  perform public.sam_complete_signing(d.id);
  return sig;
end;
$$;
revoke all on function public.sam_sign_document(uuid, text, text, text, text) from public;
grant execute on function public.sam_sign_document(uuid, text, text, text, text) to authenticated;

-- Firma del cliente en el portal: con su correo verificado, sobre la versión enviada.
create or replace function public.sam_portal_sign(p_document uuid, p_signer text, p_name text, p_drawing text, p_user_agent text)
returns public.sam_signatures
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.sam_documents;
  acc public.sam_portal_access;
  s jsonb;
  me text;
  sig public.sam_signatures;
begin
  select * into d from public.sam_documents where id = p_document;
  if d.id is null then
    raise exception 'No existe ese documento' using errcode = '22023';
  end if;
  acc := public.sam_portal_contact(d.project_id);
  if acc.id is null then
    raise exception 'Sin acceso a este proyecto' using errcode = '42501';
  end if;
  if d.status <> 'sent' or d.snapshot is null or d.code not in ('D01','D02','D03','D04','D05','D07','D08','D15','D17','D18') then
    raise exception 'Este documento no espera firma' using errcode = '22023';
  end if;
  me := public.sam_my_email();
  select e.value into s from jsonb_array_elements(d.signers) e(value) where e.value ->> 'id' = p_signer;
  if s is null or s ->> 'kind' <> 'client' then
    raise exception 'Ese firmante no firma por el cliente' using errcode = '22023';
  end if;
  if me is null or lower(coalesce(s ->> 'email', '')) <> me then
    raise exception 'Firma con el correo al que se envió el documento' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_name, ''))) < 3 then
    raise exception 'Escribe tu nombre completo para firmar' using errcode = '22023';
  end if;
  insert into public.sam_signatures (project_id, document_id, document_version, document_hash, signer_id, signer_name, signer_email,
                                     signer_role, kind, method, drawing, user_agent)
  values (d.project_id, d.id, d.version, public.sam_document_hash(d.id), p_signer, trim(p_name), me,
          coalesce(s ->> 'role', ''), 'client', 'portal', left(p_drawing, 200000), left(coalesce(p_user_agent, ''), 300))
  returning * into sig;
  insert into public.sam_notifications (kind, title, body, link, project_id)
  values ('signature', trim(p_name) || ' firmó ' || d.code, 'Firma electrónica desde el portal del cliente.', '/p/' || d.project_id || '/documentos/' || d.id, d.project_id);
  perform public.sam_complete_signing(d.id);
  return sig;
end;
$$;
revoke all on function public.sam_portal_sign(uuid, text, text, text, text) from public;
grant execute on function public.sam_portal_sign(uuid, text, text, text, text) to authenticated;

-- Documento compartido con liga: lo congelado al compartirlo y sus firmas. Sin sesión.
create or replace function public.sam_shared_document(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'code', s.code, 'title', s.title, 'snapshot', s.snapshot, 'signers', s.signers, 'expires_on', s.expires_on,
    'project', (select jsonb_build_object('key', p.key, 'name', p.name, 'client', p.client) from public.sam_projects p where p.id = s.project_id),
    'signatures', coalesce((select jsonb_agg(to_jsonb(g) - 'user_id' - 'user_agent' order by g.signed_at)
                            from public.sam_signatures g where g.document_id = s.document_id), '[]'))
  from public.sam_shares s
  where s.token = p_token and not s.revoked and s.expires_on >= public.sam_today_mx();
$$;
revoke all on function public.sam_shared_document(text) from public;
grant execute on function public.sam_shared_document(text) to anon, authenticated;

-- ============================================================== Storage ====
-- Un solo depósito privado. Los socios leen y escriben; el cliente solo descarga
-- los archivos de su proyecto que se le compartieron.
insert into storage.buckets (id, name, public) values ('sam-archivos', 'sam-archivos', false) on conflict (id) do nothing;

create or replace function public.sam_portal_can_read(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sam_files f
     where f.path = p_path and f.client_visible and f.project_id is not null
       and (public.sam_portal_contact(f.project_id)).id is not null);
$$;
revoke all on function public.sam_portal_can_read(text) from public;
grant execute on function public.sam_portal_can_read(text) to authenticated;

drop policy if exists sam_storage_staff_select on storage.objects;
drop policy if exists sam_storage_staff_insert on storage.objects;
drop policy if exists sam_storage_staff_update on storage.objects;
drop policy if exists sam_storage_staff_delete on storage.objects;
drop policy if exists sam_storage_portal_select on storage.objects;
create policy sam_storage_staff_select on storage.objects for select to authenticated
  using (bucket_id = 'sam-archivos' and (select public.sam_is_staff()));
create policy sam_storage_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'sam-archivos' and (select public.sam_is_staff()));
create policy sam_storage_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'sam-archivos' and (select public.sam_is_staff()));
create policy sam_storage_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'sam-archivos' and (select public.sam_is_staff()));
create policy sam_storage_portal_select on storage.objects for select to authenticated
  using (bucket_id = 'sam-archivos' and public.sam_portal_can_read(name));
