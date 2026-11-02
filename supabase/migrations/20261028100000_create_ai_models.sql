-- migration: create ai models
-- purpose: let admins register Azure AI Foundry deployments ("språkmodeller")
--          and choose which one all AI tools use, from the admin page.
-- affected: new table public.ai_models, new functions
--           public.get_active_ai_model() and public.activate_ai_model()
-- special: purely additive. no existing tables or rows are changed. when no
--          model is active the tools keep using the model from the
--          AZURE_OPENAI_* environment variables, so applying this migration
--          does not change any tool's behavior until an admin activates a model.
--          the endpoint and api key stay in the environment; this table only
--          holds deployment names and settings, which are not secret.

-- ---------------------------------------------------------------------------
-- ai_models: one row per registered deployment
-- ---------------------------------------------------------------------------
-- deployment is the deployment name in Azure AI Foundry, in the same resource
-- as AZURE_OPENAI_ENDPOINT. model_type decides how requests are adapted (see
-- lib/ai/azure-core.ts). at most one model is active.
create table if not exists public.ai_models (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  deployment text not null check (deployment ~ '^[A-Za-z0-9._-]{1,64}$'),
  api_version text not null check (api_version ~ '^(v1|[0-9]{4}-[0-9]{2}-[0-9]{2}(-preview)?)$'),
  model_type text not null check (model_type in ('standard', 'reasoning')),
  reasoning_effort text not null default 'low'
    check (reasoning_effort in ('minimal', 'low', 'medium', 'high')),
  is_active boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ai_models is
  'Admin-registered Azure AI Foundry deployments. The active one is used by all AI tools; with none active the AZURE_OPENAI_* environment variables are used.';

-- guarantees that at most one model is active
create unique index if not exists ai_models_one_active_idx
  on public.ai_models ((true))
  where is_active;

drop trigger if exists ai_models_set_updated_at on public.ai_models;
create trigger ai_models_set_updated_at
before update on public.ai_models
for each row
execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- rls: only admins can read and manage models directly
-- ---------------------------------------------------------------------------
alter table public.ai_models enable row level security;

drop policy if exists "Admins can read ai models" on public.ai_models;
create policy "Admins can read ai models"
on public.ai_models
for select
to authenticated
using ( (select public.is_admin()) );

drop policy if exists "Admins can create ai models" on public.ai_models;
create policy "Admins can create ai models"
on public.ai_models
for insert
to authenticated
with check ( (select public.is_admin()) );

drop policy if exists "Admins can update ai models" on public.ai_models;
create policy "Admins can update ai models"
on public.ai_models
for update
to authenticated
using ( (select public.is_admin()) )
with check ( (select public.is_admin()) );

drop policy if exists "Admins can delete ai models" on public.ai_models;
create policy "Admins can delete ai models"
on public.ai_models
for delete
to authenticated
using ( (select public.is_admin()) );

-- ---------------------------------------------------------------------------
-- get_active_ai_model: settings of the active model
-- ---------------------------------------------------------------------------
-- the ai tools are used by students who are not logged in, so the api routes
-- read the active model through this function instead of the table. returns
-- null when no model is active (the tools then use the environment variables).
create or replace function public.get_active_ai_model()
returns json
language sql
stable
security definer
set search_path = ''
as $$
  select json_build_object(
    'deployment', public.ai_models.deployment,
    'api_version', public.ai_models.api_version,
    'model_type', public.ai_models.model_type,
    'reasoning_effort', public.ai_models.reasoning_effort
  )
  from public.ai_models
  where public.ai_models.is_active
  limit 1;
$$;

revoke all on function public.get_active_ai_model() from public;
grant execute on function public.get_active_ai_model() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- activate_ai_model: switch the active model atomically
-- ---------------------------------------------------------------------------
-- deactivates the current model and activates p_model_id in one transaction.
-- pass null to go back to the model from the environment variables. only
-- admins may call it.
create or replace function public.activate_ai_model(p_model_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Bare administratorer kan bytte språkmodell'
      using errcode = '42501';
  end if;

  if p_model_id is not null and not exists (
    select 1 from public.ai_models where public.ai_models.id = p_model_id
  ) then
    raise exception 'Fant ikke modellen'
      using errcode = 'P0002';
  end if;

  update public.ai_models
  set is_active = false
  where public.ai_models.is_active;

  if p_model_id is not null then
    update public.ai_models
    set is_active = true
    where public.ai_models.id = p_model_id;
  end if;
end;
$$;

revoke all on function public.activate_ai_model(uuid) from public, anon;
grant execute on function public.activate_ai_model(uuid) to authenticated;
