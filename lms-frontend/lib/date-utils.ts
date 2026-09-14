/**
 * Formats a Date object or ISO date string to `YYYY-MM-DDTHH:mm` format
 * based on the user's LOCAL timezone for `<input type="datetime-local">`.
 * This prevents UTC offset drift when loading and viewing timestamps.
 */
export function toLocalDatetimeInput(dateInput?: string | Date | null): string {
  if (!dateInput) return ''
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Safely converts a local datetime input string (`YYYY-MM-DDTHH:mm`) to an ISO string
 * preserving the exact instant in time represented by the user's input.
 */
export function fromLocalDatetimeInput(inputVal?: string | null): string | null {
  if (!inputVal?.trim()) return null
  const d = new Date(inputVal)
  if (isNaN(d.getTime())) return null
  return d.toISOString()
}
