/** Result shape returned by every server action. Never throw backend details at the client. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; code?: string };

export interface DbErrorLike {
  message?: string | null;
  details?: string | null;
  code?: string | null;
}

const CODE_MESSAGES: Record<string, string> = {
  unauthenticated: 'Please sign in to continue.',
  account_inactive: 'Your account is suspended or not permitted to do this.',
  forbidden: "You don't have permission to do that.",
  not_found: 'That item could not be found.',
  invalid_state: "That action isn't available in the item's current state.",
  invalid_input: 'Some of the information provided is invalid.',
  invalid_url: 'External links must be public https:// URLs.',
  feedback_required: 'Feedback is required for this action.',
  rate_limited: 'You are doing that too often. Please try again later.',
  conflict: 'That conflicts with the current state. Refresh and try again.',
  flagged: 'Resolve the flag on this contribution first.',
  super_admin_required: 'The application must always have exactly one super admin.',
  upload_not_validated: 'The file was not validated by the server. Please upload it again.',
  upload_already_used: 'That uploaded file was already submitted.',
  upload_changed: 'The uploaded file changed after validation. Please upload it again.',
  file_type_not_allowed: 'That file type is not currently accepted.',
  file_too_large: 'That file exceeds the size limit.',
  published_file_missing: 'The file could not be published. Please try again.',
};

/** Machine-readable codes raised by app_private.fail() in the database. */
const KNOWN_CODES = new Set(Object.keys(CODE_MESSAGES));

/**
 * Converts a PostgREST/Postgres error into a safe, user-facing message and a stable code.
 * Details that were written for users (RAISE ... DETAIL) are shown; raw SQL errors never are.
 */
export function describeDbError(error: DbErrorLike | null | undefined): { code: string; message: string } {
  if (!error) return { code: 'unknown', message: 'Something went wrong. Please try again.' };
  const message = error.message ?? '';

  if (KNOWN_CODES.has(message)) {
    const detail = error.details?.trim();
    return { code: message, message: detail || CODE_MESSAGES[message] };
  }
  // 42501 = insufficient_privilege (also raised for RLS violations). Don't leak table names.
  if (error.code === '42501' || /row-level security|permission denied/i.test(message)) {
    return { code: 'forbidden', message: CODE_MESSAGES.forbidden };
  }
  if (error.code === '23505') return { code: 'conflict', message: CODE_MESSAGES.conflict };
  if (error.code === '23514' || error.code === '23502' || error.code === '22P02') {
    return { code: 'invalid_input', message: CODE_MESSAGES.invalid_input };
  }
  if (error.code === 'PGRST301' || /jwt/i.test(message)) {
    return { code: 'unauthenticated', message: 'Your session expired. Please sign in again.' };
  }
  return { code: 'unknown', message: 'Something went wrong. Please try again.' };
}

/** Logs unexpected failures on the server without including secrets or user content. */
export function logServerError(context: string, error: unknown) {
  const e = error as DbErrorLike | Error | undefined;
  const code = e && 'code' in e ? e.code : undefined;
  const message = e && 'message' in e ? e.message : String(error);
  console.error(`[${context}]`, code ? `${code}:` : '', message);
}

export function fail(error: DbErrorLike | null | undefined, context: string): { ok: false; error: string; code: string } {
  const described = describeDbError(error);
  if (described.code === 'unknown') logServerError(context, error);
  return { ok: false, error: described.message, code: described.code };
}
