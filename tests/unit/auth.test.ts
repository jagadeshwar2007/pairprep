import { describe, expect, it } from 'vitest';
import { safeNextPath } from '@/lib/auth/redirects';
import {
  ADMIN_SECTIONS, PERMISSION_KEYS, ROLE_DEFAULT_PERMISSIONS, can, canAny, isStaff, landingPath, parseAccess,
  postLoginPath, visibleAdminSections, type Access, type PermissionKey, type RoleId,
} from '@/lib/auth/permissions';
import { describeDbError } from '@/lib/errors';
import { isProtectedPath } from '@/lib/supabase/proxy';
import { contentFields, resourceInput, submitContributionInput } from '@/lib/validation';

const access = (role: RoleId, extra: Partial<Access> = {}): Access => ({
  userId: 'u', email: 'u@x.edu', fullName: 'U', avatarUrl: null, status: 'active', loginAllowed: true,
  role, roleName: role, permissions: ROLE_DEFAULT_PERMISSIONS[role], unreadNotifications: 0, ...extra,
});

describe('safeNextPath (open-redirect protection)', () => {
  it('allows ordinary same-site paths', () => {
    expect(safeNextPath('/account/contributions?x=1')).toBe('/account/contributions?x=1');
    expect(safeNextPath('/resources/second-year')).toBe('/resources/second-year');
    expect(safeNextPath('/admin/moderation%3Fstatus%3Dpending')).toBe('/admin/moderation?status=pending');
  });

  it('blocks absolute URLs, protocol-relative URLs, backslash tricks, schemes and loops', () => {
    for (const bad of [
      'https://evil.example', 'http://evil.example/a', '//evil.example', '///evil.example', '/\\evil.example', '\\\\evil.example',
      'javascript:alert(1)', 'data:text/html,x', 'evil.example', '/%2F%2Fevil.example', '/a\nb', '/auth/callback', '/login', '%', '',
    ]) {
      expect(safeNextPath(bad, '/fallback'), JSON.stringify(bad)).toBe('/fallback');
    }
    expect(safeNextPath(null, '/x')).toBe('/x');
    expect(safeNextPath(undefined)).toBe('/');
  });
});

describe('permission model', () => {
  it('parses my_access() safely and ignores unknown roles / permissions', () => {
    const parsed = parseAccess({
      user_id: 'abc', email: 'a@b.c', status: 'active', login_allowed: true, role: 'wizard',
      permissions: ['resources.read', 'do.anything', 42], unread_notifications: 3,
    });
    expect(parsed).toMatchObject({ role: 'student', permissions: ['resources.read'], unreadNotifications: 3 });
    expect(parseAccess(null)).toBeNull();
    expect(parseAccess({ role: 'super_admin' })).toBeNull(); // no user id => no access
  });

  it('suspended accounts have no effective permissions in the UI either', () => {
    const suspended = access('super_admin', { status: 'suspended' });
    expect(can(suspended, 'audit.read')).toBe(false);
    expect(isStaff(suspended)).toBe(false);
    expect(can(null, 'resources.read')).toBe(false);
  });

  it('keeps the documented role matrix', () => {
    const grid: Record<RoleId, PermissionKey[]> = {
      student: ['resources.read'],
      file_moderator: ['contributions.read', 'contributions.review', 'contributions.approve', 'contributions.reject'],
      content_admin: ['resources.create', 'resources.edit', 'resources.publish', 'resources.archive'],
      super_admin: [...PERMISSION_KEYS],
    };
    for (const [role, perms] of Object.entries(grid) as [RoleId, PermissionKey[]][]) {
      for (const p of perms) expect(can(access(role), p), `${role} should have ${p}`).toBe(true);
    }
    // the separation the product requires
    for (const p of ['users.read', 'users.suspend', 'roles.manage', 'settings.manage', 'audit.read', 'resources.delete'] as const) {
      expect(can(access('file_moderator'), p), `moderator must not have ${p}`).toBe(false);
      expect(can(access('content_admin'), p), `content admin must not have ${p}`).toBe(false);
    }
    expect(can(access('content_admin'), 'contributions.read')).toBe(false);
    expect(can(access('file_moderator'), 'resources.create')).toBe(false);
    expect(canAny(access('student'), ['contributions.read', 'users.read'])).toBe(false);
  });

  it('adapts navigation to permissions', () => {
    const labels = (a: Access) => visibleAdminSections(a).map((s) => s.label);
    expect(labels(access('student'))).toEqual([]);
    expect(labels(access('file_moderator'))).toEqual(['Moderation']);
    expect(labels(access('content_admin'))).toEqual(['Resources', 'Reports']);
    expect(labels(access('super_admin'))).toEqual(ADMIN_SECTIONS.map((s) => s.label));
    // an individual grant surfaces exactly one more section
    expect(labels(access('file_moderator', { permissions: [...ROLE_DEFAULT_PERMISSIONS.file_moderator, 'audit.read'] }))).toEqual(['Moderation', 'Audit log']);
  });

  it('lands each role on the right page after login', () => {
    expect(landingPath(access('file_moderator'))).toBe('/admin/moderation');
    expect(landingPath(access('content_admin'))).toBe('/admin/resources');
    expect(landingPath(access('super_admin'))).toBe('/admin');
    expect(landingPath(access('student'))).toBe('/account');
    expect(landingPath(null)).toBe('/');
    // a moderator whose permissions were all stripped falls back to the student dashboard
    expect(landingPath(access('file_moderator', { permissions: ['resources.read'] }))).toBe('/account');
  });
});

