import 'server-only';
import { connection } from 'next/server';
import { unstable_rethrow } from 'next/navigation';
import { ZodError, type ZodType } from 'zod';
import { formatZodError } from '@/lib/resources/validation';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>
  ) {
    super(message);
  }
}

export const unauthorized = (msg = 'Sign in to continue') => new ApiError(401, 'unauthenticated', msg);
export const forbidden = (msg = 'You do not have permission to do that') => new ApiError(403, 'forbidden', msg);
export const notFound = (msg = 'Not found') => new ApiError(404, 'not_found', msg);
export const conflict = (msg: string, code = 'conflict') => new ApiError(409, code, msg);
export const badRequest = (msg: string, code = 'invalid_request') => new ApiError(400, code, msg);

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...(init?.headers ?? {}) },
  });
}

export function errorResponse(err: unknown) {
  if (err instanceof ApiError) {
    return json({ error: { code: err.code, message: err.message, fields: err.fields } }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const { message, fields } = formatZodError(err);
    return json({ error: { code: 'validation_failed', message, fields } }, { status: 400 });
  }
  console.error('[api] unexpected error', err);
  return json({ error: { code: 'internal', message: 'Something went wrong. Please try again.' } }, { status: 500 });
}

/**
 * Wraps a route handler: always renders at request time (API data must never be baked
 * into the build), and turns ApiErrors / validation errors into JSON responses.
 */
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    await connection();
    try {
      return await fn(...args);
    } catch (err) {
      unstable_rethrow(err);
      return errorResponse(err);
    }
  };
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(415, 'unsupported_media_type', 'Expected a JSON body');
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw badRequest('Request body is not valid JSON');
  }
  return schema.parse(body);
}
