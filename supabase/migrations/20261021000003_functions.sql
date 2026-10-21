-- =============================================================================
-- 0003 Privileged operations (SECURITY DEFINER RPCs)
-- =============================================================================
-- API roles have NO write grants on privileged tables. Everything that changes
-- state goes through these functions, each of which:
--   1. resolves the caller from auth.uid() (never from an argument),
--   2. re-checks the caller's authority against trusted tables,
--   3. locks the affected row and validates the state transition,
--   4. writes the audit log / notification in the same transaction.
-- EXECUTE grants are set explicitly in 0005_grants_and_rls.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Internal helpers
-- -----------------------------------------------------------------------------
create or replace function app_private.notify(
  p_user uuid, p_type text, p_title text, p_message text, p_link text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, title, message, link)
  values (p_user, p_type, left(p_title, 160), left(p_message, 1000), p_link);
$$;

create or replace function app_private.is_resource_category(p_value text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  perform p_value::public.resource_category;
  return p_value is not null;
exception when check_violation then
  return false;
end;
$$;

create or replace function app_private.normalize_tags(p_tags text[])
returns text[]
language sql
immutable
set search_path = ''
as $$
  select coalesce(array(
    select distinct s.t
    from (select lower(btrim(x)) as t from unnest(coalesce(p_tags, '{}'::text[])) as x) s
    where s.t <> '' and char_length(s.t) <= 30
    order by s.t
    limit 12
  ), '{}'::text[]);
$$;

create or replace function app_private.setting_int(p_key text, p_default bigint)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (s.value #>> '{}')::bigint from public.app_settings s where s.key = p_key), p_default);
$$;

create or replace function app_private.assert_content_input(
  p_subject_id uuid, p_title text, p_description text, p_resource_type text, p_credit text
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.subjects where id = p_subject_id) then
    perform app_private.fail('invalid_input', 'Unknown subject.');
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 5 and 160 then
    perform app_private.fail('invalid_input', 'Title must be 5 to 160 characters.');
  end if;
  if p_description is not null and char_length(p_description) > 2000 then
    perform app_private.fail('invalid_input', 'Description must be at most 2000 characters.');
  end if;
  if not app_private.is_resource_category(p_resource_type) then
    perform app_private.fail('invalid_input', 'Unknown resource category.');
  end if;
  if p_credit is not null and char_length(btrim(p_credit)) not between 1 and 120 then
    perform app_private.fail('invalid_input', 'Credit must be 1 to 120 characters.');
  end if;
end;
$$;

-- Consumes the server-side validation record for an uploaded object. Fails if the
-- file was never validated, was already used, or the object changed afterwards.
create or replace function app_private.consume_validation(p_bucket text, p_path text, p_user uuid)
returns public.upload_validations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.upload_validations;
  v_object_id uuid;
begin
  select * into v
  from public.upload_validations
  where bucket = p_bucket and path = p_path and user_id = p_user
  for update;
  if not found then
    perform app_private.fail('upload_not_validated', 'This file has not been validated by the server. Upload it again.');
  end if;
  if v.consumed_at is not null then
    perform app_private.fail('upload_already_used', 'This uploaded file was already submitted.');
  end if;

  select o.id into v_object_id from storage.objects o where o.bucket_id = p_bucket and o.name = p_path;
  if v_object_id is distinct from v.object_id then
    perform app_private.fail('upload_changed', 'The stored file changed after validation. Upload it again.');
  end if;

  if not exists (
    select 1 from public.app_settings s
    where s.key = 'allowed_file_types' and s.value @> jsonb_build_array(v.detected_type)
  ) then
    perform app_private.fail('file_type_not_allowed', 'This file type is not currently accepted.');
  end if;
  if v.size_bytes > app_private.setting_int('max_upload_bytes', 26214400) then
    perform app_private.fail('file_too_large', 'This file exceeds the current size limit.');
  end if;

  update public.upload_validations set consumed_at = now() where id = v.id;
  return v;
end;
$$;

create or replace function app_private.publish_path(p_contribution uuid, p_file_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'approved/' || p_contribution::text || '/'
    || regexp_replace(coalesce(nullif(p_file_name, ''), 'file'), '[^A-Za-z0-9._-]', '_', 'g');
$$;

-- -----------------------------------------------------------------------------
-- Session / access
-- -----------------------------------------------------------------------------
create or replace function public.my_access()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'user_id', p.id,
    'email', p.email,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'status', p.account_status,
    'login_allowed', app_private.is_login_allowed(p.id),
    'role', ur.role_id,
    'role_name', r.name,
    'permissions', coalesce(
      (select jsonb_agg(e.key order by e.key) from app_private.effective_permissions(p.id) as e (key)),
      '[]'::jsonb
    ),
    'unread_notifications', (
      select count(*) from public.notifications n where n.user_id = p.id and n.read_at is null
    )
  )
  from public.profiles p
  left join public.user_roles ur on ur.user_id = p.id
  left join public.roles r on r.id = ur.role_id
  where p.id = (select auth.uid());
$$;

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_user();
  v_count integer;
begin
  update public.notifications n
  set read_at = now()
  where n.user_id = v_uid and n.read_at is null and (p_ids is null or n.id = any (p_ids));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -----------------------------------------------------------------------------
-- Student contributions
-- -----------------------------------------------------------------------------
create or replace function public.submit_contribution(
  p_subject_id uuid,
  p_title text,
  p_description text,
  p_resource_type text,
  p_external_url text,
  p_storage_path text,
  p_credit text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_active();
  v_title text := btrim(p_title);
  v_desc text := nullif(btrim(coalesce(p_description, '')), '');
  v_credit text := nullif(btrim(coalesce(p_credit, '')), '');
  v_val public.upload_validations;
  v_id uuid;
begin
  perform app_private.assert_content_input(p_subject_id, v_title, v_desc, p_resource_type, v_credit);

  if (p_external_url is null) = (p_storage_path is null) then
    perform app_private.fail('invalid_input', 'Provide either an uploaded file or an external link.');
  end if;
  if p_external_url is not null and not app_private.is_safe_https_url(p_external_url) then
    perform app_private.fail('invalid_url', 'External links must be public https:// URLs.');
  end if;

  if (select count(*) from public.contributions
      where submitted_by = v_uid and status in ('pending', 'in_review', 'changes_requested'))
     >= app_private.setting_int('max_open_contributions', 10) then
    perform app_private.fail('rate_limited', 'You have too many contributions awaiting review. Wait for some to be reviewed.');
  end if;
  if (select count(*) from public.contributions
      where submitted_by = v_uid and created_at > now() - interval '24 hours') >= 20 then
    perform app_private.fail('rate_limited', 'Daily submission limit reached. Try again tomorrow.');
  end if;

  if p_storage_path is not null then
    if split_part(p_storage_path, '/', 1) <> v_uid::text then
      perform app_private.fail('forbidden', 'That file does not belong to you.');
    end if;
    v_val := app_private.consume_validation('contributions-private', p_storage_path, v_uid);
  end if;

  insert into public.contributions (
    submitted_by, subject_id, title, description, resource_type,
    storage_path, external_url, file_name, file_size, mime_type, contributor_credit
  ) values (
    v_uid, p_subject_id, v_title, v_desc, p_resource_type::public.resource_category,
    p_storage_path, p_external_url, v_val.original_name, v_val.size_bytes, v_val.mime_type, v_credit
  )
  returning id into v_id;

  insert into public.contribution_revisions (
    contribution_id, revision, subject_id, title, description, resource_type,
    storage_path, external_url, file_name, file_size, mime_type
  )
  select id, revision, subject_id, title, description, resource_type,
         storage_path, external_url, file_name, file_size, mime_type
  from public.contributions where id = v_id;

  return v_id;
end;
$$;

create or replace function public.resubmit_contribution(
  p_id uuid,
  p_subject_id uuid,
  p_title text,
  p_description text,
  p_resource_type text,
  p_keep_source boolean,
  p_external_url text,
  p_storage_path text,
  p_credit text default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_active();
  c public.contributions;
  v_title text := btrim(p_title);
  v_desc text := nullif(btrim(coalesce(p_description, '')), '');
  v_credit text := nullif(btrim(coalesce(p_credit, '')), '');
  v_val public.upload_validations;
begin
  select * into c from public.contributions where id = p_id for update;
  if not found or c.submitted_by <> v_uid then
    perform app_private.fail('not_found', 'Contribution not found.');
  end if;
  if c.status <> 'changes_requested' then
    perform app_private.fail('invalid_state', 'Only submissions with requested changes can be resubmitted.');
  end if;

  perform app_private.assert_content_input(p_subject_id, v_title, v_desc, p_resource_type, v_credit);

  if coalesce(p_keep_source, false) then
    if p_external_url is not null or p_storage_path is not null then
      perform app_private.fail('invalid_input', 'Either keep the current source or provide a new one.');
    end if;
    if c.storage_path is null and c.external_url is null then
      perform app_private.fail('invalid_input', 'The original file was removed. Upload it again.');
    end if;
  else
    if (p_external_url is null) = (p_storage_path is null) then
      perform app_private.fail('invalid_input', 'Provide either an uploaded file or an external link.');
    end if;
    if p_external_url is not null and not app_private.is_safe_https_url(p_external_url) then
      perform app_private.fail('invalid_url', 'External links must be public https:// URLs.');
    end if;
    if p_storage_path is not null then
      if split_part(p_storage_path, '/', 1) <> v_uid::text then
        perform app_private.fail('forbidden', 'That file does not belong to you.');
      end if;
      v_val := app_private.consume_validation('contributions-private', p_storage_path, v_uid);
    end if;
  end if;

  update public.contributions set
    subject_id = p_subject_id,
    title = v_title,
    description = v_desc,
    resource_type = p_resource_type::public.resource_category,
    contributor_credit = v_credit,
    storage_path = case when coalesce(p_keep_source, false) then storage_path else p_storage_path end,
    external_url = case when coalesce(p_keep_source, false) then external_url else p_external_url end,
    file_name = case when coalesce(p_keep_source, false) then file_name else v_val.original_name end,
    file_size = case when coalesce(p_keep_source, false) then file_size else v_val.size_bytes end,
    mime_type = case when coalesce(p_keep_source, false) then mime_type else v_val.mime_type end,
    files_purged_at = case when coalesce(p_keep_source, false) then files_purged_at else null end,
    revision = revision + 1,
    status = 'pending',
    review_feedback = null,
    reviewed_by = null,
    reviewed_at = null,
    claimed_by = null
  where id = p_id
  returning * into c;

  insert into public.contribution_revisions (
    contribution_id, revision, subject_id, title, description, resource_type,
    storage_path, external_url, file_name, file_size, mime_type
  ) values (
    c.id, c.revision, c.subject_id, c.title, c.description, c.resource_type,
    c.storage_path, c.external_url, c.file_name, c.file_size, c.mime_type
  );

  return c.revision;
end;
$$;

create or replace function public.withdraw_contribution(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_user();
  c public.contributions;
begin
  select * into c from public.contributions where id = p_id for update;
  if not found or c.submitted_by <> v_uid then
    perform app_private.fail('not_found', 'Contribution not found.');
  end if;
  if c.status not in ('pending', 'changes_requested', 'rejected') then
    perform app_private.fail('invalid_state', 'This contribution can no longer be withdrawn.');
  end if;
  delete from public.contributions where id = p_id;
  perform app_private.write_audit('contribution.withdraw', 'contribution', p_id::text,
    jsonb_build_object('status', c.status));
end;
$$;

-- -----------------------------------------------------------------------------
-- Moderation
-- -----------------------------------------------------------------------------
create or replace function public.claim_contribution(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_permission('contributions.review');
  c public.contributions;
begin
  select * into c from public.contributions where id = p_id for update;
  if not found then
    perform app_private.fail('not_found', 'Contribution not found.');
  end if;
  if c.submitted_by = v_uid then
    perform app_private.fail('forbidden', 'You cannot review your own submission.');
  end if;
  if c.status <> 'pending' then
    perform app_private.fail('invalid_state', 'Only pending contributions can be moved to review.');
  end if;

  update public.contributions set status = 'in_review', claimed_by = v_uid where id = p_id;
  insert into public.contribution_reviews (contribution_id, revision, reviewer_id, action)
  values (p_id, c.revision, v_uid, 'start_review');

  perform app_private.notify(c.submitted_by, 'contribution_in_review', 'Your contribution is being reviewed',
    '"' || c.title || '" has been picked up by a moderator.', '/account/contributions/' || p_id::text);
  perform app_private.write_audit('contribution.claim', 'contribution', p_id::text,
    jsonb_build_object('revision', c.revision));
end;
$$;

create or replace function public.review_contribution(p_id uuid, p_action text, p_feedback text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  c public.contributions;
  v_feedback text := nullif(btrim(coalesce(p_feedback, '')), '');
  v_status text;
begin
  if p_action not in ('reject', 'request_changes', 'flag', 'unflag') then
    perform app_private.fail('invalid_input', 'Unsupported review action.');
  end if;
  v_uid := app_private.require_permission(
    case p_action when 'reject' then 'contributions.reject' else 'contributions.review' end
  );

  select * into c from public.contributions where id = p_id for update;
  if not found then
    perform app_private.fail('not_found', 'Contribution not found.');
  end if;
  if c.submitted_by = v_uid then
    perform app_private.fail('forbidden', 'You cannot review your own submission.');
  end if;
  if c.status not in ('pending', 'in_review') then
    perform app_private.fail('invalid_state', 'This contribution has already been reviewed.');
  end if;
  if p_action in ('reject', 'request_changes', 'flag') and char_length(coalesce(v_feedback, '')) < 3 then
    perform app_private.fail('feedback_required', 'Feedback is required for this action.');
  end if;
  if p_action = 'unflag' and not exists (select 1 from public.contribution_flags where contribution_id = p_id) then
    perform app_private.fail('invalid_state', 'This contribution is not flagged.');
  end if;
  if p_action = 'flag' and exists (select 1 from public.contribution_flags where contribution_id = p_id) then
    perform app_private.fail('invalid_state', 'This contribution is already flagged.');
  end if;

  if p_action = 'flag' then
    insert into public.contribution_flags (contribution_id, flagged_by, reason) values (p_id, v_uid, v_feedback);
  elsif p_action = 'unflag' then
    delete from public.contribution_flags where contribution_id = p_id;
  else
    v_status := case p_action when 'reject' then 'rejected' else 'changes_requested' end;
    update public.contributions
    set status = v_status,
        reviewed_by = v_uid,
        reviewed_at = now(),
        review_feedback = v_feedback
    where id = p_id;

    perform app_private.notify(
      c.submitted_by,
      case p_action when 'reject' then 'contribution_rejected' else 'contribution_changes_requested' end,
      case p_action when 'reject' then 'Contribution not accepted' else 'Changes requested on your contribution' end,
      '"' || c.title || '": ' || v_feedback,
      '/account/contributions/' || p_id::text
    );
  end if;

  insert into public.contribution_reviews (contribution_id, revision, reviewer_id, action, feedback)
  values (p_id, c.revision, v_uid, p_action, v_feedback);
  perform app_private.write_audit('contribution.' || p_action, 'contribution', p_id::text,
    jsonb_build_object('revision', c.revision));
end;
$$;

-- Deterministic destination of an approved file in the published bucket. The server
-- copies the object there (service role) BEFORE calling approve_contribution, which
-- only trusts this computed path, never a caller-supplied one.
create or replace function public.contribution_publish_path(p_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.contributions;
begin
  perform app_private.require_permission('contributions.approve');
  select * into c from public.contributions where id = p_id;
  if not found or c.storage_path is null then
    perform app_private.fail('not_found', 'Contribution not found or has no hosted file.');
  end if;
  return app_private.publish_path(c.id, c.file_name);
end;
$$;

create or replace function public.approve_contribution(p_id uuid, p_feedback text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_permission('contributions.approve');
  c public.contributions;
  v_feedback text := nullif(btrim(coalesce(p_feedback, '')), '');
  v_path text;
  v_resource uuid;
begin
  select * into c from public.contributions where id = p_id for update;
  if not found then
    perform app_private.fail('not_found', 'Contribution not found.');
  end if;
  if c.submitted_by = v_uid then
    perform app_private.fail('forbidden', 'You cannot approve your own submission.');
  end if;
  if c.status not in ('pending', 'in_review') then
    perform app_private.fail('invalid_state', 'This contribution has already been reviewed.');
  end if;
  if exists (select 1 from public.contribution_flags where contribution_id = p_id) then
    perform app_private.fail('flagged', 'Resolve the flag on this contribution before approving it.');
  end if;
  if exists (select 1 from public.resources where source_contribution_id = c.id) then
    perform app_private.fail('conflict', 'A resource already exists for this contribution.');
  end if;

  if c.storage_path is not null then
    v_path := app_private.publish_path(c.id, c.file_name);
    if not exists (
      select 1 from storage.objects o where o.bucket_id = 'resources-published' and o.name = v_path
    ) then
      perform app_private.fail('published_file_missing', 'The file has not been copied to published storage yet.');
    end if;
  elsif c.external_url is null then
    perform app_private.fail('invalid_state', 'The contributed file has been removed.');
  end if;

  insert into public.resources (
    subject_id, title, description, resource_type, storage_path, external_url,
    file_name, file_size, mime_type, credit, verified, source_contribution_id,
    created_by, published_by, published_at, status
  ) values (
    c.subject_id, c.title, c.description, c.resource_type, v_path, c.external_url,
    c.file_name, c.file_size, c.mime_type, c.contributor_credit, true, c.id,
    c.submitted_by, v_uid, now(), 'published'
  )
  returning id into v_resource;

  update public.contributions
  set status = 'approved', reviewed_by = v_uid, reviewed_at = now(), review_feedback = v_feedback
  where id = p_id;

  insert into public.contribution_reviews (contribution_id, revision, reviewer_id, action, feedback)
  values (p_id, c.revision, v_uid, 'approve', v_feedback);

  perform app_private.notify(c.submitted_by, 'contribution_approved', 'Contribution approved',
    '"' || c.title || '" is now live in the resource hub. Thank you!', '/account/contributions/' || p_id::text);
  perform app_private.write_audit('contribution.approve', 'contribution', p_id::text,
    jsonb_build_object('revision', c.revision, 'resource_id', v_resource));
  return v_resource;
end;
$$;

-- -----------------------------------------------------------------------------
-- Resource management (content administrators)
-- -----------------------------------------------------------------------------
create or replace function public.create_resource(
  p_subject_id uuid,
  p_title text,
  p_description text,
  p_resource_type text,
  p_external_url text,
  p_storage_path text,
  p_tags text[] default '{}',
  p_credit text default null,
  p_publish boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_permission('resources.create');
  v_title text := btrim(p_title);
  v_desc text := nullif(btrim(coalesce(p_description, '')), '');
  v_credit text := nullif(btrim(coalesce(p_credit, '')), '');
  v_val public.upload_validations;
  v_id uuid;
begin
  if coalesce(p_publish, false) then
    perform app_private.require_permission('resources.publish');
  end if;
  perform app_private.assert_content_input(p_subject_id, v_title, v_desc, p_resource_type, v_credit);

  if (p_external_url is null) = (p_storage_path is null) then
    perform app_private.fail('invalid_input', 'Provide either an uploaded file or an external link.');
  end if;
  if p_external_url is not null and not app_private.is_safe_https_url(p_external_url) then
    perform app_private.fail('invalid_url', 'External links must be public https:// URLs.');
  end if;
  if p_storage_path is not null then
    if p_storage_path not like 'uploads/' || v_uid::text || '/%' then
      perform app_private.fail('forbidden', 'That file does not belong to you.');
    end if;
    v_val := app_private.consume_validation('resources-published', p_storage_path, v_uid);
  end if;

  insert into public.resources (
    subject_id, title, description, resource_type, storage_path, external_url,
    file_name, file_size, mime_type, tags, credit, verified, created_by,
    published_by, published_at, status
  ) values (
    p_subject_id, v_title, v_desc, p_resource_type::public.resource_category, p_storage_path, p_external_url,
    v_val.original_name, v_val.size_bytes, v_val.mime_type, app_private.normalize_tags(p_tags), v_credit, true, v_uid,
    case when coalesce(p_publish, false) then v_uid end,
    case when coalesce(p_publish, false) then now() end,
    case when coalesce(p_publish, false) then 'published' else 'draft' end
  )
  returning id into v_id;

  perform app_private.write_audit('resource.create', 'resource', v_id::text,
    jsonb_build_object('published', coalesce(p_publish, false)));
  return v_id;
end;
$$;

-- Returns the storage path that is no longer referenced (if the file was replaced) so
-- the caller can remove it; null otherwise.
create or replace function public.update_resource(
  p_id uuid,
  p_subject_id uuid,
  p_title text,
  p_description text,
  p_resource_type text,
  p_tags text[],
  p_credit text,
  p_verified boolean,
  p_external_url text default null,
  p_storage_path text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_permission('resources.edit');
  r public.resources;
  v_title text := btrim(p_title);
  v_desc text := nullif(btrim(coalesce(p_description, '')), '');
  v_credit text := nullif(btrim(coalesce(p_credit, '')), '');
  v_val public.upload_validations;
  v_old_path text;
begin
  select * into r from public.resources where id = p_id for update;
  if not found then
    perform app_private.fail('not_found', 'Resource not found.');
  end if;
  perform app_private.assert_content_input(p_subject_id, v_title, v_desc, p_resource_type, v_credit);

  if p_external_url is not null and p_storage_path is not null then
    perform app_private.fail('invalid_input', 'Provide either an uploaded file or an external link, not both.');
  end if;
  if p_external_url is not null and not app_private.is_safe_https_url(p_external_url) then
    perform app_private.fail('invalid_url', 'External links must be public https:// URLs.');
  end if;
  if p_storage_path is not null then
    if p_storage_path not like 'uploads/' || v_uid::text || '/%' then
      perform app_private.fail('forbidden', 'That file does not belong to you.');
    end if;
    v_val := app_private.consume_validation('resources-published', p_storage_path, v_uid);
  end if;

  update public.resources set
    subject_id = p_subject_id,
    title = v_title,
    description = v_desc,
    resource_type = p_resource_type::public.resource_category,
    tags = app_private.normalize_tags(p_tags),
    credit = v_credit,
    verified = coalesce(p_verified, verified),
    storage_path = case when p_external_url is not null then null when p_storage_path is not null then p_storage_path else storage_path end,
    external_url = case when p_storage_path is not null then null when p_external_url is not null then p_external_url else external_url end,
    file_name = case when p_external_url is not null then null when p_storage_path is not null then v_val.original_name else file_name end,
    file_size = case when p_external_url is not null then null when p_storage_path is not null then v_val.size_bytes else file_size end,
    mime_type = case when p_external_url is not null then null when p_storage_path is not null then v_val.mime_type else mime_type end
  where id = p_id;

  if r.storage_path is not null and (p_external_url is not null or p_storage_path is not null) then
    v_old_path := r.storage_path;
  end if;

  perform app_private.write_audit('resource.update', 'resource', p_id::text,
    jsonb_build_object('source_replaced', v_old_path is not null or p_storage_path is not null or p_external_url is not null));
  return v_old_path;
end;
$$;

create or replace function public.set_resource_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  r public.resources;
begin
  if p_status not in ('draft', 'published', 'archived') then
    perform app_private.fail('invalid_input', 'Unknown status.');
  end if;
  v_uid := app_private.require_permission(
    case p_status when 'archived' then 'resources.archive' else 'resources.publish' end
  );

  select * into r from public.resources where id = p_id for update;
  if not found then
    perform app_private.fail('not_found', 'Resource not found.');
  end if;
  if r.status = p_status then
    perform app_private.fail('invalid_state', 'Resource already has that status.');
  end if;

  update public.resources
  set status = p_status,
      published_by = case when p_status = 'published' then v_uid else published_by end,
      published_at = case when p_status = 'published' then coalesce(published_at, now()) else published_at end
  where id = p_id;

  perform app_private.write_audit('resource.' || p_status, 'resource', p_id::text,
    jsonb_build_object('from', r.status));
end;
$$;

-- Hard delete. Must be archived (or never published) first, so a live file can never be
-- removed by accident. Returns the storage path for the caller to delete.
create or replace function public.delete_resource(p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_permission('resources.delete');
  r public.resources;
begin
  select * into r from public.resources where id = p_id for update;
  if not found then
    perform app_private.fail('not_found', 'Resource not found.');
  end if;
  if r.status = 'published' then
    perform app_private.fail('invalid_state', 'Archive the resource before deleting it.');
  end if;
  delete from public.resources where id = p_id;
  perform app_private.write_audit('resource.delete', 'resource', p_id::text,
    jsonb_build_object('title', r.title, 'had_file', r.storage_path is not null, 'by', v_uid));
  return r.storage_path;
end;
$$;

-- storage_path is not readable through the API (it would reveal contribution ids), so the
-- file route resolves it here: published resources for everyone, drafts for content staff.
create or replace function public.resource_file_path(p_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select r.storage_path
  from public.resources r
  where r.id = p_id
    and r.storage_path is not null
    and (
      r.status = 'published'
      or app_private.has_permission('resources.create')
      or app_private.has_permission('resources.edit')
    );
$$;

create or replace function public.report_resource(p_resource_id uuid, p_reason text, p_details text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_active();
  v_id uuid;
begin
  if not exists (select 1 from public.resources where id = p_resource_id and status = 'published') then
    perform app_private.fail('not_found', 'Resource not found.');
  end if;
  insert into public.resource_reports (resource_id, reporter_id, reason, details)
  values (p_resource_id, v_uid, p_reason, nullif(btrim(coalesce(p_details, '')), ''))
  returning id into v_id;
  return v_id;
exception
  when unique_violation then
    perform app_private.fail('conflict', 'You already have an open report for this resource.');
  when check_violation then
    perform app_private.fail('invalid_input', 'Invalid report.');
end;
$$;

create or replace function public.resolve_report(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_permission('resources.edit');
begin
  if p_status not in ('resolved', 'dismissed') then
    perform app_private.fail('invalid_input', 'Unknown status.');
  end if;
  update public.resource_reports
  set status = p_status, resolved_by = v_uid, resolved_at = now()
  where id = p_id and status = 'open';
  if not found then
    perform app_private.fail('not_found', 'Open report not found.');
  end if;
  perform app_private.write_audit('report.' || p_status, 'report', p_id::text);
end;
$$;

create or replace function public.submit_feedback(p_message text, p_contact_email text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_active();
  v_message text := btrim(coalesce(p_message, ''));
  v_id uuid;
begin
  if char_length(v_message) not between 3 and 2000 then
    perform app_private.fail('invalid_input', 'Feedback must be between 3 and 2000 characters.');
  end if;
  if (select count(*) from public.feedback where user_id = v_uid and created_at > now() - interval '24 hours') >= 5 then
    perform app_private.fail('rate_limited', 'You have sent a lot of feedback today. Please try again tomorrow.');
  end if;
  insert into public.feedback (user_id, message, contact_email)
  values (v_uid, v_message, nullif(left(btrim(coalesce(p_contact_email, '')), 200), ''))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.resolve_feedback(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_permission('resources.edit');
begin
  update public.feedback set status = 'handled', handled_by = v_uid, handled_at = now()
  where id = p_id and status = 'new';
  if not found then
    perform app_private.fail('not_found', 'Open feedback not found.');
  end if;
  perform app_private.write_audit('feedback.handled', 'feedback', p_id::text);
end;
$$;

create or replace function public.record_download(p_resource_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.resources set downloads_count = downloads_count + 1
  where id = p_resource_id and status = 'published';
$$;

-- -----------------------------------------------------------------------------
-- Accounts, roles, permissions (super admin)
-- -----------------------------------------------------------------------------
create or replace function public.set_user_role(p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_permission('roles.manage');
  v_old text;
  v_assignable boolean;
  v_status text;
begin
  if p_user = v_uid then
    perform app_private.fail('forbidden', 'You cannot change your own role.');
  end if;

  select ur.role_id, p.account_status into v_old, v_status
  from public.user_roles ur join public.profiles p on p.id = ur.user_id
  where ur.user_id = p_user
  for update of ur;
  if not found then
    perform app_private.fail('not_found', 'User not found.');
  end if;
  if v_old = 'super_admin' then
    perform app_private.fail('forbidden', 'The super admin role can only be moved with transfer_super_admin.');
  end if;

  select assignable into v_assignable from public.roles where id = p_role;
  if not found then
    perform app_private.fail('invalid_input', 'Unknown role.');
  end if;
  if not v_assignable then
    perform app_private.fail('forbidden', 'This role cannot be assigned directly.');
  end if;
  if p_role <> 'student' and v_status <> 'active' then
    perform app_private.fail('invalid_state', 'Reactivate the account before assigning a staff role.');
  end if;
  if v_old = p_role then
    perform app_private.fail('invalid_state', 'User already has that role.');
  end if;

  update public.user_roles set role_id = p_role, assigned_by = v_uid, assigned_at = now()
  where user_id = p_user;
  if p_role = 'student' then
    delete from public.user_permissions where user_id = p_user;
  end if;

  perform app_private.write_audit('role.assign', 'user', p_user::text,
    jsonb_build_object('from', v_old, 'to', p_role));
  perform app_private.notify(p_user, 'role_changed', 'Your role changed',
    'Your role is now ' || (select name from public.roles where id = p_role) || '.', '/account');
end;
$$;

create or replace function public.grant_user_permission(p_user uuid, p_permission text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_permission('roles.manage');
  v_perm public.permissions;
  v_role text;
  v_status text;
begin
  select * into v_perm from public.permissions where key = p_permission;
  if not found then
    perform app_private.fail('invalid_input', 'Unknown permission.');
  end if;
  if not v_perm.delegable then
    perform app_private.fail('forbidden', 'This permission cannot be granted individually.');
  end if;
  -- An admin can never hand out more authority than they hold themselves.
  if not app_private.user_has_permission(v_uid, p_permission) then
    perform app_private.fail('forbidden', 'You cannot grant a permission you do not hold.');
  end if;

  select ur.role_id, p.account_status into v_role, v_status
  from public.user_roles ur join public.profiles p on p.id = ur.user_id
  where ur.user_id = p_user;
  if not found then
    perform app_private.fail('not_found', 'User not found.');
  end if;
  if v_role not in ('file_moderator', 'content_admin') then
    perform app_private.fail('invalid_state', 'Individual permissions can only be granted to moderators and content administrators.');
  end if;
  if v_status <> 'active' then
    perform app_private.fail('invalid_state', 'Account is suspended.');
  end if;
  if exists (
    select 1 from public.role_permissions rp where rp.role_id = v_role and rp.permission_id = v_perm.id
  ) or exists (
    select 1 from public.user_permissions up where up.user_id = p_user and up.permission_id = v_perm.id
  ) then
    perform app_private.fail('conflict', 'User already has that permission.');
  end if;

  insert into public.user_permissions (user_id, permission_id, granted_by) values (p_user, v_perm.id, v_uid);
  perform app_private.write_audit('permission.grant', 'user', p_user::text, jsonb_build_object('permission', p_permission));
  perform app_private.notify(p_user, 'permissions_changed', 'Permissions updated',
    'You were granted: ' || v_perm.description || '.', '/account');
end;
$$;

create or replace function public.revoke_user_permission(p_user uuid, p_permission text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_permission('roles.manage');
  v_perm public.permissions;
begin
  select * into v_perm from public.permissions where key = p_permission;
  if not found then
    perform app_private.fail('invalid_input', 'Unknown permission.');
  end if;
  delete from public.user_permissions where user_id = p_user and permission_id = v_perm.id;
  if not found then
    perform app_private.fail('not_found', 'That individual permission is not granted to this user.');
  end if;
  perform app_private.write_audit('permission.revoke', 'user', p_user::text,
    jsonb_build_object('permission', p_permission, 'by', v_uid));
  perform app_private.notify(p_user, 'permissions_changed', 'Permissions updated',
    'A permission was removed: ' || v_perm.description || '.', '/account');
end;
$$;

create or replace function public.set_account_status(p_user uuid, p_status text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_permission('users.suspend');
  v_role text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if p_status not in ('active', 'suspended') then
    perform app_private.fail('invalid_input', 'Unknown status.');
  end if;
  if p_user = v_uid then
    perform app_private.fail('forbidden', 'You cannot change your own account status.');
  end if;
  if p_status = 'suspended' and v_reason is null then
    perform app_private.fail('feedback_required', 'A reason is required to suspend an account.');
  end if;

  select ur.role_id into v_role from public.user_roles ur where ur.user_id = p_user;
  if not found then
    perform app_private.fail('not_found', 'User not found.');
  end if;
  if v_role = 'super_admin' then
    perform app_private.fail('forbidden', 'The super admin account cannot be suspended.');
  end if;
  if v_role <> 'student' and not app_private.user_has_permission(v_uid, 'roles.manage') then
    perform app_private.fail('forbidden', 'Only the super admin can suspend staff accounts.');
  end if;

  update public.profiles
  set account_status = p_status,
      suspended_at = case when p_status = 'suspended' then now() end,
      suspended_by = case when p_status = 'suspended' then v_uid end,
      suspension_reason = case when p_status = 'suspended' then v_reason end
  where id = p_user;

  perform app_private.write_audit(
    case p_status when 'suspended' then 'user.suspend' else 'user.reactivate' end,
    'user', p_user::text, jsonb_build_object('reason', v_reason));
  if p_status = 'active' then
    perform app_private.notify(p_user, 'account_status_changed', 'Account reactivated',
      'Your account has been reactivated.', '/account');
  end if;
end;
$$;

-- Atomic, audited ownership transfer. The only way the super admin role ever moves.
create or replace function public.transfer_super_admin(
  p_new_owner uuid,
  p_demote_to text default 'content_admin',
  p_confirmation text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_permission('roles.manage');
begin
  if not exists (select 1 from public.user_roles where user_id = v_uid and role_id = 'super_admin') then
    perform app_private.fail('forbidden', 'Only the super admin can transfer ownership.');
  end if;
  if p_confirmation is distinct from 'TRANSFER SUPER ADMIN' then
    perform app_private.fail('invalid_input', 'Confirmation text does not match.');
  end if;
  if p_new_owner = v_uid then
    perform app_private.fail('invalid_input', 'Choose a different account.');
  end if;
  if p_demote_to not in ('student', 'file_moderator', 'content_admin') then
    perform app_private.fail('invalid_input', 'Invalid role for the outgoing super admin.');
  end if;
  if not app_private.is_login_allowed(p_new_owner) then
    perform app_private.fail('invalid_state', 'The new owner must be an active account.');
  end if;
  if not exists (select 1 from public.user_roles where user_id = p_new_owner) then
    perform app_private.fail('not_found', 'User not found.');
  end if;

  update public.user_roles set role_id = p_demote_to, assigned_by = v_uid, assigned_at = now()
  where user_id = v_uid;
  update public.user_roles set role_id = 'super_admin', assigned_by = v_uid, assigned_at = now()
  where user_id = p_new_owner;
  delete from public.user_permissions where user_id = p_new_owner;

  perform app_private.write_audit('super_admin.transfer', 'user', p_new_owner::text,
    jsonb_build_object('previous_owner', v_uid, 'previous_owner_new_role', p_demote_to));
  perform app_private.notify(p_new_owner, 'role_changed', 'You are now the super admin',
    'Ownership of this application was transferred to you.', '/admin');
  perform app_private.notify(v_uid, 'role_changed', 'Ownership transferred',
    'You are no longer the super admin.', '/account');
end;
$$;

-- One-time bootstrap. NOT callable by API roles; run it with the service role (see
-- scripts/bootstrap-super-admin.mjs) or from the SQL editor as the postgres user.
create or replace function public.bootstrap_super_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select s.super_admin_bootstrapped from app_private.system_state s)
     or exists (select 1 from public.user_roles where role_id = 'super_admin') then
    perform app_private.fail('conflict', 'A super admin already exists.');
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id and account_status = 'active') then
    perform app_private.fail('not_found', 'No active profile for that user. They must sign in with Google once first.');
  end if;

  update public.user_roles set role_id = 'super_admin', assigned_by = null, assigned_at = now()
  where user_id = p_user_id;
  update app_private.system_state set super_admin_bootstrapped = true;
  perform app_private.write_audit('super_admin.bootstrap', 'user', p_user_id::text);
end;
$$;

-- -----------------------------------------------------------------------------
-- Application settings
-- -----------------------------------------------------------------------------
create or replace function public.set_app_setting(p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app_private.require_permission('settings.manage');
  v_old jsonb;
  v_int bigint;
  v_el jsonb;
begin
  select value into v_old from public.app_settings where key = p_key for update;
  if not found then
    perform app_private.fail('not_found', 'Unknown setting.');
  end if;

  if p_key = 'allowed_email_domains' then
    if jsonb_typeof(p_value) <> 'array' or jsonb_array_length(p_value) > 10 then
      perform app_private.fail('invalid_input', 'Provide up to 10 domains.');
    end if;
    for v_el in select * from jsonb_array_elements(p_value) loop
      if jsonb_typeof(v_el) <> 'string'
         or (v_el #>> '{}') !~ '^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$' then
        perform app_private.fail('invalid_input', 'Domains must be lowercase, like example.edu (no @).');
      end if;
    end loop;
  elsif p_key = 'allowed_file_types' then
    if jsonb_typeof(p_value) <> 'array' or jsonb_array_length(p_value) = 0 then
      perform app_private.fail('invalid_input', 'Select at least one file type.');
    end if;
    for v_el in select * from jsonb_array_elements(p_value) loop
      if jsonb_typeof(v_el) <> 'string' or (v_el #>> '{}') not in ('pdf', 'png', 'jpg', 'docx', 'pptx') then
        perform app_private.fail('invalid_input', 'Unsupported file type.');
      end if;
    end loop;
  else
    if jsonb_typeof(p_value) <> 'number' or (p_value #>> '{}') !~ '^[0-9]+$' then
      perform app_private.fail('invalid_input', 'Value must be a whole number.');
    end if;
    v_int := (p_value #>> '{}')::bigint;
    if p_key = 'max_upload_bytes' and v_int not between 1048576 and 52428800 then
      perform app_private.fail('invalid_input', 'Upload limit must be between 1 MiB and 50 MiB.');
    elsif p_key = 'max_open_contributions' and v_int not between 1 and 50 then
      perform app_private.fail('invalid_input', 'Must be between 1 and 50.');
    elsif p_key = 'rejected_file_retention_days' and v_int not between 7 and 365 then
      perform app_private.fail('invalid_input', 'Must be between 7 and 365 days.');
    elsif p_key = 'abandoned_upload_hours' and v_int not between 1 and 168 then
      perform app_private.fail('invalid_input', 'Must be between 1 and 168 hours.');
    end if;
  end if;

  update public.app_settings set value = p_value, updated_by = v_uid, updated_at = now() where key = p_key;
  perform app_private.write_audit('setting.update', 'setting', p_key,
    jsonb_build_object('from', v_old, 'to', p_value));
end;
$$;

-- -----------------------------------------------------------------------------
-- Service-role only: upload validation + storage retention
-- -----------------------------------------------------------------------------
create or replace function public.record_upload_validation(
  p_bucket text,
  p_path text,
  p_user_id uuid,
  p_detected_type text,
  p_mime_type text,
  p_size_bytes bigint,
  p_original_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_object_id uuid;
  v_object_size bigint;
  v_id uuid;
begin
  if not app_private.is_login_allowed(p_user_id) then
    perform app_private.fail('account_inactive', 'Account is not permitted to upload.');
  end if;
  if p_bucket = 'contributions-private' then
    if split_part(p_path, '/', 1) <> p_user_id::text then
      perform app_private.fail('forbidden', 'Path does not belong to the user.');
    end if;
  elsif p_bucket = 'resources-published' then
    if p_path not like 'uploads/' || p_user_id::text || '/%'
       or not (app_private.user_has_permission(p_user_id, 'resources.create')
               or app_private.user_has_permission(p_user_id, 'resources.edit')) then
      perform app_private.fail('forbidden', 'Not permitted to upload published files.');
    end if;
  else
    perform app_private.fail('invalid_input', 'Unknown bucket.');
  end if;

  select o.id, nullif(o.metadata ->> 'size', '')::bigint
  into v_object_id, v_object_size
  from storage.objects o where o.bucket_id = p_bucket and o.name = p_path;
  if v_object_id is null then
    perform app_private.fail('not_found', 'The uploaded object does not exist.');
  end if;
  if v_object_size is distinct from p_size_bytes then
    perform app_private.fail('invalid_input', 'Size mismatch between storage and validation.');
  end if;
  if not exists (
    select 1 from public.app_settings s
    where s.key = 'allowed_file_types' and s.value @> jsonb_build_array(p_detected_type)
  ) then
    perform app_private.fail('file_type_not_allowed', 'This file type is not currently accepted.');
  end if;
  if p_size_bytes > app_private.setting_int('max_upload_bytes', 26214400) then
    perform app_private.fail('file_too_large', 'This file exceeds the current size limit.');
  end if;

  insert into public.upload_validations (
    bucket, path, user_id, object_id, detected_type, mime_type, size_bytes, original_name
  ) values (
    p_bucket, p_path, p_user_id, v_object_id, p_detected_type, p_mime_type, p_size_bytes, p_original_name
  )
  on conflict (bucket, path) do update
    set object_id = excluded.object_id,
        detected_type = excluded.detected_type,
        mime_type = excluded.mime_type,
        size_bytes = excluded.size_bytes,
        original_name = excluded.original_name
    where public.upload_validations.consumed_at is null
  returning id into v_id;

  if v_id is null then
    perform app_private.fail('upload_already_used', 'This uploaded file was already submitted.');
  end if;
  return v_id;
end;
$$;

create or replace function public.list_purgeable_files()
returns table (bucket text, path text, reason text)
language sql
stable
security definer
set search_path = ''
as $$
  with cfg as (
    select app_private.setting_int('abandoned_upload_hours', 24) as hours,
           app_private.setting_int('rejected_file_retention_days', 30) as days
  )
  -- uploads that never became a submission
  select 'contributions-private'::text, o.name, 'abandoned'::text
  from storage.objects o, cfg
  where o.bucket_id = 'contributions-private'
    and o.created_at < now() - make_interval(hours => cfg.hours::int)
    and not exists (select 1 from public.contribution_revisions r where r.storage_path = o.name)
  union all
  -- published-bucket files not referenced by any resource (failed approvals / abandoned admin uploads)
  select 'resources-published'::text, o.name, 'abandoned'::text
  from storage.objects o, cfg
  where o.bucket_id = 'resources-published'
    and o.created_at < now() - make_interval(hours => cfg.hours::int)
    and not exists (select 1 from public.resources r where r.storage_path = o.name)
  union all
  -- files of rejected submissions after the retention period
  select 'contributions-private'::text, rv.storage_path, 'rejected_retention'::text
  from public.contribution_revisions rv
  join public.contributions c on c.id = rv.contribution_id, cfg
  where c.status = 'rejected'
    and c.reviewed_at < now() - make_interval(days => cfg.days::int)
    and rv.storage_path is not null
  union all
  -- files of superseded revisions after the retention period
  select 'contributions-private'::text, rv.storage_path, 'superseded'::text
  from public.contribution_revisions rv
  join public.contributions c on c.id = rv.contribution_id, cfg
  where rv.revision < c.revision
    and rv.created_at < now() - make_interval(days => cfg.days::int)
    and rv.storage_path is not null
    and rv.storage_path is distinct from c.storage_path
    and not exists (
      select 1 from public.contribution_revisions keep
      where keep.contribution_id = c.id and keep.revision = c.revision and keep.storage_path = rv.storage_path
    );
$$;

create or replace function public.mark_files_purged(p_bucket text, p_paths text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.upload_validations where bucket = p_bucket and path = any (p_paths);
  if p_bucket = 'contributions-private' then
    update public.contribution_revisions set storage_path = null where storage_path = any (p_paths);
    update public.contributions
    set storage_path = null, files_purged_at = now()
    where storage_path = any (p_paths);
  end if;
  perform app_private.write_audit('storage.purge', 'storage', p_bucket,
    jsonb_build_object('count', coalesce(cardinality(p_paths), 0)));
end;
$$;
