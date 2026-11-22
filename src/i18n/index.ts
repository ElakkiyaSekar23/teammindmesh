import type { UiLanguage } from '../engine/types';
import { en } from './en';
import { hi } from './hi';
import { ta } from './ta';
import type { TranslationKeys } from './types';

export type { TranslationKeys } from './types';

export const DICTIONARIES: Record<UiLanguage, TranslationKeys> = {
  en,
  ta,
  hi,
};

export function getTranslation(lang: UiLanguage): TranslationKeys {
  return DICTIONARIES[lang] ?? en;
}

/**
 * Words strictly banned from normal user-facing copy per plain-language rules.
 */
export const BANNED_NORMAL_UI_WORDS = [
  'tier',
  'knowledge graph',
  'node',
  'edge',
  'entity',
  'nlp',
  'llm',
  'monte carlo',
  'cypher',
  'buffer',
  'locality',
  'dependency',
] as const;

export function findBannedWordsInText(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_NORMAL_UI_WORDS.filter((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`, 'i').test(lower);
  });
}