describe('post-login destination', () => {
  it('sends staff to their admin home, honouring only deep links into protected areas', () => {
    const mod = access('file_moderator');
    expect(postLoginPath(mod, '')).toBe('/admin/moderation');
    expect(postLoginPath(mod, '/resources/second-year')).toBe('/admin/moderation'); // navbar sign-in on a public page
    expect(postLoginPath(mod, '/admin/moderation/abc?x=1')).toBe('/admin/moderation/abc?x=1');
    expect(postLoginPath(mod, '/account/contributions')).toBe('/account/contributions');
    expect(postLoginPath(access('content_admin'), '/')).toBe('/admin/resources');
    expect(postLoginPath(access('super_admin'), '/tools/gpa')).toBe('/admin');
    // look-alike prefixes are not protected areas
    expect(postLoginPath(mod, '/administrator')).toBe('/admin/moderation');
  });

  it('returns students to where they were, or their dashboard', () => {
    const student = access('student');
    expect(postLoginPath(student, '/resources/second-year')).toBe('/resources/second-year');
    expect(postLoginPath(student, '')).toBe('/account');
    expect(postLoginPath(student, null)).toBe('/account');
  });
});

describe('proxy', () => {
  it('protects exactly the account, submit and admin trees', () => {
    for (const p of ['/account', '/account/contributions', '/submit', '/admin', '/admin/users/123']) expect(isProtectedPath(p), p).toBe(true);
    for (const p of ['/', '/resources', '/login', '/accounts', '/administrator', '/submitted', '/tools/attendance']) expect(isProtectedPath(p), p).toBe(false);
  });
});

describe('describeDbError', () => {
  it('maps machine codes raised by the database to friendly text', () => {
    expect(describeDbError({ message: 'rate_limited', details: 'Too many open contributions.' })).toEqual({ code: 'rate_limited', message: 'Too many open contributions.' });
    expect(describeDbError({ message: 'invalid_state' }).code).toBe('invalid_state');
    expect(describeDbError({ message: 'super_admin_required' }).code).toBe('super_admin_required');
  });

  it('never leaks raw SQL / table names for privilege or RLS failures', () => {
    for (const err of [
      { code: '42501', message: 'permission denied for table user_roles' },
      { code: '42501', message: 'new row violates row-level security policy for table "objects"' },
    ]) {
      const d = describeDbError(err);
      expect(d.code).toBe('forbidden');
      expect(d.message).not.toMatch(/user_roles|objects|policy/);
    }
    const unknown = describeDbError({ code: 'XX000', message: 'relation "secret_table" does not exist' });
    expect(unknown).toEqual({ code: 'unknown', message: 'Something went wrong. Please try again.' });
    expect(describeDbError({ code: '23505', message: 'duplicate key value violates unique constraint "x"' }).code).toBe('conflict');
    expect(describeDbError(null).code).toBe('unknown');
  });
});

describe('input validation', () => {
  const base = { subjectSlug: 'cs-13101', title: 'Trees and heaps notes', category: 'notes' as const };

  it('accepts valid contributions with either a file or a link', () => {
    expect(submitContributionInput.safeParse({ ...base, source: { mode: 'link', url: 'https://example.org/a.pdf' } }).success).toBe(true);
    expect(submitContributionInput.safeParse({ ...base, source: { mode: 'file', path: 'a/b.pdf' } }).success).toBe(true);
  });

  it('rejects malformed input', () => {
    const link = { mode: 'link' as const, url: 'https://example.org/a.pdf' };
    expect(submitContributionInput.safeParse({ ...base, title: 'abc', source: link }).success).toBe(false);
    expect(submitContributionInput.safeParse({ ...base, category: 'hacking', source: link }).success).toBe(false);
    expect(submitContributionInput.safeParse({ ...base, subjectSlug: "x'; drop table--", source: link }).success).toBe(false);
    expect(submitContributionInput.safeParse({ ...base, title: 'x'.repeat(161), source: link }).success).toBe(false);
    expect(submitContributionInput.safeParse({ ...base, source: { mode: 'keep' } }).success).toBe(false);
    expect(submitContributionInput.safeParse({ ...base, source: { mode: 'ftp', url: 'x' } }).success).toBe(false);
    expect(contentFields.safeParse({ ...base, description: 'd'.repeat(2001) }).success).toBe(false);
  });

  it('normalises blank optional fields', () => {
    const parsed = contentFields.parse({ ...base, description: '   ', credit: '' });
    expect(parsed.description).toBeUndefined();
    expect(parsed.credit).toBeUndefined();
    expect(resourceInput.parse({ ...base, source: { mode: 'link', url: 'https://example.org/x' } }).tags).toEqual([]);
  });
});
