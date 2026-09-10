export const DUPLICATE_QUESTION_MESSAGE = 'This question is already there';

export function normalizeQuestionKey(text?: string | null): string {
  return (text || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function questionDuplicateKey(type: string, questionText?: string | null): string {
  return `${String(type || '').toUpperCase()}:${normalizeQuestionKey(questionText)}`;
}
