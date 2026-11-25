export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8765'

let csrfPromise: Promise<void> | null = null

async function ensureCsrf(): Promise<string | null> {
  if (!csrfPromise) {
    csrfPromise = fetch(`${API_BASE}/api/csrf`, { credentials: 'include' })
      .then(() => undefined)
      .catch(() => {
        csrfPromise = null
      })
  }
  await csrfPromise
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export async function apiFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  if (method !== 'GET' && method !== 'HEAD') {
    const token = await ensureCsrf()
    if (token) headers.set('X-CSRFToken', token)
  }
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })
}
