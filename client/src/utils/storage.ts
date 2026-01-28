export interface DemoKeys {
  openaiKey: string
  ictlifeKey: string
  ictlifeUserId: string
}

const STORAGE_KEY = 'demo-keys'

export function saveKeys(keys: DemoKeys): boolean {
  try {
    const serialized = JSON.stringify(keys)
    localStorage.setItem(STORAGE_KEY, serialized)
    
    // Verify the write was successful by reading it back
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === serialized) {
      return true
    }
    return false
  } catch (error) {
    console.error('Failed to save keys to localStorage:', error)
    return false
  }
}

export function verifyKeysSaved(keys: DemoKeys): boolean {
  const stored = getKeys()
  if (!stored) return false
  
  return (
    stored.openaiKey === keys.openaiKey &&
    stored.ictlifeKey === keys.ictlifeKey &&
    stored.ictlifeUserId === keys.ictlifeUserId
  )
}

export function getKeys(): DemoKeys | null {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as DemoKeys
  } catch {
    return null
  }
}

export function clearKeys(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function hasKeys(): boolean {
  return getKeys() !== null
}
