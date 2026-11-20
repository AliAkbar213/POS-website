import { useState } from "react"
import CashierSales from "./CashierSales"
import apiUrl from "../apiUrl"
import updateSession from "../updateSession"
import useFetch from "../CustomHooks/useFetch"
import { WorkspaceLayout, WorkspacePage } from "../WorkspaceLayout"

const cashiersUrl = `${apiUrl}/api/cashiers`

function CashierLogin({ onSignIn }) {
  const { data: cashiers, loading, error: listError } = useFetch("cashier", cashiersUrl)
  const [cashierId, setCashierId] = useState("")
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function signIn(event) {
    event.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      onSignIn(await updateSession("cashier", cashiersUrl, "login", { cashierId, pin }))
    } catch (error) {
      setError(error.message)
      setPin("")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="mt-5" role="status">Loading cashier IDs…</p>
  if (listError) return <p className="mt-5 text-red-700" role="alert">Could not load cashier IDs.</p>
  if (cashiers.length === 0) return <p className="mt-5" role="status">No cashiers have a PIN set.</p>

  return (
    <form onSubmit={signIn} className="mt-8 grid max-w-md gap-5 panel p-6 text-left">
      <div className="grid gap-1.5">
        <label htmlFor="cashier-id" className="text-sm font-semibold">Cashier ID</label>
        <select id="cashier-id" name="cashierId" autoComplete="username" className="field py-2.5" value={cashierId} onChange={(event) => setCashierId(event.target.value)} required>
          <option value="">Choose a cashier ID</option>
          {cashiers.map(({ id }) => <option value={id} key={id}>{id}</option>)}
        </select>
      </div>
      <div className="grid gap-1.5">
        <label htmlFor="cashier-pin" className="text-sm font-semibold">PIN</label>
        <input id="cashier-pin" name="pin" type="password" inputMode="numeric" autoComplete="current-password" pattern="[0-9]{1,32}" maxLength={32} className="field py-2.5" value={pin} onChange={(event) => setPin(event.target.value)} required />
      </div>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <button className="btn-primary py-2.5" type="submit" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  )
}

function Cashier() {
  const { data: initialSession, loading, error: sessionError } = useFetch("cashier", `${cashiersUrl}/session`)
  const [session, setSession] = useState(null)
  const [error, setError] = useState("")
  const [signingOut, setSigningOut] = useState(false)
  const cashier = (session ?? initialSession).cashier

  async function signOut() {
    setError("")
    setSigningOut(true)
    try {
      setSession(await updateSession("cashier", cashiersUrl, "logout", {}))
    } catch (error) {
      setError(error.message)
    } finally {
      setSigningOut(false)
    }
  }

  let content
  if (loading) {
    content = <p className="mt-5" role="status">Checking your session…</p>
  } else if (sessionError) {
    content = <p className="mt-5 text-red-700" role="alert">Could not check your session. Refresh to try again.</p>
  } else if (cashier) {
    content = (
      <div className="mt-5">
        <p>Signed in as {cashier.name || `cashier ${cashier.id}`}.</p>
        {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
        <CashierSales storeId={cashier.store_id} />
      </div>
    )
  } else {
    content = <CashierLogin onSignIn={setSession} />
  }

  const signOutButton = cashier && (
    <button className="btn-primary py-2.5" type="button" onClick={signOut} disabled={signingOut}>
      {signingOut ? "Signing out…" : "Sign out"}
    </button>
  )

  return (
    <WorkspaceLayout headerActions={signOutButton} themeClass="theme-cashier">
      <WorkspacePage title="Cashier" backTo="/" backLabel="Workspaces" wide={Boolean(cashier)}>
        {content}
      </WorkspacePage>
    </WorkspaceLayout>
  )
}

export default Cashier
