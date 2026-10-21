-- =============================================================================
-- 0004 Storage: private buckets + object policies
-- =============================================================================
-- contributions-private : original student uploads (before and after review).
--     path  = <user_id>/<random-uuid>.<ext>
--     INSERT: own folder only, strict path shape, active account.
--     SELECT: own folder, or staff with contributions.read.
--     UPDATE / DELETE: no policy => impossible for API roles (service role only,
--     used by the retention job). An uploaded object is therefore immutable, so the
--     content that was validated is the content that gets reviewed.
--
-- resources-published   : approved / official files. Never public; the app issues
--     short-lived signed URLs.
--     approved copies : approved/<contribution_id>/<file>   (written by service role only)
--     admin uploads   : uploads/<user_id>/<random-uuid>.<ext>
--     SELECT: anyone, but only for files referenced by a *published* resource;
--             content staff can also read their drafts / uploads.
--     INSERT: content staff, own `uploads/<uid>/` folder only.
--     UPDATE: no policy (replace = upload new path + update_resource).
--     DELETE: content staff, and only when no non-archived resource references the file.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('contributions-private', 'contributions-private', false, 52428800, array[
    'application/pdf', 'image/png', 'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]),
  ('resources-published', 'resources-published', false, 52428800, array[
    'application/pdf', 'image/png', 'image/jpeg',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function app_private.is_published_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.resources r where r.storage_path = p_name and r.status = 'published'
  );
$$;

create or replace function app_private.is_live_object(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.resources r where r.storage_path = p_name and r.status <> 'archived'
  );
$$;

-- contributions-private ------------------------------------------------------
create policy contributions_private_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'contributions-private'
    and array_length(storage.foldername(name), 1) = 1
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|png|jpg|docx|pptx)$'
    and (select app_private.current_user_active())
  );

create policy contributions_private_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'contributions-private'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select app_private.has_permission('contributions.read'))
    )
  );

-- resources-published --------------------------------------------------------
create policy resources_published_select on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'resources-published'
    and (
      app_private.is_published_object(name)
      or (select app_private.has_permission('resources.create'))
      or (select app_private.has_permission('resources.edit'))
    )
  );

create policy resources_published_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'resources-published'
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[1] = 'uploads'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and name ~ '^uploads/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|png|jpg|docx|pptx)$'
    and (
      (select app_private.has_permission('resources.create'))
      or (select app_private.has_permission('resources.edit'))
    )
    and (select app_private.current_user_active())
  );

create policy resources_published_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'resources-published'
    and (
      (select app_private.has_permission('resources.edit'))
      or (select app_private.has_permission('resources.delete'))
    )
    and not app_private.is_live_object(name)
  );
