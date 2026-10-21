-- =============================================================================
-- 0005 Row Level Security + explicit grants
-- =============================================================================
-- Principles:
--   * RLS is enabled on EVERY table in `public`.
--   * API roles (anon / authenticated) receive only the table/column privileges
--     listed here. They get NO INSERT/UPDATE/DELETE on privileged tables: roles,
--     permissions, audit_logs, contributions, resources, settings, ... change only via
--     the SECURITY DEFINER functions from 0003.
--   * Policy predicates use `(select fn())` so Postgres evaluates them once per
--     statement, and call SECURITY DEFINER helpers so policies never recurse.
--   * Nothing here reads profiles.role or JWT user_metadata (neither exists / is trusted).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Start from zero: no API role privileges on any table or function we own.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'app_private')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.sig);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.branches enable row level security;
alter table public.subjects enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_permissions enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.contributions enable row level security;
alter table public.contribution_revisions enable row level security;
alter table public.contribution_flags enable row level security;
alter table public.contribution_reviews enable row level security;
alter table public.resources enable row level security;
alter table public.upload_validations enable row level security;
alter table public.bookmarks enable row level security;
alter table public.notifications enable row level security;
alter table public.user_preferences enable row level security;
alter table public.attendance_courses enable row level security;
alter table public.resource_reports enable row level security;
alter table public.feedback enable row level security;
alter table app_private.system_state enable row level security;

-- ---------------------------------------------------------------------------
-- Catalog: world-readable reference data
-- ---------------------------------------------------------------------------
grant select on public.branches, public.subjects to anon, authenticated;
create policy branches_read on public.branches for select to anon, authenticated using (true);
create policy subjects_read on public.subjects for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;   -- email/avatar/status are not user-editable

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_select_staff on public.profiles
  for select to authenticated
  using ((select app_private.has_permission('users.read')));

