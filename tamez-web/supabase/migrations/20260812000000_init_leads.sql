-- =============================================================================
-- TAMEZ Plastic Surgery — esquema inicial
-- Tabla de prospectos (solicitudes de valoración).
--
-- Principios (brief §13):
--   * Sólo datos necesarios para contacto comercial.
--   * NADA de historia clínica, diagnósticos ni información médica sensible.
--   * RLS activo y SIN políticas públicas: la tabla es inaccesible con la
--     clave publicable. Únicamente el backend (clave secreta / service_role)
--     puede escribir, y el equipo lee desde el panel de Supabase.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------- ENUMS ----
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_status') then
    create type public.lead_status as enum ('nuevo', 'contactado', 'agendado', 'descartado');
  end if;

  if not exists (select 1 from pg_type where typname = 'lead_contact_method') then
    create type public.lead_contact_method as enum ('whatsapp', 'telefono', 'email');
  end if;
end
$$;

-- ----------------------------------------------------------------- TABLA ----
create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Datos de contacto (mínimos indispensables)
  full_name       text not null check (char_length(trim(full_name)) between 2 and 80),
  contact_method  public.lead_contact_method not null,
  contact_value   text not null check (char_length(trim(contact_value)) between 6 and 120),

  -- Contexto comercial
  procedure_slug  text check (procedure_slug is null or char_length(procedure_slug) <= 60),
  message         text check (message is null or char_length(message) <= 600),
  source_page     text check (source_page is null or char_length(source_page) <= 200),

  -- Consentimiento explícito (brief §13)
  consent         boolean not null default false check (consent = true),

  -- Gestión interna
  status          public.lead_status not null default 'nuevo',
  internal_notes  text,

  -- Anti-abuso: la IP se guarda hasheada, nunca en claro
  ip_hash         text check (ip_hash is null or char_length(ip_hash) <= 64),
  user_agent      text check (user_agent is null or char_length(user_agent) <= 300)
);

comment on table public.leads is
  'Solicitudes de valoración del sitio. Prohibido almacenar información clínica.';
comment on column public.leads.ip_hash is
  'SHA-256 truncado de la IP + sal. No permite recuperar la dirección original.';
comment on column public.leads.consent is
  'Consentimiento del aviso de privacidad. La restricción impide guardar un lead sin él.';

-- --------------------------------------------------------------- ÍNDICES ----
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_procedure_idx on public.leads (procedure_slug)
  where procedure_slug is not null;

-- --------------------------------------------------------------- TRIGGER ----
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
  before update on public.leads
  for each row
  execute function public.set_updated_at();

-- ------------------------------------------------------------------- RLS ----
alter table public.leads enable row level security;
alter table public.leads force row level security;

-- Intencionalmente SIN políticas.
--
-- Sin políticas, RLS bloquea todo acceso con las claves `anon` / publicable y
-- `authenticated`. La clave `service_role` (secreta, sólo del servidor) omite
-- RLS y es la única vía de escritura, a través de /api/leads.
--
-- Si en el futuro se quiere un panel interno autenticado, añadir algo como:
--
--   create policy "staff lee leads"
--     on public.leads for select
--     to authenticated
--     using ( (auth.jwt() ->> 'role') = 'staff' );

-- Cinturón y tirantes: revocar cualquier permiso heredado de los roles públicos.
revoke all on public.leads from anon, authenticated;
