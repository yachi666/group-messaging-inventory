create extension if not exists pgcrypto;

create table if not exists templates (
  template_uuid text primary key,
  platform text not null,
  tenant_or_workspace text not null,
  external_template_id text not null,
  current_version_id text null,
  parent_use_case_id text null,
  mapping_status text not null,
  lifecycle_status text not null,
  approval_status text not null,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  approved_revision integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint templates_composite_identity_unique unique (
    platform,
    tenant_or_workspace,
    external_template_id
  )
);

create table if not exists template_versions (
  version_id text primary key,
  template_uuid text not null references templates(template_uuid),
  version_number integer not null,
  masked_content text not null,
  content_fingerprint text not null,
  configuration_fingerprint text not null,
  variables_json jsonb not null default '[]'::jsonb,
  material_configuration_snapshot_json jsonb not null default '{}'::jsonb,
  change_summary text null,
  previous_version_id text null references template_versions(version_id),
  version_status text not null,
  approval_status text not null,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  effective_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint template_versions_number_unique unique (template_uuid, version_number),
  constraint template_versions_fingerprint_unique unique (
    template_uuid,
    content_fingerprint,
    configuration_fingerprint
  )
);

alter table templates
  add constraint templates_current_version_fk
  foreign key (current_version_id)
  references template_versions(version_id)
  deferrable initially deferred;

create unique index if not exists template_versions_one_current_idx
  on template_versions(template_uuid)
  where version_status = 'Current';

create table if not exists analysis_runs (
  run_id text primary key,
  template_uuid text not null references templates(template_uuid),
  version_id text not null references template_versions(version_id),
  trigger_type text not null,
  triggered_by text null,
  source_input_snapshot_id text null,
  masked_input_summary text not null,
  pipeline_version text not null,
  prompt_version text null,
  model_provider text null,
  model_name text null,
  model_version text null,
  ruleset_version text null,
  embedding_version text null,
  retrieved_context_refs_json jsonb not null default '[]'::jsonb,
  status text not null,
  started_at timestamptz null,
  completed_at timestamptz null,
  duration_ms integer null,
  warnings_json jsonb not null default '[]'::jsonb,
  errors_json jsonb not null default '[]'::jsonb,
  retry_count integer not null default 0,
  trace_ref text null,
  idempotency_key text null,
  created_at timestamptz not null default now()
);

create unique index if not exists analysis_runs_idempotency_key_idx
  on analysis_runs(idempotency_key)
  where idempotency_key is not null;

create table if not exists analysis_outputs (
  output_id text primary key,
  run_id text not null unique references analysis_runs(run_id),
  extracted_pattern text not null,
  placeholders_json jsonb not null default '[]'::jsonb,
  ai_message_type text not null,
  governance_classification_suggestion text not null,
  candidate_matches_json jsonb not null default '[]'::jsonb,
  similar_templates_json jsonb not null default '[]'::jsonb,
  field_confidence_json jsonb not null default '{}'::jsonb,
  overall_confidence integer not null,
  quality_score integer not null,
  anomalies_json jsonb not null default '[]'::jsonb,
  business_explanation_json jsonb not null default '[]'::jsonb,
  technical_evidence_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists review_tasks (
  task_id text primary key,
  task_type text not null,
  object_type text not null,
  object_id text not null,
  source_run_id text null references analysis_runs(run_id),
  priority text not null default 'normal',
  status text not null,
  assigned_to text null,
  reason text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz null
);

create table if not exists change_requests (
  change_request_id text primary key,
  object_type text not null,
  object_id text not null,
  base_revision integer not null,
  source_run_id text null references analysis_runs(run_id),
  change_type text not null,
  proposed_patch_json jsonb not null default '{}'::jsonb,
  status text not null,
  submitted_by text null,
  submitted_at timestamptz null,
  checked_by text null,
  checked_at timestamptz null,
  decision_reason text null,
  idempotency_key text null,
  created_at timestamptz not null default now()
);

create unique index if not exists change_requests_one_open_per_object_idx
  on change_requests(object_type, object_id)
  where status in ('Draft', 'PendingApproval', 'ChangesRequested');

create unique index if not exists change_requests_idempotency_key_idx
  on change_requests(idempotency_key)
  where idempotency_key is not null;

create table if not exists analysis_evaluations (
  evaluation_id text primary key,
  evaluation_suite text not null,
  pipeline_version text not null,
  prompt_version text null,
  model_provider text null,
  model_name text null,
  ruleset_version text null,
  dataset_version text not null,
  metrics_json jsonb not null default '{}'::jsonb,
  thresholds_json jsonb not null default '{}'::jsonb,
  verdict text not null,
  report_ref text null,
  created_at timestamptz not null default now()
);

create table if not exists pipeline_releases (
  release_id text primary key,
  status text not null,
  promotion_allowed boolean not null,
  requested_by text not null,
  pipeline_version text not null,
  prompt_version text not null,
  model_provider text not null,
  model_name text not null,
  ruleset_version text not null,
  evaluation_suite text not null,
  dataset_version text not null,
  evaluation_mode text not null,
  evaluation_verdict text not null,
  metrics_json jsonb not null default '{}'::jsonb,
  thresholds_json jsonb not null default '{}'::jsonb,
  failure_case_ids_json jsonb not null default '[]'::jsonb,
  evidence_hash text not null,
  evidence_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  audit_event_id text primary key,
  actor_id text null,
  action text not null,
  object_type text not null,
  object_id text not null,
  source_run_id text null references analysis_runs(run_id),
  change_request_id text null references change_requests(change_request_id),
  before_ref text null,
  after_ref text null,
  created_at timestamptz not null default now()
);

create index if not exists analysis_runs_template_version_idx
  on analysis_runs(template_uuid, version_id, created_at desc);

create index if not exists review_tasks_object_idx
  on review_tasks(object_type, object_id, status);

create index if not exists audit_events_object_idx
  on audit_events(object_type, object_id, created_at desc);

create index if not exists pipeline_releases_status_created_idx
  on pipeline_releases(status, created_at desc);
