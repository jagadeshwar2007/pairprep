-- =============================================================================
-- DEVELOPMENT SEED. Loaded by `supabase db reset` against a LOCAL stack only.
-- Never apply this to production: it creates clearly labelled sample resources
-- so the hub is not empty while you develop. The catalog (branches/subjects) is
-- NOT seeded here; it ships as a migration because production needs it.
-- All links point at example.org, a domain reserved for documentation.
-- =============================================================================

insert into public.resources (subject_id, title, description, resource_type, external_url, tags, verified, status, published_at)
select s.id, v.title, v.description, v.category::public.resource_category, v.url, array['sample'], false, 'published', now()
from (values
  ('cs-13101', '[Sample] Trees and graph traversal notes', 'Placeholder entry for local development. Replace with real material.', 'notes',  'https://example.org/samples/dsa-notes.pdf'),
  ('cs-13101', '[Sample] DSA midsem paper (placeholder)',   'Placeholder entry for local development.',                           'midsem', 'https://example.org/samples/dsa-midsem.pdf'),
  ('cs-14101', '[Sample] Algorithms lecture slides',        'Placeholder entry for local development.',                           'lecture','https://example.org/samples/algo-slides.pdf'),
  ('ma-11101', '[Sample] Engineering Mathematics I syllabus','Placeholder entry for local development.',                          'syllabus','https://example.org/samples/math-syllabus.pdf')
) as v (subject_slug, title, description, category, url)
join public.subjects s on s.slug = v.subject_slug
on conflict do nothing;
