-- =============================================================================
-- Verificación del esquema de «Sistemas a la medida» (SOLO LECTURA: no cambia nada).
--
-- Pégalo completo en Supabase → SQL Editor y ejecútalo. Responde una sola tabla:
--   1. RESUMEN: cuántos objetos de las tres migraciones están en su lugar.
--   2. FALTA: cada tabla, columna, función, trigger, política o restricción que no está
--      (si sale algo, se vuelve a correr la migración que lo crea; todas se pueden repetir).
--   3. AJENO: lo que hay en la base y no es del software (por ejemplo, lo que quedó del
--      sitio anterior), con cuántos renglones tiene cada tabla.
--
-- Al día con: 20261112000000_sam_v1_nucleo, 20261112010000_sam_v2_v4 y
-- 20261113000000_sam_v5_crm (31 tablas, 393 columnas, 22 funciones, 10 triggers,
-- 117 políticas y el depósito sam-archivos).
-- =============================================================================
with
esperado_tablas (t) as (values
    ('sam_ai_jobs'), ('sam_base_hours'), ('sam_changes'), ('sam_contacts'), ('sam_criteria'), ('sam_decisions'),
    ('sam_documents'), ('sam_files'), ('sam_gates'), ('sam_hats'), ('sam_invoices'), ('sam_members'),
    ('sam_milestones'), ('sam_notifications'), ('sam_pendings'), ('sam_portal_access'), ('sam_projects'), ('sam_proposals'),
    ('sam_prospects'), ('sam_risks'), ('sam_routine_runs'), ('sam_routines'), ('sam_segments'), ('sam_settings'),
    ('sam_shares'), ('sam_signatures'), ('sam_snapshots'), ('sam_staff'), ('sam_wbs_items'), ('sam_wbs_templates'),
    ('sam_work_logs')
),
esperado_columnas (t, c) as (values
    ('sam_ai_jobs', 'id'), ('sam_ai_jobs', 'kind'), ('sam_ai_jobs', 'prospect_id'), ('sam_ai_jobs', 'status'),
    ('sam_ai_jobs', 'input'), ('sam_ai_jobs', 'result'), ('sam_ai_jobs', 'error'), ('sam_ai_jobs', 'created_by'),
    ('sam_ai_jobs', 'created_at'), ('sam_ai_jobs', 'finished_at'), ('sam_base_hours', 'id'), ('sam_base_hours', 'version'),
    ('sam_base_hours', 'date'), ('sam_base_hours', 'approved_by'), ('sam_base_hours', 'base_table'), ('sam_base_hours', 'notes'),
    ('sam_base_hours', 'created_at'), ('sam_changes', 'id'), ('sam_changes', 'project_id'), ('sam_changes', 'seq'),
    ('sam_changes', 'date'), ('sam_changes', 'channel'), ('sam_changes', 'requested_by_id'), ('sam_changes', 'description'),
    ('sam_changes', 'kind'), ('sam_changes', 'hours'), ('sam_changes', 'amount'), ('sam_changes', 'segment_id'),
    ('sam_changes', 'business_days_moved'), ('sam_changes', 'billing'), ('sam_changes', 'status'), ('sam_changes', 'decided_by_id'),
    ('sam_changes', 'response_date'), ('sam_changes', 'recorded_in'), ('sam_changes', 'baseline_note'), ('sam_changes', 'created_at'),
    ('sam_changes', 'created_by'), ('sam_changes', 'service'), ('sam_changes', 'urgency'), ('sam_changes', 'received_at'),
    ('sam_changes', 'first_response_at'), ('sam_changes', 'resolved_at'), ('sam_contacts', 'id'), ('sam_contacts', 'project_id'),
    ('sam_contacts', 'name'), ('sam_contacts', 'role'), ('sam_contacts', 'created_at'), ('sam_contacts', 'role_key'),
    ('sam_contacts', 'position'), ('sam_contacts', 'email'), ('sam_contacts', 'phone'), ('sam_criteria', 'id'),
    ('sam_criteria', 'project_id'), ('sam_criteria', 'milestone_id'), ('sam_criteria', 'code'), ('sam_criteria', 'deliverable'),
    ('sam_criteria', 'action'), ('sam_criteria', 'expected'), ('sam_criteria', 'result'), ('sam_criteria', 'obtained'),
    ('sam_criteria', 'evidence'), ('sam_criteria', 'classification'), ('sam_criteria', 'note'), ('sam_criteria', 'created_at'),
    ('sam_decisions', 'id'), ('sam_decisions', 'project_id'), ('sam_decisions', 'seq'), ('sam_decisions', 'date'),
    ('sam_decisions', 'decision'), ('sam_decisions', 'decided_by'), ('sam_decisions', 'why'), ('sam_decisions', 'discarded'),
    ('sam_decisions', 'recorded_in'), ('sam_decisions', 'created_at'), ('sam_decisions', 'created_by'), ('sam_documents', 'id'),
    ('sam_documents', 'project_id'), ('sam_documents', 'code'), ('sam_documents', 'version'), ('sam_documents', 'status'),
    ('sam_documents', 'context'), ('sam_documents', 'overrides'), ('sam_documents', 'snapshot'), ('sam_documents', 'created_on'),
    ('sam_documents', 'sent_on'), ('sam_documents', 'signed_on'), ('sam_documents', 'notes'), ('sam_documents', 'created_at'),
    ('sam_documents', 'created_by'), ('sam_documents', 'signers'), ('sam_files', 'id'), ('sam_files', 'project_id'),
    ('sam_files', 'prospect_id'), ('sam_files', 'kind'), ('sam_files', 'name'), ('sam_files', 'mime'),
    ('sam_files', 'size'), ('sam_files', 'path'), ('sam_files', 'client_visible'), ('sam_files', 'uploaded_on'),
    ('sam_files', 'notes'), ('sam_files', 'created_by'), ('sam_files', 'created_at'), ('sam_gates', 'id'),
    ('sam_gates', 'project_id'), ('sam_gates', 'gate'), ('sam_gates', 'milestone_id'), ('sam_gates', 'checklist'),
    ('sam_gates', 'requested_on'), ('sam_gates', 'approved_by_id'), ('sam_gates', 'approved_on'), ('sam_gates', 'notes'),
    ('sam_gates', 'created_at'), ('sam_hats', 'id'), ('sam_hats', 'project_id'), ('sam_hats', 'hat'),
    ('sam_hats', 'holder_id'), ('sam_hats', 'level'), ('sam_hats', 'backup_id'), ('sam_hats', 'created_at'),
    ('sam_invoices', 'id'), ('sam_invoices', 'project_id'), ('sam_invoices', 'position'), ('sam_invoices', 'concept'),
    ('sam_invoices', 'description'), ('sam_invoices', 'amount'), ('sam_invoices', 'purchase_order'), ('sam_invoices', 'invoice_date'),
    ('sam_invoices', 'paid_date'), ('sam_invoices', 'created_at'), ('sam_invoices', 'cfdi'), ('sam_invoices', 'payment'),
    ('sam_members', 'id'), ('sam_members', 'project_id'), ('sam_members', 'name'), ('sam_members', 'hourly_cost'),
    ('sam_members', 'weekly_hours'), ('sam_members', 'user_id'), ('sam_members', 'created_at'), ('sam_members', 'position'),
    ('sam_members', 'email'), ('sam_members', 'phone'), ('sam_milestones', 'id'), ('sam_milestones', 'project_id'),
    ('sam_milestones', 'segment_id'), ('sam_milestones', 'key'), ('sam_milestones', 'title'), ('sam_milestones', 'payment_amount'),
    ('sam_milestones', 'planned_delivery'), ('sam_milestones', 'forecast_delivery'), ('sam_milestones', 'actual_delivery'), ('sam_milestones', 'acta_date'),
    ('sam_milestones', 'deviation_cause'), ('sam_milestones', 'client_rating'), ('sam_milestones', 'created_at'), ('sam_milestones', 'result'),
    ('sam_milestones', 'criterion'), ('sam_milestones', 'client_comment'), ('sam_notifications', 'id'), ('sam_notifications', 'kind'),
    ('sam_notifications', 'title'), ('sam_notifications', 'body'), ('sam_notifications', 'link'), ('sam_notifications', 'project_id'),
    ('sam_notifications', 'prospect_id'), ('sam_notifications', 'read_by'), ('sam_notifications', 'created_at'), ('sam_pendings', 'id'),
    ('sam_pendings', 'project_id'), ('sam_pendings', 'position'), ('sam_pendings', 'description'), ('sam_pendings', 'contact_id'),
    ('sam_pendings', 'requested_on'), ('sam_pendings', 'due_on'), ('sam_pendings', 'received_on'), ('sam_pendings', 'blocks_key'),
    ('sam_pendings', 'created_at'), ('sam_portal_access', 'id'), ('sam_portal_access', 'project_id'), ('sam_portal_access', 'user_id'),
    ('sam_portal_access', 'contact_id'), ('sam_portal_access', 'email'), ('sam_portal_access', 'created_at'), ('sam_projects', 'id'),
    ('sam_projects', 'key'), ('sam_projects', 'name'), ('sam_projects', 'client'), ('sam_projects', 'budget_version'),
    ('sam_projects', 'start_date'), ('sam_projects', 'cutoff_date'), ('sam_projects', 'baseline_hours'), ('sam_projects', 'baseline_signed_on'),
    ('sam_projects', 'non_working_days'), ('sam_projects', 'params'), ('sam_projects', 'created_at'), ('sam_projects', 'updated_at'),
    ('sam_projects', 'facts'), ('sam_projects', 'stage'), ('sam_projects', 'fiscal'), ('sam_projects', 'closing'),
    ('sam_projects', 'process'), ('sam_projects', 'prospect_id'), ('sam_proposals', 'id'), ('sam_proposals', 'prospect_id'),
    ('sam_proposals', 'name'), ('sam_proposals', 'variant'), ('sam_proposals', 'version'), ('sam_proposals', 'date'),
    ('sam_proposals', 'valid_until'), ('sam_proposals', 'template_id'), ('sam_proposals', 'size'), ('sam_proposals', 'units'),
    ('sam_proposals', 'row_overrides'), ('sam_proposals', 'hourly_cost'), ('sam_proposals', 'reserve_pct'), ('sam_proposals', 'pool_pct'),
    ('sam_proposals', 'direct_costs'), ('sam_proposals', 'target_margin'), ('sam_proposals', 'price'), ('sam_proposals', 'payments'),
    ('sam_proposals', 'monthly_fee'), ('sam_proposals', 'monthly_pool_hours'), ('sam_proposals', 'status'), ('sam_proposals', 'notes'),
    ('sam_proposals', 'created_at'), ('sam_proposals', 'content'), ('sam_proposals', 'validation'), ('sam_prospects', 'id'),
    ('sam_prospects', 'company'), ('sam_prospects', 'contact_name'), ('sam_prospects', 'contact_role'), ('sam_prospects', 'source'),
    ('sam_prospects', 'stage'), ('sam_prospects', 'problem'), ('sam_prospects', 'budget'), ('sam_prospects', 'decision_maker'),
    ('sam_prospects', 'decision_date'), ('sam_prospects', 'next_step'), ('sam_prospects', 'next_step_date'), ('sam_prospects', 'lost_reason'),
    ('sam_prospects', 'project_id'), ('sam_prospects', 'created_on'), ('sam_prospects', 'notes'), ('sam_prospects', 'created_at'),
    ('sam_prospects', 'contact_email'), ('sam_prospects', 'contact_phone'), ('sam_prospects', 'industry'), ('sam_prospects', 'company_employees'),
    ('sam_prospects', 'project_users'), ('sam_prospects', 'decision_maker_role'), ('sam_prospects', 'project_key'), ('sam_prospects', 'discovery'),
    ('sam_prospects', 'feasibility'), ('sam_prospects', 'sale'), ('sam_prospects', 'follow_ups'), ('sam_prospects', 'lost'),
    ('sam_prospects', 'gate1'), ('sam_risks', 'id'), ('sam_risks', 'project_id'), ('sam_risks', 'seq'),
    ('sam_risks', 'date'), ('sam_risks', 'risk_class'), ('sam_risks', 'description'), ('sam_risks', 'severity'),
    ('sam_risks', 'depends_on'), ('sam_risks', 'commitment_date'), ('sam_risks', 'owner_id'), ('sam_risks', 'action'),
    ('sam_risks', 'status'), ('sam_risks', 'last_review'), ('sam_risks', 'created_at'), ('sam_risks', 'created_by'),
    ('sam_routine_runs', 'id'), ('sam_routine_runs', 'project_id'), ('sam_routine_runs', 'routine_id'), ('sam_routine_runs', 'date'),
    ('sam_routine_runs', 'done'), ('sam_routine_runs', 'evidence'), ('sam_routine_runs', 'notes'), ('sam_routine_runs', 'created_at'),
    ('sam_routine_runs', 'created_by'), ('sam_routines', 'id'), ('sam_routines', 'project_id'), ('sam_routines', 'name'),
    ('sam_routines', 'frequency'), ('sam_routines', 'owner_id'), ('sam_routines', 'reviewer'), ('sam_routines', 'evidence_hint'),
    ('sam_routines', 'active'), ('sam_routines', 'created_at'), ('sam_segments', 'id'), ('sam_segments', 'project_id'),
    ('sam_segments', 'position'), ('sam_segments', 'name'), ('sam_segments', 'created_at'), ('sam_segments', 'title'),
    ('sam_segments', 'result'), ('sam_segments', 'criterion'), ('sam_settings', 'key'), ('sam_settings', 'value'),
    ('sam_settings', 'updated_at'), ('sam_shares', 'id'), ('sam_shares', 'token'), ('sam_shares', 'project_id'),
    ('sam_shares', 'document_id'), ('sam_shares', 'proposal_id'), ('sam_shares', 'code'), ('sam_shares', 'title'),
    ('sam_shares', 'snapshot'), ('sam_shares', 'signers'), ('sam_shares', 'created_on'), ('sam_shares', 'expires_on'),
    ('sam_shares', 'revoked'), ('sam_shares', 'created_by'), ('sam_shares', 'created_at'), ('sam_signatures', 'id'),
    ('sam_signatures', 'project_id'), ('sam_signatures', 'document_id'), ('sam_signatures', 'document_version'), ('sam_signatures', 'document_hash'),
    ('sam_signatures', 'signer_id'), ('sam_signatures', 'signer_name'), ('sam_signatures', 'signer_email'), ('sam_signatures', 'signer_role'),
    ('sam_signatures', 'kind'), ('sam_signatures', 'method'), ('sam_signatures', 'drawing'), ('sam_signatures', 'user_agent'),
    ('sam_signatures', 'user_id'), ('sam_signatures', 'signed_at'), ('sam_snapshots', 'id'), ('sam_snapshots', 'project_id'),
    ('sam_snapshots', 'week'), ('sam_snapshots', 'cutoff'), ('sam_snapshots', 'snapshot_values'), ('sam_snapshots', 'snapshot_lights'),
    ('sam_snapshots', 'created_at'), ('sam_snapshots', 'created_by'), ('sam_staff', 'user_id'), ('sam_staff', 'name'),
    ('sam_staff', 'is_admin'), ('sam_staff', 'created_at'), ('sam_wbs_items', 'id'), ('sam_wbs_items', 'project_id'),
    ('sam_wbs_items', 'position'), ('sam_wbs_items', 'row_class'), ('sam_wbs_items', 'key'), ('sam_wbs_items', 'name'),
    ('sam_wbs_items', 'segment_id'), ('sam_wbs_items', 'deliverable'), ('sam_wbs_items', 'block'), ('sam_wbs_items', 'activity_type'),
    ('sam_wbs_items', 'level'), ('sam_wbs_items', 'owner_id'), ('sam_wbs_items', 'estimated_hours'), ('sam_wbs_items', 'planned_date'),
    ('sam_wbs_items', 'remaining_hours'), ('sam_wbs_items', 'forecast_date'), ('sam_wbs_items', 'status'), ('sam_wbs_items', 'checklist_complete'),
    ('sam_wbs_items', 'checklist'), ('sam_wbs_items', 'evidence'), ('sam_wbs_items', 'reviewer_id'), ('sam_wbs_items', 'review_date'),
    ('sam_wbs_items', 'internal_defects'), ('sam_wbs_items', 'actual_end_date'), ('sam_wbs_items', 'correction_budget'), ('sam_wbs_items', 'change_folio'),
    ('sam_wbs_items', 'created_at'), ('sam_wbs_items', 'updated_at'), ('sam_wbs_templates', 'id'), ('sam_wbs_templates', 'name'),
    ('sam_wbs_templates', 'project_class'), ('sam_wbs_templates', 'description'), ('sam_wbs_templates', 'rows'), ('sam_wbs_templates', 'created_on'),
    ('sam_wbs_templates', 'created_at'), ('sam_work_logs', 'id'), ('sam_work_logs', 'project_id'), ('sam_work_logs', 'seq'),
    ('sam_work_logs', 'date'), ('sam_work_logs', 'person_id'), ('sam_work_logs', 'activity_key'), ('sam_work_logs', 'description'),
    ('sam_work_logs', 'hours'), ('sam_work_logs', 'hour_class'), ('sam_work_logs', 'mark'), ('sam_work_logs', 'related_folio'),
    ('sam_work_logs', 'direct_cost'), ('sam_work_logs', 'evidence'), ('sam_work_logs', 'blocker'), ('sam_work_logs', 'created_at'),
    ('sam_work_logs', 'created_by')
),
esperado_funciones (f) as (values
    ('sam_assign_seq'), ('sam_complete_signing'), ('sam_document_hash'), ('sam_documents_guard'),
    ('sam_gates_guard'), ('sam_is_admin'), ('sam_is_staff'), ('sam_my_email'),
    ('sam_portal_accept_milestone'), ('sam_portal_can_read'), ('sam_portal_contact'), ('sam_portal_data'),
    ('sam_portal_decide_change'), ('sam_portal_projects'), ('sam_portal_request'), ('sam_portal_sign'),
    ('sam_proposals_guard'), ('sam_prospects_guard'), ('sam_set_updated_at'), ('sam_shared_document'),
    ('sam_sign_document'), ('sam_today_mx')
),
esperado_triggers (t, g) as (values
    ('sam_changes', 'sam_changes_seq'), ('sam_decisions', 'sam_decisions_seq'), ('sam_documents', 'sam_documents_guard'),
    ('sam_gates', 'sam_gates_guard'), ('sam_projects', 'sam_projects_updated_at'), ('sam_proposals', 'sam_proposals_guard'),
    ('sam_prospects', 'sam_prospects_guard'), ('sam_risks', 'sam_risks_seq'), ('sam_wbs_items', 'sam_wbs_items_updated_at'),
    ('sam_work_logs', 'sam_work_logs_seq')
),
esperado_politicas (s, t, p) as (values
    ('public', 'sam_ai_jobs', 'sam_ai_jobs_delete'), ('public', 'sam_ai_jobs', 'sam_ai_jobs_insert'),
    ('public', 'sam_ai_jobs', 'sam_ai_jobs_select'), ('public', 'sam_ai_jobs', 'sam_ai_jobs_update'),
    ('public', 'sam_base_hours', 'sam_base_hours_insert'), ('public', 'sam_base_hours', 'sam_base_hours_select'),
    ('public', 'sam_base_hours', 'sam_base_hours_update'), ('public', 'sam_changes', 'sam_changes_insert'),
    ('public', 'sam_changes', 'sam_changes_select'), ('public', 'sam_changes', 'sam_changes_update'),
    ('public', 'sam_contacts', 'sam_contacts_delete'), ('public', 'sam_contacts', 'sam_contacts_insert'),
    ('public', 'sam_contacts', 'sam_contacts_select'), ('public', 'sam_contacts', 'sam_contacts_update'),
    ('public', 'sam_criteria', 'sam_criteria_delete'), ('public', 'sam_criteria', 'sam_criteria_insert'),
    ('public', 'sam_criteria', 'sam_criteria_select'), ('public', 'sam_criteria', 'sam_criteria_update'),
    ('public', 'sam_decisions', 'sam_decisions_insert'), ('public', 'sam_decisions', 'sam_decisions_select'),
    ('public', 'sam_decisions', 'sam_decisions_update'), ('public', 'sam_documents', 'sam_documents_delete'),
    ('public', 'sam_documents', 'sam_documents_insert'), ('public', 'sam_documents', 'sam_documents_select'),
    ('public', 'sam_documents', 'sam_documents_update'), ('public', 'sam_files', 'sam_files_delete'),
    ('public', 'sam_files', 'sam_files_insert'), ('public', 'sam_files', 'sam_files_select'),
    ('public', 'sam_files', 'sam_files_update'), ('public', 'sam_gates', 'sam_gates_delete'),
    ('public', 'sam_gates', 'sam_gates_insert'), ('public', 'sam_gates', 'sam_gates_select'),
    ('public', 'sam_gates', 'sam_gates_update'), ('public', 'sam_hats', 'sam_hats_delete'),
    ('public', 'sam_hats', 'sam_hats_insert'), ('public', 'sam_hats', 'sam_hats_select'),
    ('public', 'sam_hats', 'sam_hats_update'), ('public', 'sam_invoices', 'sam_invoices_delete'),
    ('public', 'sam_invoices', 'sam_invoices_insert'), ('public', 'sam_invoices', 'sam_invoices_select'),
    ('public', 'sam_invoices', 'sam_invoices_update'), ('public', 'sam_members', 'sam_members_delete'),
    ('public', 'sam_members', 'sam_members_insert'), ('public', 'sam_members', 'sam_members_select'),
    ('public', 'sam_members', 'sam_members_update'), ('public', 'sam_milestones', 'sam_milestones_delete'),
    ('public', 'sam_milestones', 'sam_milestones_insert'), ('public', 'sam_milestones', 'sam_milestones_select'),
    ('public', 'sam_milestones', 'sam_milestones_update'), ('public', 'sam_notifications', 'sam_notifications_delete'),
    ('public', 'sam_notifications', 'sam_notifications_insert'), ('public', 'sam_notifications', 'sam_notifications_select'),
    ('public', 'sam_notifications', 'sam_notifications_update'), ('public', 'sam_pendings', 'sam_pendings_delete'),
    ('public', 'sam_pendings', 'sam_pendings_insert'), ('public', 'sam_pendings', 'sam_pendings_select'),
    ('public', 'sam_pendings', 'sam_pendings_update'), ('public', 'sam_portal_access', 'sam_portal_access_delete'),
    ('public', 'sam_portal_access', 'sam_portal_access_insert'), ('public', 'sam_portal_access', 'sam_portal_access_select'),
    ('public', 'sam_portal_access', 'sam_portal_access_update'), ('public', 'sam_projects', 'sam_projects_delete'),
    ('public', 'sam_projects', 'sam_projects_insert'), ('public', 'sam_projects', 'sam_projects_select'),
    ('public', 'sam_projects', 'sam_projects_update'), ('public', 'sam_proposals', 'sam_proposals_delete'),
    ('public', 'sam_proposals', 'sam_proposals_insert'), ('public', 'sam_proposals', 'sam_proposals_select'),
    ('public', 'sam_proposals', 'sam_proposals_update'), ('public', 'sam_prospects', 'sam_prospects_delete'),
    ('public', 'sam_prospects', 'sam_prospects_insert'), ('public', 'sam_prospects', 'sam_prospects_select'),
    ('public', 'sam_prospects', 'sam_prospects_update'), ('public', 'sam_risks', 'sam_risks_insert'),
    ('public', 'sam_risks', 'sam_risks_select'), ('public', 'sam_risks', 'sam_risks_update'),
    ('public', 'sam_routine_runs', 'sam_routine_runs_insert'), ('public', 'sam_routine_runs', 'sam_routine_runs_select'),
    ('public', 'sam_routine_runs', 'sam_routine_runs_update'), ('public', 'sam_routines', 'sam_routines_delete'),
    ('public', 'sam_routines', 'sam_routines_insert'), ('public', 'sam_routines', 'sam_routines_select'),
    ('public', 'sam_routines', 'sam_routines_update'), ('public', 'sam_segments', 'sam_segments_delete'),
    ('public', 'sam_segments', 'sam_segments_insert'), ('public', 'sam_segments', 'sam_segments_select'),
    ('public', 'sam_segments', 'sam_segments_update'), ('public', 'sam_settings', 'sam_settings_delete'),
    ('public', 'sam_settings', 'sam_settings_insert'), ('public', 'sam_settings', 'sam_settings_select'),
    ('public', 'sam_settings', 'sam_settings_update'), ('public', 'sam_shares', 'sam_shares_delete'),
    ('public', 'sam_shares', 'sam_shares_insert'), ('public', 'sam_shares', 'sam_shares_select'),
    ('public', 'sam_shares', 'sam_shares_update'), ('public', 'sam_signatures', 'sam_signatures_select'),
    ('public', 'sam_snapshots', 'sam_snapshots_delete'), ('public', 'sam_snapshots', 'sam_snapshots_insert'),
    ('public', 'sam_snapshots', 'sam_snapshots_select'), ('public', 'sam_snapshots', 'sam_snapshots_update'),
    ('public', 'sam_staff', 'sam_staff_read'), ('public', 'sam_wbs_items', 'sam_wbs_items_delete'),
    ('public', 'sam_wbs_items', 'sam_wbs_items_insert'), ('public', 'sam_wbs_items', 'sam_wbs_items_select'),
    ('public', 'sam_wbs_items', 'sam_wbs_items_update'), ('public', 'sam_wbs_templates', 'sam_wbs_templates_delete'),
    ('public', 'sam_wbs_templates', 'sam_wbs_templates_insert'), ('public', 'sam_wbs_templates', 'sam_wbs_templates_select'),
    ('public', 'sam_wbs_templates', 'sam_wbs_templates_update'), ('public', 'sam_work_logs', 'sam_work_logs_insert'),
    ('public', 'sam_work_logs', 'sam_work_logs_select'), ('public', 'sam_work_logs', 'sam_work_logs_update'),
    ('storage', 'objects', 'sam_storage_portal_select'), ('storage', 'objects', 'sam_storage_staff_delete'),
    ('storage', 'objects', 'sam_storage_staff_insert'), ('storage', 'objects', 'sam_storage_staff_select'),
    ('storage', 'objects', 'sam_storage_staff_update')
),
revision (orden, tipo, objeto, tabla, ok) as (
  select 1, 'Tabla', e.t, null::text, to_regclass('public.' || e.t) is not null from esperado_tablas e
  union all
  select 2, 'Columna', e.t || '.' || e.c, e.t,
         exists (select 1 from information_schema.columns ic
                 where ic.table_schema = 'public' and ic.table_name = e.t and ic.column_name = e.c)
  from esperado_columnas e
  union all
  select 3, 'Seguridad por renglón (RLS)', e.t, e.t,
         coalesce((select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.' || e.t)), false)
  from esperado_tablas e
  union all
  select 4, 'Función', e.f, null,
         exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = e.f)
  from esperado_funciones e
  union all
  select 5, 'Trigger', e.t || ' · ' || e.g, e.t,
         exists (select 1 from pg_trigger tg where tg.tgrelid = to_regclass('public.' || e.t) and tg.tgname = e.g)
  from esperado_triggers e
  union all
  select 6, 'Política', e.s || '.' || e.t || ' · ' || e.p, case when e.s = 'public' then e.t end,
         exists (select 1 from pg_policies pp where pp.schemaname = e.s and pp.tablename = e.t and pp.policyname = e.p)
  from esperado_politicas e
  union all
  select 7, 'Restricción', x.objeto, substr(x.tabla, 8),
         exists (select 1 from pg_constraint k
                 where k.conrelid = to_regclass(x.tabla) and k.conname = x.nombre and pg_get_constraintdef(k.oid) like x.marca)
  from (values
    ('public.sam_documents', 'sam_documents_code_check', '%D18%', 'sam_documents: códigos D01 a D18'),
    ('public.sam_prospects', 'sam_prospects_stage_check', '%feasible%', 'sam_prospects: estados del CRM'),
    ('public.sam_projects', 'sam_projects_stage_check', '%execution%', 'sam_projects: etapas del cliente')
  ) as x (tabla, nombre, marca, objeto)
  union all
  select 8, 'Depósito de archivos', 'sam-archivos (privado)', null,
         exists (select 1 from storage.buckets b where b.id = 'sam-archivos' and not b.public)
),
ajeno (tipo, objeto, detalle) as (
  select 'Tabla', c.relname,
         (xpath('/row/n/text()', query_to_xml(format('select count(*) as n from public.%I', c.relname), false, true, '')))[1]::text || ' renglones'
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname not like 'sam\_%'
  union all
  select case c.relkind when 'v' then 'Vista' when 'm' then 'Vista materializada' else 'Tabla externa' end, c.relname, ''
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('v', 'm', 'f') and c.relname not like 'sam\_%'
  union all
  select 'Función', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', ''
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname not like 'sam\_%'
    and not exists (select 1 from pg_depend dp where dp.objid = p.oid and dp.deptype = 'e')
  union all
  select 'Tipo', t.typname, ''
  from pg_type t join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public' and t.typtype in ('e', 'd') and t.typname not like 'sam\_%'
    and not exists (select 1 from pg_depend dp where dp.objid = t.oid and dp.deptype = 'e')
  union all
  select 'Depósito de archivos', b.id, case when b.public then 'público' else 'privado' end
  from storage.buckets b where b.id <> 'sam-archivos'
)
select 'RESUMEN' as seccion,
       (select count(*) filter (where ok) from revision) || ' de ' || (select count(*) from revision) || ' en su lugar' as tipo,
       case when (select bool_and(ok) from revision) then 'Todo completo' else 'Falta lo que aparece abajo como FALTA' end as objeto,
       '' as detalle
from (select 1) as uno
union all
-- De una tabla que falta no se repiten sus columnas, triggers ni políticas.
(select 'FALTA', r.tipo, r.objeto, '' from revision r
 where not r.ok and (r.tabla is null or to_regclass('public.' || r.tabla) is not null)
 order by r.orden, r.objeto)
union all
(select 'AJENO', a.tipo, a.objeto, a.detalle from ajeno a order by a.tipo, a.objeto);
