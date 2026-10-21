import { z } from 'zod';

export const RESOURCE_CATEGORIES = [
  'notes', 'pyq', 'midsem', 'endsem', 'lecture', 'lab', 'practice', 'syllabus', 'reference', 'other',
] as const;
export type ResourceCategoryId = (typeof RESOURCE_CATEGORIES)[number];

const slug = z.string().min(1).max(60).regex(/^[a-z0-9][a-z0-9-]*$/, 'Invalid subject');
const uuid = z.string().uuid('Invalid id');
const optionalText = (max: number) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().max(max).optional());

/** Fields shared by student contributions and admin-created resources. */
export const contentFields = z.object({
  subjectSlug: slug,
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(160, 'Title is too long (max 160)'),
  description: optionalText(2000),
  category: z.enum(RESOURCE_CATEGORIES, { error: 'Choose a category' }),
  credit: optionalText(120),
});

/** Exactly one source. Link syntax is re-validated by parseSafeHttpsUrl() and again by the database. */
export const sourceInput = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('file'), path: z.string().min(1).max(300), originalName: z.string().max(255).optional() }),
  z.object({ mode: z.literal('link'), url: z.string().min(1).max(2048) }),
  z.object({ mode: z.literal('keep') }),
]);

export const submitContributionInput = contentFields.extend({
  source: sourceInput.refine((s) => s.mode !== 'keep', 'Choose a file or a link'),
});

export const resubmitContributionInput = contentFields.extend({
  contributionId: uuid,
  source: sourceInput,
});

export const reviewInput = z.object({
  contributionId: uuid,
  action: z.enum(['reject', 'request_changes', 'flag', 'unflag']),
  feedback: z.string().trim().max(2000).optional(),
});

export const resourceInput = contentFields.extend({
  tags: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
  source: sourceInput,
  verified: z.boolean().optional(),
});

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input';
}
