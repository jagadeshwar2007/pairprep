-- =============================================================================
-- 0002 Content: contributions, reviews, resources, uploads, user data
-- =============================================================================

create domain public.resource_category as text
  check (value in ('notes', 'pyq', 'midsem', 'endsem', 'lecture', 'lab', 'practice', 'syllabus', 'reference', 'other'));

-- HTTPS only, public host with a dot (no localhost / bare IPs / credentials / javascript:).
-- The server never fetches these URLs; they are only ever rendered as links.
create or replace function app_private.is_safe_https_url(p_url text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_url is not null
     and char_length(p_url) <= 2048
     and p_url ~* '^https://[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:[0-9]{1,5})?([/?#][^[:space:]<>"''\\]*)?$'
     and p_url !~* '^https://[0-9.]+([:/?#]|$)';
$$;

-- -----------------------------------------------------------------------------
-- Contributions (student submissions awaiting / after moderation)
-- -----------------------------------------------------------------------------
create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 5 and 160),
  description text check (description is null or char_length(description) <= 2000),
  resource_type public.resource_category not null,
  storage_path text check (storage_path is null or char_length(storage_path) <= 300),  -- bucket: contributions-private
  external_url text check (external_url is null or app_private.is_safe_https_url(external_url)),
  file_name text check (file_name is null or char_length(file_name) <= 200),
  file_size bigint check (file_size is null or file_size > 0),
  mime_type text,
  contributor_credit text check (contributor_credit is null or char_length(btrim(contributor_credit)) between 1 and 120),
  status text not null default 'pending'
    check (status in ('pending', 'in_review', 'approved', 'rejected', 'changes_requested')),
  revision integer not null default 1 check (revision >= 1),
  claimed_by uuid references public.profiles (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_feedback text check (review_feedback is null or char_length(review_feedback) <= 2000),
  files_purged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contributions_one_source check (
    files_purged_at is not null or ((storage_path is not null) <> (external_url is not null))
  ),
  constraint contributions_feedback_required check (
    status not in ('rejected', 'changes_requested')
    or char_length(btrim(coalesce(review_feedback, ''))) >= 3
  )
);
create index contributions_queue_idx on public.contributions (created_at)
  where status in ('pending', 'in_review');
create index contributions_owner_idx on public.contributions (submitted_by, created_at desc);
create index contributions_status_idx on public.contributions (status, updated_at desc);
create index contributions_subject_idx on public.contributions (subject_id);
create trigger contributions_set_updated_at before update on public.contributions
  for each row execute function app_private.set_updated_at();

-- Immutable snapshot of every submitted version (original + each resubmission).
create table public.contribution_revisions (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions (id) on delete cascade,
  revision integer not null check (revision >= 1),
  subject_id uuid not null references public.subjects (id) on delete restrict,
  title text not null,
  description text,
  resource_type public.resource_category not null,
  storage_path text,
  external_url text,
  file_name text,
  file_size bigint,
  mime_type text,
  created_at timestamptz not null default now(),
  constraint contribution_revisions_unique unique (contribution_id, revision)
);
create index contribution_revisions_path_idx on public.contribution_revisions (storage_path)
  where storage_path is not null;

-- Internal moderator flag (suspected duplicate / suspicious). Kept in its own table so the
-- reason can never be read by the student who owns the contribution.
create table public.contribution_flags (
  contribution_id uuid primary key references public.contributions (id) on delete cascade,
  flagged_by uuid references public.profiles (id) on delete set null,
  reason text not null check (char_length(btrim(reason)) between 3 and 1000),
  created_at timestamptz not null default now()
);

create table public.contribution_reviews (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references public.contributions (id) on delete cascade,
  revision integer not null,
  reviewer_id uuid references public.profiles (id) on delete set null,
  action text not null
    check (action in ('start_review', 'approve', 'reject', 'request_changes', 'flag', 'unflag')),
  feedback text check (feedback is null or char_length(feedback) <= 2000),
  created_at timestamptz not null default now(),
  constraint contribution_reviews_feedback_required check (
    action not in ('reject', 'request_changes', 'flag')
    or char_length(btrim(coalesce(feedback, ''))) >= 3
  )
);
create index contribution_reviews_contribution_idx on public.contribution_reviews (contribution_id, created_at);
create index contribution_reviews_reviewer_idx on public.contribution_reviews (reviewer_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Published resources
-- -----------------------------------------------------------------------------
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 5 and 160),
  description text check (description is null or char_length(description) <= 2000),
  resource_type public.resource_category not null,
  storage_path text check (storage_path is null or char_length(storage_path) <= 300),  -- bucket: resources-published
  external_url text check (external_url is null or app_private.is_safe_https_url(external_url)),
  file_name text check (file_name is null or char_length(file_name) <= 200),
  file_size bigint check (file_size is null or file_size > 0),
  mime_type text,
  tags text[] not null default '{}' check (cardinality(tags) <= 12),
  credit text check (credit is null or char_length(btrim(credit)) between 1 and 120),  -- public, opt-in only
  verified boolean not null default false,
  downloads_count integer not null default 0 check (downloads_count >= 0),
  source_contribution_id uuid unique references public.contributions (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  published_by uuid references public.profiles (id) on delete set null,
  published_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resources_one_source check ((storage_path is not null) <> (external_url is not null)),
  constraint resources_published_has_date check (status <> 'published' or published_at is not null)
);
create unique index resources_storage_path_key on public.resources (storage_path) where storage_path is not null;
create index resources_subject_status_idx on public.resources (subject_id, status);
create index resources_listing_idx on public.resources (status, published_at desc);
create index resources_type_idx on public.resources (resource_type);
create trigger resources_set_updated_at before update on public.resources
  for each row execute function app_private.set_updated_at();

