-- =============================================================================
-- 0001 Foundation: private schema, catalog, profiles, RBAC, settings, audit
-- =============================================================================
-- Security model (read this first):
--   * Authorization NEVER trusts profiles columns, JWT user_metadata or anything a
--     user can edit. Roles/permissions live in user_roles / user_permissions, which
--     have no INSERT/UPDATE/DELETE grants for API roles. They change only through
--     SECURITY DEFINER functions that re-check the caller's permissions.
--   * Helper functions live in `app_private`, a schema that PostgREST does not expose.
--   * Every SECURITY DEFINER function pins `search_path = ''` and uses
--     schema-qualified names.
-- =============================================================================

create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to anon, authenticated, service_role;

-- Supabase auto-grants new `public` objects to anon/authenticated. Undo that so every
-- grant in this project is explicit. (Postgres also grants EXECUTE on new functions to
-- PUBLIC by default; that cannot be changed per-schema, so the final grants migration
-- revokes and re-grants EXECUTE explicitly on every function.)
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Generic helpers
-- -----------------------------------------------------------------------------
create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Raises a machine-readable error: message = code, detail = human readable text.
create or replace function app_private.fail(p_code text, p_detail text default null)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception '%', p_code using errcode = 'P0001', detail = p_detail;
end;
$$;

-- -----------------------------------------------------------------------------
-- Catalog (reference data; seeded by migration, read-only for API roles)
-- -----------------------------------------------------------------------------
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  code text not null unique,
  name text not null,
  sort_order integer not null default 0
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete restrict,
  academic_year text not null
    check (academic_year in ('first-year', 'second-year', 'third-year', 'fourth-year')),
  semester smallint not null check (semester between 1 and 8),
  code text not null,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  credits smallint check (credits is null or credits between 0 and 12),
  constraint subjects_branch_code_key unique (branch_id, code),
  constraint subjects_year_matches_semester check (
    (academic_year = 'first-year' and semester in (1, 2)) or
    (academic_year = 'second-year' and semester in (3, 4)) or
    (academic_year = 'third-year' and semester in (5, 6)) or
    (academic_year = 'fourth-year' and semester in (7, 8))
  )
);
create index subjects_branch_semester_idx on public.subjects (branch_id, semester);

-- -----------------------------------------------------------------------------
-- Profiles (one row per auth user; created by trigger, never by the client)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (full_name is null or char_length(btrim(full_name)) between 1 and 120),
  email text not null,
  avatar_url text check (avatar_url is null or (avatar_url ~* '^https://' and char_length(avatar_url) <= 2048)),
  account_status text not null default 'active' check (account_status in ('active', 'suspended')),
  suspended_at timestamptz,
  suspended_by uuid references public.profiles (id) on delete set null,
  suspension_reason text check (suspension_reason is null or char_length(suspension_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_email_lower_key on public.profiles (lower(email));
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function app_private.set_updated_at();

-- -----------------------------------------------------------------------------
-- RBAC
-- -----------------------------------------------------------------------------
create table public.roles (
  id text primary key check (id ~ '^[a-z_]+$'),
  name text not null,
  description text not null,
  assignable boolean not null default true  -- false = can never be handed out by role assignment
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z_]+\.[a-z_]+$'),
  description text not null,
  delegable boolean not null default true  -- false = only held through a role, never granted individually
);

create table public.role_permissions (
  role_id text not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

-- Exactly one role per account. (Extra capabilities go in user_permissions.)
create table public.user_roles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role_id text not null references public.roles (id),
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now()
);
create index user_roles_role_idx on public.user_roles (role_id);

-- DATABASE-LEVEL GUARANTEE: at most one super admin can ever exist.
create unique index user_roles_single_super_admin
  on public.user_roles (role_id) where role_id = 'super_admin';

create table public.user_permissions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, permission_id)
);

-- Singleton flipped to true once the super admin has been bootstrapped. From then
-- on the application must always have exactly one super admin (see trigger below).
create table app_private.system_state (
  singleton boolean primary key default true check (singleton),
  super_admin_bootstrapped boolean not null default false
);
insert into app_private.system_state default values;

create or replace function app_private.enforce_super_admin_presence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select s.super_admin_bootstrapped from app_private.system_state s)
     and not exists (select 1 from public.user_roles where role_id = 'super_admin') then
    perform app_private.fail(
      'super_admin_required',
      'The application must always have one super admin. Use transfer_super_admin to change ownership.'
    );
  end if;
  return null;