-- Moderators may see the people who submitted contributions they can review.
create policy profiles_select_uploader on public.profiles
  for select to authenticated
  using (
    (select app_private.has_permission('contributions.read'))
    and exists (select 1 from public.contributions c where c.submitted_by = profiles.id)
  );

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and (select app_private.current_user_active()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- RBAC tables: read-only to API roles
-- ---------------------------------------------------------------------------
grant select on public.roles, public.permissions, public.role_permissions to authenticated;
create policy roles_read on public.roles for select to authenticated using (true);
create policy permissions_read on public.permissions for select to authenticated using (true);
create policy role_permissions_read on public.role_permissions for select to authenticated using (true);

grant select on public.user_roles, public.user_permissions to authenticated;
create policy user_roles_select_own on public.user_roles
  for select to authenticated using (user_id = (select auth.uid()));
create policy user_roles_select_staff on public.user_roles
  for select to authenticated using ((select app_private.has_permission('users.read')));
create policy user_permissions_select_own on public.user_permissions
  for select to authenticated using (user_id = (select auth.uid()));
create policy user_permissions_select_staff on public.user_permissions
  for select to authenticated using ((select app_private.has_permission('users.read')));

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------
grant select on public.app_settings to anon, authenticated;
create policy app_settings_read_public on public.app_settings
  for select to anon, authenticated using (is_public);
create policy app_settings_read_admin on public.app_settings
  for select to authenticated using ((select app_private.has_permission('settings.manage')));

-- ---------------------------------------------------------------------------
-- Audit log: readable with audit.read, writable by nobody via the API
-- ---------------------------------------------------------------------------
grant select on public.audit_logs to authenticated;
create policy audit_logs_read on public.audit_logs
  for select to authenticated using ((select app_private.has_permission('audit.read')));

-- ---------------------------------------------------------------------------
-- Contributions and their history
-- ---------------------------------------------------------------------------
grant select on public.contributions, public.contribution_revisions,
  public.contribution_reviews, public.contribution_flags to authenticated;

create policy contributions_select_own on public.contributions
  for select to authenticated using (submitted_by = (select auth.uid()));
create policy contributions_select_staff on public.contributions
  for select to authenticated using ((select app_private.has_permission('contributions.read')));

create policy revisions_select_own on public.contribution_revisions
  for select to authenticated
  using (exists (
    select 1 from public.contributions c
    where c.id = contribution_revisions.contribution_id and c.submitted_by = (select auth.uid())
  ));
create policy revisions_select_staff on public.contribution_revisions
  for select to authenticated using ((select app_private.has_permission('contributions.read')));

-- Owners only see the outcome events, never internal flags or "start review" noise.
create policy reviews_select_own on public.contribution_reviews
  for select to authenticated
  using (
    action in ('approve', 'reject', 'request_changes')
    and exists (
      select 1 from public.contributions c
      where c.id = contribution_reviews.contribution_id and c.submitted_by = (select auth.uid())
    )
  );
create policy reviews_select_staff on public.contribution_reviews
  for select to authenticated using ((select app_private.has_permission('contributions.read')));

create policy flags_select_staff on public.contribution_flags
  for select to authenticated using ((select app_private.has_permission('contributions.read')));

-- ---------------------------------------------------------------------------
-- Resources. Column-level grants keep who created / published / contributed a
-- resource private; only the opt-in `credit` text is public.
-- ---------------------------------------------------------------------------
grant select (
  id, subject_id, title, description, resource_type, external_url, file_name, file_size,
  mime_type, tags, credit, verified, downloads_count, published_at, status, created_at, updated_at
) on public.resources to anon, authenticated;

create policy resources_select_published on public.resources
  for select to anon, authenticated using (status = 'published');
create policy resources_select_staff on public.resources
  for select to authenticated
  using (
    (select app_private.has_permission('resources.create'))
    or (select app_private.has_permission('resources.edit'))
    or (select app_private.has_permission('resources.publish'))
    or (select app_private.has_permission('resources.archive'))
  );

-- upload_validations: RLS on, no policies, no grants => service role only.

-- ---------------------------------------------------------------------------
-- Personal data: strictly own rows
-- ---------------------------------------------------------------------------
grant select, insert, delete on public.bookmarks to authenticated;
create policy bookmarks_select_own on public.bookmarks
  for select to authenticated using (user_id = (select auth.uid()));
create policy bookmarks_insert_own on public.bookmarks
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select app_private.current_user_active())
    and exists (select 1 from public.resources r where r.id = bookmarks.resource_id and r.status = 'published')
  );
create policy bookmarks_delete_own on public.bookmarks
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, delete on public.notifications to authenticated;
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_delete_own on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert on public.user_preferences to authenticated;
grant update (default_branch_id, default_academic_year, default_semester, settings) on public.user_preferences to authenticated;
create policy preferences_select_own on public.user_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy preferences_insert_own on public.user_preferences
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select app_private.current_user_active()));
create policy preferences_update_own on public.user_preferences
  for update to authenticated
  using (user_id = (select auth.uid()) and (select app_private.current_user_active()))
  with check (user_id = (select auth.uid()));

-- A policy may not query its own table (infinite recursion), so the per-student cap uses
-- a SECURITY DEFINER counter that only ever counts the caller's own rows.
create or replace function app_private.my_attendance_course_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) from public.attendance_courses where user_id = (select auth.uid());
$$;
revoke all on function app_private.my_attendance_course_count() from public;
grant execute on function app_private.my_attendance_course_count() to authenticated;

grant select, insert, delete on public.attendance_courses to authenticated;
grant update (semester_type, session_label, course_name, course_code, attended, total, min_required_percent)
  on public.attendance_courses to authenticated;
create policy attendance_select_own on public.attendance_courses
  for select to authenticated using (user_id = (select auth.uid()));
create policy attendance_insert_own on public.attendance_courses
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select app_private.current_user_active())
    and (select app_private.my_attendance_course_count()) < 60
  );
create policy attendance_update_own on public.attendance_courses
  for update to authenticated
  using (user_id = (select auth.uid()) and (select app_private.current_user_active()))
  with check (user_id = (select auth.uid()));
create policy attendance_delete_own on public.attendance_courses
  for delete to authenticated using (user_id = (select auth.uid()));

