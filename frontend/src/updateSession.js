import { tokenKey } from "./auth"

export default async function updateSession(role, url, action, body) {
  const key = tokenKey(role)
  if (action === "logout") {
    sessionStorage.removeItem(key)
    return role === "admin" ? { signedIn: false } : { cashier: null }
  }

  const response = await fetch(`${url}/login`, {
    method: "POST",
    credentials: "omit",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.token) {
    throw new Error(data?.message || "Could not sign in. Please try again.")
  }
  const { token, ...identity } = data
  sessionStorage.setItem(key, token)
  return identity
}
