import { DemoKeys, getKeys } from './storage'

export function getApiHeaders(): HeadersInit {
  const keys = getKeys()
  if (!keys) {
    throw new Error('API keys not found. Please configure them first.')
  }

  return {
    'Content-Type': 'application/json',
    'X-OpenAI-Key': keys.openaiKey,
    'X-ICTLife-Key': keys.ictlifeKey,
    'X-ICTLife-User-Id': keys.ictlifeUserId,
  }
}

export async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = getApiHeaders()
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
  }

  return response.json()
}
