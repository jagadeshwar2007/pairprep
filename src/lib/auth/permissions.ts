// Shared (client + server) description of the role / permission model.
//
// The DATABASE is the authority: Row Level Security and the SECURITY DEFINER functions decide
// what is allowed. Everything here exists to adapt the UI (hide links, pick landing pages) and
// to give clear errors early. Hiding a control is never a security measure.

export const PERMISSION_KEYS = [
  'resources.read',
  'resources.create',
  'resources.edit',
  'resources.publish',
  'resources.archive',
  'resources.delete',
  'contributions.read',
  'contributions.review',
  'contributions.approve',
  'contributions.reject',
  'users.read',
  'users.suspend',
  'roles.manage',
  'settings.manage',
  'audit.read',
] as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const ROLE_IDS = ['student', 'file_moderator', 'content_admin', 'super_admin'] as const;
export type RoleId = (typeof ROLE_IDS)[number];

/** Roles the super admin can hand out. super_admin only ever moves through an audited transfer. */
export const ASSIGNABLE_ROLES: RoleId[] = ['student', 'file_moderator', 'content_admin'];

export const ROLE_LABELS: Record<RoleId, string> = {
  student: 'Student',
  file_moderator: 'File Moderator',
  content_admin: 'Content Administrator',
  super_admin: 'Super Admin',
};

export const ROLE_DESCRIPTIONS: Record<RoleId, string> = {
  student: 'Browse resources, contribute files and track their own contributions.',
  file_moderator: 'Reviews student-submitted files. No other administrative access.',
  content_admin: 'Creates, edits, publishes and archives official resources.',
  super_admin: 'Single owner: accounts, roles, permissions, settings and the audit log.',
};

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  'resources.read': 'Browse published resources',
  'resources.create': 'Create resources (drafts)',
  'resources.edit': 'Edit resources and handle reports',
  'resources.publish': 'Publish and unpublish resources',
  'resources.archive': 'Archive outdated resources',
  'resources.delete': 'Permanently delete resources',
  'contributions.read': 'View pending contributions and files',
  'contributions.review': 'Claim, flag and request changes',
  'contributions.approve': 'Approve contributions',
  'contributions.reject': 'Reject contributions',
  'users.read': 'View accounts and roles',
  'users.suspend': 'Suspend and reactivate students',
  'roles.manage': 'Assign roles and permissions',
  'settings.manage': 'Change application settings',
  'audit.read': 'Read the audit log',
};

/** Display-only mirror of the default role -> permission map seeded by the migrations. */
export const ROLE_DEFAULT_PERMISSIONS: Record<RoleId, PermissionKey[]> = {
  student: ['resources.read'],
  file_moderator: ['resources.read', 'contributions.read', 'contributions.review', 'contributions.approve', 'contributions.reject'],
  content_admin: ['resources.read', 'resources.create', 'resources.edit', 'resources.publish', 'resources.archive'],
  super_admin: [...PERMISSION_KEYS],
};

/** Permissions that can only come from a role, never be granted individually. */
export const NON_DELEGABLE_PERMISSIONS: PermissionKey[] = ['roles.manage', 'settings.manage'];

export interface Access {
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  status: 'active' | 'suspended';
  /** Active AND (no email-domain restriction OR allowed domain OR staff). */
  loginAllowed: boolean;
  role: RoleId;
  roleName: string;
  permissions: PermissionKey[];
  unreadNotifications: number;
}

export function parseAccess(raw: unknown): Access | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.user_id !== 'string') return null;
  const role = ROLE_IDS.includes(r.role as RoleId) ? (r.role as RoleId) : 'student';
  const permissions = Array.isArray(r.permissions)
    ? (r.permissions.filter((p): p is PermissionKey => PERMISSION_KEYS.includes(p as PermissionKey)))
    : [];
  return {
    userId: r.user_id,
    email: typeof r.email === 'string' ? r.email : '',
    fullName: typeof r.full_name === 'string' ? r.full_name : null,
    avatarUrl: typeof r.avatar_url === 'string' ? r.avatar_url : null,
    status: r.status === 'suspended' ? 'suspended' : 'active',
    loginAllowed: r.login_allowed === true,
    role,
    roleName: typeof r.role_name === 'string' ? r.role_name : ROLE_LABELS[role],
    permissions,
    unreadNotifications: typeof r.unread_notifications === 'number' ? r.unread_notifications : 0,
  };
}

