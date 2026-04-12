const BASE_URL = '' // Uses Vite proxy in development

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