-- -----------------------------------------------------------------------------
-- Server-side upload validation records.
-- Only the server (service role) can write these, after sniffing the real bytes.
-- submit_contribution / create_resource refuse a storage path without a matching,
-- unconsumed record that still points at the same storage object.
-- -----------------------------------------------------------------------------
create table public.upload_validations (
  id uuid primary key default gen_random_uuid(),
  bucket text not null check (bucket in ('contributions-private', 'resources-published')),
  path text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  object_id uuid not null,
  detected_type text not null check (detected_type in ('pdf', 'png', 'jpg', 'docx', 'pptx')),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  original_name text not null check (char_length(original_name) between 1 and 200),
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  constraint upload_validations_path_key unique (bucket, path)
);
create index upload_validations_user_idx on public.upload_validations (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Student data
-- -----------------------------------------------------------------------------
create table public.bookmarks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  resource_id uuid not null references public.resources (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, resource_id)
);
create index bookmarks_resource_idx on public.bookmarks (resource_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in (
    'contribution_in_review', 'contribution_approved', 'contribution_rejected',
    'contribution_changes_requested', 'role_changed', 'permissions_changed', 'account_status_changed'
  )),
  title text not null check (char_length(title) between 1 and 160),
  message text not null check (char_length(message) between 1 and 1000),
  link text check (link is null or (link ~ '^/[^/\\]' and char_length(link) <= 300)),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  default_branch_id uuid references public.branches (id) on delete set null,
  default_academic_year text
    check (default_academic_year is null or default_academic_year in ('first-year', 'second-year', 'third-year', 'fourth-year')),
  default_semester smallint check (default_semester is null or default_semester between 1 and 8),
  settings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(settings) = 'object' and pg_column_size(settings) <= 4096),
  updated_at timestamptz not null default now()
);
create trigger user_preferences_set_updated_at before update on public.user_preferences
  for each row execute function app_private.set_updated_at();

-- Matches what the existing Attendance Calculator tracks: attended / total / target %.
-- No timetable, per-class log or "cancelled class" data exists in the app, so none is invented.
create table public.attendance_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  semester_type text not null check (semester_type in ('Odd', 'Even')),
  session_label text not null check (char_length(btrim(session_label)) between 1 and 20),
  course_name text not null check (char_length(btrim(course_name)) between 1 and 120),
  course_code text check (course_code is null or char_length(course_code) <= 20),
  attended integer not null default 0 check (attended >= 0),
  total integer not null default 0 check (total >= 0),
  min_required_percent smallint not null default 75 check (min_required_percent between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_attended_le_total check (attended <= total),
  constraint attendance_courses_unique unique (user_id, session_label, semester_type, course_name)
);
create index attendance_courses_user_idx on public.attendance_courses (user_id, session_label);
create trigger attendance_courses_set_updated_at before update on public.attendance_courses
  for each row execute function app_private.set_updated_at();

create table public.resource_reports (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null
    check (reason in ('broken-file', 'wrong-subject', 'poor-quality', 'outdated-syllabus', 'copyright', 'other')),
  details text check (details is null or char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index resource_reports_one_open_per_user
  on public.resource_reports (resource_id, reporter_id) where status = 'open';
create index resource_reports_status_idx on public.resource_reports (status, created_at desc);

-- Footer "Send feedback" form. Written only through submit_feedback(); read by content staff.
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  message text not null check (char_length(btrim(message)) between 3 and 2000),
  contact_email text check (contact_email is null or char_length(contact_email) <= 200),
  status text not null default 'new' check (status in ('new', 'handled')),
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index feedback_status_idx on public.feedback (status, created_at desc);
create index feedback_user_idx on public.feedback (user_id, created_at desc);
