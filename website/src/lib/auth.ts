const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

// ── Token storage ──────────────────────────────────────────────

export interface UserData {
  name?: string
  email?: string
  avatar_url?: string
  tier?: string
}

export function storeTokens(access: string, refresh: string, expiresAt?: number) {
  localStorage.setItem('sheetmind_access_token', access)
  localStorage.setItem('sheetmind_refresh_token', refresh)
  if (expiresAt) localStorage.setItem('sheetmind_expires_at', String(expiresAt))
}

export function storeUser(user: Record<string, unknown>) {
  localStorage.setItem('sheetmind_user', JSON.stringify({
    name: user.name || user.full_name || '',
    email: user.email || '',
    avatar_url: user.avatar_url || user.picture || '',
    tier: user.tier || 'free',
  }))
}

export function getUser(): UserData | null {
  const raw = localStorage.getItem('sheetmind_user')
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function getTokens() {
  return {
    accessToken: localStorage.getItem('sheetmind_access_token'),
    refreshToken: localStorage.getItem('sheetmind_refresh_token'),
    expiresAt: localStorage.getItem('sheetmind_expires_at'),
  }
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem('sheetmind_access_token')
}

export function clearTokens() {
  localStorage.removeItem('sheetmind_access_token')
  localStorage.removeItem('sheetmind_refresh_token')
  localStorage.removeItem('sheetmind_expires_at')
  localStorage.removeItem('sheetmind_user')
}

// ── Email / password auth ──────────────────────────────────────

export async function signUp(email: string, password: string, name: string) {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Sign up failed')
  return data
}

export async function signIn(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Sign in failed')
  return data as {
    user: Record<string, unknown>
    access_token: string
    refresh_token: string
    expires_at: number
  }
}

// ── Google OAuth ───────────────────────────────────────────────

export async function getGoogleOAuthUrl(): Promise<string> {
  const res = await fetch(`${API_URL}/auth/login`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'Failed to get OAuth URL')
  return data.url as string
}

export async function exchangeOAuthTokens(accessToken: string, refreshToken: string) {
  const res = await fetch(`${API_URL}/auth/callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'OAuth exchange failed')
  return data as {
    user: Record<string, unknown>
    access_token: string
    refresh_token: string
    expires_at: number
  }
}

/**
 * Opens the Google OAuth flow in a popup and returns the tokens.
 * Listens for `postMessage` from the /oauth-complete callback page.
 */
export function openOAuthPopup(): Promise<{ access_token: string; refresh_token: string }> {
  return new Promise(async (resolve, reject) => {
    let url: string
    try {
      url = await getGoogleOAuthUrl()
    } catch (e) {
      reject(e)
      return
    }

    const width = 500
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2
    const popup = window.open(
      url,
      'sheetmind-oauth',
      `width=${width},height=${height},left=${left},top=${top},popup=yes`
    )

    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'))
      return
    }

    let resolved = false

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== 'sheetmind-oauth') return
      resolved = true
      window.removeEventListener('message', onMessage)
      clearInterval(pollClosed)
      resolve({
        access_token: event.data.access_token,
        refresh_token: event.data.refresh_token,
      })
    }

    window.addEventListener('message', onMessage)

    // Poll to detect if user closed the popup without completing
    const pollClosed = setInterval(() => {
      if (popup.closed && !resolved) {
        clearInterval(pollClosed)
        window.removeEventListener('message', onMessage)
        reject(new Error('Authentication cancelled'))
      }
    }, 500)
  })
}
