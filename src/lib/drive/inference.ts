// Best-effort metadata inference for files imported from a Drive folder tree.
// Imported resources are always pending, so an admin/reviewer confirms these guesses.

import type { ResourceType } from '@/lib/resources/types';

const SEMESTER_WORDS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8,
};

export function inferSemester(segments: string[]): number | null {
  for (const s of [...segments].reverse()) {
    const text = s.toLowerCase();
    let m = text.match(/\b([1-8])\s*(?:st|nd|rd|th)?\s*sem(?:ester)?\b/);
    if (m) return Number(m[1]);
    m = text.match(/\bsem(?:ester)?[\s_-]*([1-8])\b/);
    if (m) return Number(m[1]);
    m = text.match(/\b(first|second|third|fourth|fifth|sixth|seventh|eighth)\s+sem(?:ester)?\b/);
    if (m) return SEMESTER_WORDS[m[1]];
  }
  return null;
}

const TYPE_RULES: Array<[RegExp, ResourceType]> = [
  [/question\s*bank|\bqb\b/i, 'question_bank'],
  [/model\s*(question\s*)?paper|sample\s*paper/i, 'model_paper'],
  [/\bpyqs?\b|previous\s*year|question\s*paper|mid\s*-?\s*sem|end\s*-?\s*sem|\bexam\b|\bpapers?\b/i, 'pyq'],
  [/\blab\b|laboratory|practical/i, 'lab_manual'],
  [/notes?\b|lecture|handwritten|\bunit\b|chapter/i, 'notes'],
];

export function inferResourceType(segments: string[]): ResourceType | null {
  for (const s of [...segments].reverse()) {
    for (const [re, type] of TYPE_RULES) if (re.test(s)) return type;
  }
  return null;
}

export function inferAcademicYear(name: string): string | null {
  const m = name.match(/\b(20\d{2})\s*[-–/]\s*(\d{2,4})\b/) ?? name.match(/\b(20\d{2})\b/);
  if (!m) return null;
  return m[2] ? `${m[1]}-${m[2].slice(-2)}` : m[1];
}

export function inferUnit(name: string): string | null {
  const m = name.match(/\bunit[\s_-]*0*(\d{1,2}|[ivx]{1,4})\b/i);
  return m ? m[1].toUpperCase() : null;
}

export function titleFromFileName(name: string): string {
  const base = name.replace(/\.[A-Za-z0-9]{1,5}$/, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return base.length >= 3 ? base.slice(0, 200) : `Untitled resource (${name})`.slice(0, 200);
}

/** Picks the deepest folder name that is not a semester or category label. */
export function inferSubject(pathSegments: string[]): string | null {
  for (const s of [...pathSegments].reverse()) {
    if (inferSemester([s]) !== null) continue;
    if (inferResourceType([s]) !== null) continue;
    const clean = s.trim();
    if (clean.length >= 2) return clean.slice(0, 120);
  }
  return null;
}
