const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const

export function normalizeMcqLetter(
  correctAnswer: string | null | undefined,
  options?: string[] | null,
): string | null {
  if (correctAnswer == null) return null
  const raw = String(correctAnswer).trim()
  if (!raw) return null
  const upper = raw.toUpperCase()
  if (upper.length === 1 && (LETTERS as readonly string[]).includes(upper)) return upper
  if (!options?.length) return raw
  const exact = options.findIndex(o => o === raw)
  if (exact >= 0 && exact < LETTERS.length) return LETTERS[exact]
  const ci = options.findIndex(o => String(o || '').trim().toLowerCase() === raw.toLowerCase())
  if (ci >= 0 && ci < LETTERS.length) return LETTERS[ci]
  return raw
}

export function optionTextForLetter(
  letter: string | null | undefined,
  options?: string[] | null,
): string | null {
  if (!letter || !options?.length) return null
  const idx = (LETTERS as readonly string[]).indexOf(letter.toUpperCase())
  if (idx < 0) return null
  return options[idx] ?? null
}
