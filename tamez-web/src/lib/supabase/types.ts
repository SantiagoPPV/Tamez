/**
 * Tipos de la base de datos.
 *
 * Mantener sincronizado con `supabase/migrations/`. Para regenerarlo desde el
 * proyecto real:
 *
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
 *
 * NOTA: se usan alias de tipo (`type`) y no `interface`. postgrest-js exige
 * que cada tabla encaje en `Record<string, unknown>`, y las interfaces no
 * reciben index signature implícita en TypeScript, así que romperían el
 * tipado del cliente.
 */

export type LeadStatus = 'nuevo' | 'contactado' | 'agendado' | 'descartado';
export type LeadContactMethod = 'whatsapp' | 'telefono' | 'email';

export type LeadRow = {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  contact_method: LeadContactMethod;
  contact_value: string;
  procedure_slug: string | null;
  message: string | null;
  consent: boolean;
  source_page: string | null;
  status: LeadStatus;
  ip_hash: string | null;
  user_agent: string | null;
  internal_notes: string | null;
};

/** Campos que envía la aplicación al insertar; el resto los pone Postgres. */
export type LeadInsert = {
  full_name: string;
  contact_method: LeadContactMethod;
  contact_value: string;
  procedure_slug: string | null;
  message: string | null;
  consent: boolean;
  source_page: string | null;
  ip_hash: string | null;
  user_agent: string | null;
  status?: LeadStatus;
};

export type LeadUpdate = Partial<LeadRow>;

export type Database = {
  public: {
    Tables: {
      leads: {
        Row: LeadRow;
        Insert: LeadInsert;
        Update: LeadUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      lead_status: LeadStatus;
      lead_contact_method: LeadContactMethod;
    };
    CompositeTypes: Record<string, never>;
  };
};
