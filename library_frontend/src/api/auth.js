const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export async function loginUser(email, password) {
  const response = await fetch(`${BASE_URL}/api/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) {
    const err = await response.json()
    throw new Error(err.detail || 'Login failed')
  }
  return response.json()
}