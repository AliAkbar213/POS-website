export function tokenKey(role) {
  return `pos.${role}.token`
}

export async function apiFetch(role, url, options = {}) {
  const key = tokenKey(role)
  const token = sessionStorage.getItem(key)
  const headers = new Headers(options.headers)
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const response = await fetch(url, { ...options, credentials: "omit", headers })
  if (response.status === 401 && token && token === sessionStorage.getItem(key)) {
    sessionStorage.removeItem(key)
    window.location.reload()
  }
  return response
}