grant select on public.resource_reports to authenticated;
create policy reports_select_own on public.resource_reports
  for select to authenticated using (reporter_id = (select auth.uid()));
create policy reports_select_staff on public.resource_reports
  for select to authenticated using ((select app_private.has_permission('resources.edit')));

grant select on public.feedback to authenticated;
create policy feedback_select_own on public.feedback
  for select to authenticated using (user_id = (select auth.uid()));
create policy feedback_select_staff on public.feedback
  for select to authenticated using ((select app_private.has_permission('resources.edit')));

-- ---------------------------------------------------------------------------
-- Function privileges (everything was revoked above; grant back deliberately)
-- ---------------------------------------------------------------------------
-- Used inside RLS / storage policies, so the evaluating role needs EXECUTE.
grant execute on function app_private.has_permission(text) to anon, authenticated;
grant execute on function app_private.current_user_active() to anon, authenticated;
grant execute on function app_private.is_published_object(text) to anon, authenticated;
grant execute on function app_private.is_live_object(text) to anon, authenticated;

-- Callable RPCs for signed-in users (each re-checks its own authority).
grant execute on function
  public.my_access(),
  public.mark_notifications_read(uuid[]),
  public.submit_contribution(uuid, text, text, text, text, text, text),
  public.resubmit_contribution(uuid, uuid, text, text, text, boolean, text, text, text),
  public.withdraw_contribution(uuid),
  public.claim_contribution(uuid),
  public.review_contribution(uuid, text, text),
  public.contribution_publish_path(uuid),
  public.approve_contribution(uuid, text),
  public.create_resource(uuid, text, text, text, text, text, text[], text, boolean),
  public.update_resource(uuid, uuid, text, text, text, text[], text, boolean, text, text),
  public.set_resource_status(uuid, text),
  public.delete_resource(uuid),
  public.report_resource(uuid, text, text),
  public.resolve_report(uuid, text),
  public.submit_feedback(text, text),
  public.resolve_feedback(uuid),
  public.set_user_role(uuid, text),
  public.grant_user_permission(uuid, text),
  public.revoke_user_permission(uuid, text),
  public.set_account_status(uuid, text, text),
  public.transfer_super_admin(uuid, text, text),
  public.set_app_setting(text, jsonb)
to authenticated;

grant execute on function public.record_download(uuid) to anon, authenticated;
grant execute on function public.resource_file_path(uuid) to anon, authenticated;

-- Service role only: server-side upload validation, retention job, one-time bootstrap.
grant execute on function
  public.record_upload_validation(text, text, uuid, text, text, bigint, text),
  public.list_purgeable_files(),
  public.mark_files_purged(text, text[]),
  public.bootstrap_super_admin(uuid)
to service_role;

-- ---------------------------------------------------------------------------
-- Supabase Auth hook: enforce the allowed email domain at sign-up.
-- Enable it in Dashboard > Authentication > Hooks > "Before User Created"
-- (or supabase/config.toml for local development).
-- ---------------------------------------------------------------------------
create or replace function public.hook_before_user_created(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email text := lower(coalesce(event -> 'user' ->> 'email', ''));
begin
  if v_email = '' then
    return jsonb_build_object('error', jsonb_build_object(
      'message', 'An email address is required to sign up.', 'http_code', 400));
  end if;

  if exists (
       select 1 from public.app_settings s
       where s.key = 'allowed_email_domains' and jsonb_array_length(s.value) > 0
     )
     and not exists (
       select 1
       from public.app_settings s, jsonb_array_elements_text(s.value) d (dom)
       where s.key = 'allowed_email_domains' and lower(d.dom) = split_part(v_email, '@', 2)
     ) then
    return jsonb_build_object('error', jsonb_build_object(
      'message', 'Sign-ups are limited to approved college email addresses.', 'http_code', 403));
  end if;

  return '{}'::jsonb;
end;
$$;

grant usage on schema public to supabase_auth_admin;
revoke all on function public.hook_before_user_created(jsonb) from public, anon, authenticated;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