end;
$$;

-- Deferred so the atomic transfer (demote old, promote new) can pass through an
-- intermediate state inside one transaction.
create constraint trigger user_roles_super_admin_presence
  after update or delete on public.user_roles
  deferrable initially deferred
  for each row execute function app_private.enforce_super_admin_presence();

-- -----------------------------------------------------------------------------
-- Application settings (writes only through set_app_setting)
-- -----------------------------------------------------------------------------
create table public.app_settings (
  key text primary key,
  value jsonb not null,
  description text not null,
  is_public boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Audit log: append-only, written only by SECURITY DEFINER functions
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,                         -- deliberately no FK: the log must outlive accounts
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index audit_logs_action_idx on public.audit_logs (action, created_at desc);

create or replace function app_private.audit_logs_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_logs is append-only' using errcode = '42501';
end;
$$;
create trigger audit_logs_no_update_delete before update or delete on public.audit_logs
  for each row execute function app_private.audit_logs_append_only();
create trigger audit_logs_no_truncate before truncate on public.audit_logs
  for each statement execute function app_private.audit_logs_append_only();

create or replace function app_private.write_audit(
  p_action text,
  p_target_type text,
  p_target_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs (actor_id, action, target_type, target_id, metadata)
  values ((select auth.uid()), p_action, p_target_type, p_target_id, coalesce(p_metadata, '{}'::jsonb));
$$;
revoke execute on function app_private.write_audit(text, text, text, jsonb) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Authorization primitives
-- -----------------------------------------------------------------------------
-- Effective permissions = permissions of the user's role + individual grants
-- (+ everything for the super admin). Suspended accounts have none.
create or replace function app_private.effective_permissions(p_user uuid)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select pm.key
  from public.permissions pm
  where exists (
          select 1 from public.profiles p
          where p.id = p_user and p.account_status = 'active'
        )
    and (
      exists (select 1 from public.user_roles ur where ur.user_id = p_user and ur.role_id = 'super_admin')
      or exists (
        select 1
        from public.user_roles ur
        join public.role_permissions rp on rp.role_id = ur.role_id
        where ur.user_id = p_user and rp.permission_id = pm.id
      )
      or exists (
        select 1 from public.user_permissions up
        where up.user_id = p_user and up.permission_id = pm.id
      )
    );
$$;

create or replace function app_private.user_has_permission(p_user uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user is not null
     and exists (select 1 from app_private.effective_permissions(p_user) k where k = p_key);
$$;

create or replace function app_private.has_permission(p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.user_has_permission((select auth.uid()), p_key);
$$;

-- Active account AND (no domain restriction OR allowed domain OR staff member).
-- The domain restriction is enforced here so it applies to every write path even
-- if the Auth hook was never enabled.
create or replace function app_private.is_login_allowed(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user is not null and exists (
    select 1
    from public.profiles p
    where p.id = p_user
      and p.account_status = 'active'
      and (
        not exists (
          select 1 from public.app_settings s
          where s.key = 'allowed_email_domains' and jsonb_array_length(s.value) > 0
        )
        or exists (
          select 1
          from public.app_settings s, jsonb_array_elements_text(s.value) d (dom)
          where s.key = 'allowed_email_domains'
            and lower(d.dom) = lower(split_part(p.email, '@', 2))
        )
        or exists (
          select 1 from public.user_roles ur
          where ur.user_id = p.id and ur.role_id <> 'student'
        )
      )
  );
$$;

create or replace function app_private.current_user_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app_private.is_login_allowed((select auth.uid()));
$$;

create or replace function app_private.require_user()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    perform app_private.fail('unauthenticated', 'Sign in required.');
  end if;
  return v_uid;
end;
$$;

create or replace function app_private.require_active()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_user();
begin
  if not app_private.is_login_allowed(v_uid) then
    perform app_private.fail('account_inactive', 'Your account is suspended or its email domain is not permitted.');
  end if;
  return v_uid;
end;
$$;

create or replace function app_private.require_permission(p_key text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_user();
begin
  if not app_private.user_has_permission(v_uid, p_key) then
    perform app_private.fail('forbidden', 'You do not have the "' || p_key || '" permission.');
  end if;
  return v_uid;
end;
$$;

-- -----------------------------------------------------------------------------
-- Profile provisioning from Supabase Auth
-- -----------------------------------------------------------------------------
create or replace function app_private.safe_https_url(p_url text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_url ~* '^https://[^[:space:]]+$' and char_length(p_url) <= 2048 then p_url end;
$$;

create or replace function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  if new.email is null or btrim(new.email) = '' then
    raise exception 'An email address is required to create an account' using errcode = '23514';
  end if;

  v_name := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')), '');

  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    left(v_name, 120),
    new.email,
    app_private.safe_https_url(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'))
  )
  on conflict (id) do nothing;

  -- Every account starts as a plain student. Nothing about the signup request
  -- (email, metadata, provider) can influence this.
  insert into public.user_roles (user_id, role_id) values (new.id, 'student')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_user();

-- Keep email / avatar in sync with the identity provider. full_name is only seeded
-- at signup so a student's own edit is never overwritten.
create or replace function app_private.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles p
  set email = coalesce(nullif(btrim(new.email), ''), p.email),
      avatar_url = coalesce(
        app_private.safe_https_url(coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')),
        p.avatar_url
      )
  where p.id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row execute function app_private.handle_user_updated();

-- -----------------------------------------------------------------------------
-- Seed: roles, permissions, default role -> permission map, settings
-- -----------------------------------------------------------------------------
insert into public.roles (id, name, description, assignable) values
  ('student',        'Student',               'Browse resources, contribute files, track own contributions.', true),
  ('file_moderator', 'File Moderator',        'Reviews student-submitted files. No other administrative access.', true),
  ('content_admin',  'Content Administrator', 'Creates, edits, publishes and archives official resources.', true),
  ('super_admin',    'Super Admin',           'Single owner account: users, roles, permissions, settings and audit.', false);

insert into public.permissions (key, description, delegable) values
  ('resources.read',        'Browse published resources',                               true),
  ('resources.create',      'Create resources (drafts)',                                true),
  ('resources.edit',        'Edit resource metadata and replace files',                 true),
  ('resources.publish',     'Publish and unpublish resources',                          true),
  ('resources.archive',     'Archive outdated resources',                               true),
  ('resources.delete',      'Permanently delete archived or draft resources',           true),
  ('contributions.read',    'View pending contributions and their files',               true),
  ('contributions.review',  'Claim, flag and request changes on contributions',         true),
  ('contributions.approve', 'Approve contributions (publishes them)',                   true),
  ('contributions.reject',  'Reject contributions',                                     true),
  ('users.read',            'View accounts, roles and permissions',                     true),
  ('users.suspend',         'Suspend and reactivate student accounts',                  true),
  ('roles.manage',          'Assign roles, grant permissions, transfer super admin',    false),
  ('settings.manage',       'Change application-wide settings',                         false),
  ('audit.read',            'Read the audit log',                                       true);

insert into public.role_permissions (role_id, permission_id)
select m.role_id, p.id
from (values
  ('student', 'resources.read'),
  ('file_moderator', 'resources.read'),
  ('file_moderator', 'contributions.read'),
  ('file_moderator', 'contributions.review'),
  ('file_moderator', 'contributions.approve'),
  ('file_moderator', 'contributions.reject'),
  ('content_admin', 'resources.read'),
  ('content_admin', 'resources.create'),
  ('content_admin', 'resources.edit'),
  ('content_admin', 'resources.publish'),
  ('content_admin', 'resources.archive')
) as m (role_id, perm_key)
join public.permissions p on p.key = m.perm_key;

-- super_admin gets every permission (also implicit in effective_permissions()).
insert into public.role_permissions (role_id, permission_id)
select 'super_admin', id from public.permissions;

insert into public.app_settings (key, value, description, is_public) values
  ('allowed_email_domains', '[]'::jsonb,
   'Email domains allowed to use the app as students. Empty list = no restriction. Staff accounts are exempt.', true),
  ('max_upload_bytes', '26214400'::jsonb,
   'Maximum size of a contributed file in bytes (hard cap 52428800).', true),
  ('allowed_file_types', '["pdf","png","jpg","docx"]'::jsonb,
   'File kinds accepted for uploads. Supported: pdf, png, jpg, docx, pptx.', true),
  ('max_open_contributions', '10'::jsonb,
   'Maximum contributions a student may have awaiting review at once.', false),
  ('rejected_file_retention_days', '30'::jsonb,
   'Days to keep files of rejected/superseded submissions before purging.', false),
  ('abandoned_upload_hours', '24'::jsonb,
   'Hours before an upload that never became a submission or resource is purged.', false);
