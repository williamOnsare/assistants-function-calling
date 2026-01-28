/**
 * Get initials from a name string
 * @param name - The name to extract initials from
 * @returns A string with 1-2 uppercase letters representing the initials
 * 
 * @example
 * getInitials("John Doe") // "JD"
 * getInitials("Alice") // "AL"
 * getInitials("Mary Jane Watson") // "MW"
 */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 0) return '?'
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase()
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/**
 * Format a date string into a user-friendly full calendar format
 * @param dateString - ISO date string or undefined
 * @returns Formatted date string (e.g., "January 27, 2026, 03:24 PM") or empty string
 * 
 * @example
 * formatDate("2026-01-27T15:24:00Z") // "January 27, 2026, 03:24 PM"
 * formatDate(undefined) // ""
 */
export function formatDate(dateString: string | undefined): string {
  if (!dateString) return ''
  
  try {
    const date = new Date(dateString)
    
    // Format as full calendar date
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
    
    return date.toLocaleDateString('en-US', options)
  } catch {
    return dateString
  }
}
