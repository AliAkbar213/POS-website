export default async function updateSession(url, action, body) {
  const response = await fetch(`${url}/${action}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result) {
    throw new Error(result?.message || "Could not update your session. Please try again.")
  }
  return result
}
