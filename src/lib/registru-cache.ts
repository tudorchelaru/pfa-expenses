import { existsSync } from 'fs';
import { unlink } from 'fs/promises';
import { join } from 'path';

const REGISTRE_DIRS = [
  join(process.cwd(), 'data', 'registre'),
  join(process.cwd(), 'OLD_PHP', 'writable', 'registre')
];

function shouldSkipInvalidation(): boolean {
  return typeof process !== 'undefined' && !!process.env.VERCEL;
}

function normalizeYears(years: string[]): string[] {
  return [...new Set(years.filter(Boolean))];
}

function normalizeUsernames(username: string): string[] {
  const candidates = new Set<string>();
  if (username) {
    candidates.add(username);
    candidates.add(username.toLowerCase());
    candidates.add(username.toUpperCase());
  }
  return Array.from(candidates);
}

export async function invalidateRegistruPDFCache(username: string, years: string[]): Promise<void> {
  if (!username) {
    return;
  }
  if (shouldSkipInvalidation()) {
    return;
  }

  const filteredYears = normalizeYears(years);
  if (filteredYears.length === 0) {
    return;
  }

  const userCandidates = normalizeUsernames(username);
  if (userCandidates.length === 0) {
    return;
  }

  for (const dir of REGISTRE_DIRS) {
    for (const year of filteredYears) {
      for (const userCandidate of userCandidates) {
        const filename = `${userCandidate}_registru_${year}.pdf`;
        const fullPath = join(dir, filename);
        if (!existsSync(fullPath)) {
          continue;
        }
        try {
          await unlink(fullPath);
        } catch (error) {
          console.warn(`Nu am putut șterge fișierul ${fullPath}:`, error);
        }
      }
    }
  }
}
