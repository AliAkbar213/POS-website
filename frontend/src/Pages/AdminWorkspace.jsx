import { useState } from "react"
import { Outlet } from "react-router"
import { WorkspaceLayout, WorkspacePage } from "../WorkspaceLayout"
import useFetch from "../CustomHooks/useFetch"
import apiUrl from "../apiUrl"
import updateSession from "../updateSession"

const adminUrl = `${apiUrl}/api/admin`

export default function AdminWorkspace() {
  const { data: initialSession, loading, error: sessionError } = useFetch(`${adminUrl}/session`)
  const [session, setSession] = useState(null)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const signedIn = (session ?? initialSession).signedIn

  async function changeSession(action, body) {
    setError("")
    setSubmitting(true)
    try {
      setSession(await updateSession(adminUrl, action, body))
    } catch (error) {
      setError(error.message)
    } finally {
      setPassword("")
      setSubmitting(false)
    }
  }

  const signOutButton = signedIn && (
    <button className="btn-primary py-2.5" type="button" onClick={() => changeSession("logout", {})} disabled={submitting}>
      {submitting ? "Signing out…" : "Sign out"}
    </button>
  )

  return (
    <WorkspaceLayout headerActions={signOutButton}>
      {signedIn ? (
        <>
          {error && <p className="mx-auto mt-5 max-w-3xl px-5 text-red-700" role="alert">{error}</p>}
          <Outlet />
        </>
      ) : (
        <WorkspacePage title="Admin" backTo="/" backLabel="Workspaces">
          {loading ? (
            <p className="mt-5" role="status">Checking your session.</p>
          ) : sessionError ? (
            <p className="mt-5 text-red-700" role="alert">Could not check your session. Refresh to try again.</p>
          ) : (
            <form className="panel mt-8 grid max-w-md gap-5 p-6" onSubmit={(event) => {
              event.preventDefault()
              changeSession("login", { password })
            }}>
              <div className="grid gap-1.5">
                <label htmlFor="admin-password" className="text-sm font-semibold">Admin password</label>
                <input id="admin-password" name="password" type="password" autoComplete="current-password" className="field py-2.5" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>
              {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
              <button className="btn-primary py-2.5" type="submit" disabled={submitting}>
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>
          )}
        </WorkspacePage>
      )}
    </WorkspaceLayout>
  )
}