export function can(access: Access | null | undefined, key: PermissionKey): boolean {
  return Boolean(access && access.status === 'active' && access.permissions.includes(key));
}

export function canAny(access: Access | null | undefined, keys: readonly PermissionKey[]): boolean {
  return keys.some((k) => can(access, k));
}

export function isStaff(access: Access | null | undefined): boolean {
  return Boolean(access && access.status === 'active' && access.role !== 'student');
}

export interface AdminSection {
  href: string;
  label: string;
  description: string;
  /** Visible when the user holds ANY of these permissions. */
  anyOf: PermissionKey[];
}

export const ADMIN_SECTIONS: AdminSection[] = [
  { href: '/admin/moderation', label: 'Moderation', description: 'Review student contributions', anyOf: ['contributions.read'] },
  { href: '/admin/resources', label: 'Resources', description: 'Manage published materials', anyOf: ['resources.create', 'resources.edit', 'resources.publish', 'resources.archive'] },
  { href: '/admin/reports', label: 'Reports', description: 'Handle resource reports', anyOf: ['resources.edit'] },
  { href: '/admin/users', label: 'Users', description: 'Accounts, roles and permissions', anyOf: ['users.read'] },
  { href: '/admin/audit', label: 'Audit log', description: 'Every privileged action', anyOf: ['audit.read'] },
  { href: '/admin/settings', label: 'Settings', description: 'Limits, domains and ownership', anyOf: ['settings.manage', 'roles.manage'] },
];

export function visibleAdminSections(access: Access | null | undefined): AdminSection[] {
  return ADMIN_SECTIONS.filter((s) => canAny(access, s.anyOf));
}

/** Where a signed-in user should land: the moderator goes straight to the queue. */
export function landingPath(access: Access | null | undefined): string {
  if (!access) return '/';
  const sections = visibleAdminSections(access);
  if (access.role === 'super_admin') return '/admin';
  if (access.role === 'file_moderator') {
    return sections.find((s) => s.href === '/admin/moderation')?.href ?? sections[0]?.href ?? '/account';
  }
  if (access.role === 'content_admin') {
    return sections.find((s) => s.href === '/admin/resources')?.href ?? sections[0]?.href ?? '/account';
  }
  return '/account';
}

/** Plain-language summary of what a set of permissions lets an account do (for the admin user list). */
export function summarizeCapabilities(perms: readonly PermissionKey[]): string[] {
  const has = (...keys: PermissionKey[]) => keys.some((k) => perms.includes(k));
  const out: string[] = [];
  if (has('contributions.review', 'contributions.approve', 'contributions.reject')) out.push('Review contributions');
  if (has('resources.create', 'resources.edit', 'resources.publish', 'resources.archive')) out.push('Manage resources');
  if (has('users.read')) out.push('View accounts');
  if (has('users.suspend')) out.push('Suspend students');
  if (has('roles.manage')) out.push('Manage roles');
  if (has('settings.manage')) out.push('Change settings');
  if (has('audit.read')) out.push('Read audit log');
  return out;
}

/**
 * Where to send someone right after sign-in.
 *  - Staff land on their admin home (moderator -> queue, content admin -> resources, super admin
 *    -> overview), unless they were deep-linked into a protected area (/admin, /account, /submit).
 *  - Everyone else returns to the page they came from, or their dashboard.
 * `next` must already have passed safeNextPath().
 */
export function postLoginPath(access: Access | null | undefined, next: string | null | undefined): string {
  const target = next || '';
  if (!isStaff(access)) return target || landingPath(access);
  const deepLinked = ['/admin', '/account', '/submit'].some((p) => target === p || target.startsWith(`${p}/`) || target.startsWith(`${p}?`));
  return deepLinked ? target : landingPath(access);
}
