import { handle, json } from '@/lib/server/http';
import { publishedFacets } from '@/lib/server/services/resources';

/** Public: filter values that exist among published resources. */
export const GET = handle(async () => json(await publishedFacets()));
