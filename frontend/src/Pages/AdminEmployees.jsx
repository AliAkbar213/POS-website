import { apiFetch } from "../auth"
import { useEffect, useState } from "react"
import { WorkspacePage } from "../WorkspaceLayout"
import apiUrl from "../apiUrl"

const cashiersUrl = `${apiUrl}/api/admin/cashiers`
const emptyDraft = { name: "", storeId: "", pin: "" }

async function request(path = "", options = {}) {
  const response = await apiFetch("admin", `${cashiersUrl}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json" },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok || !data) {
    throw new Error(response.status === 401
      ? "Your admin session has expired. Refresh to sign in again."
      : data?.message || "Could not complete the request.")
  }
  return data
}

export default function AdminEmployees() {
  const [cashiers, setCashiers] = useState([])
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      request("", { signal: controller.signal }),
      request("/stores", { signal: controller.signal }),
    ]).then(([employees, availableStores]) => {
      setCashiers(employees)
      setStores(availableStores)
    }).catch((error) => {
      if (!controller.signal.aborted) setLoadError(error.message)
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [])

  function openForm(cashier) {
    setEditingId(cashier?.id ?? null)
    setDraft(cashier ? { name: cashier.name ?? "", storeId: String(cashier.store_id ?? ""), pin: "" } : emptyDraft)
    setDeleting(null)
    setError("")
    setNotice("")
  }

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError("")
    try {
      const cashier = await request(editingId ? `/${editingId}` : "", {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(draft),
      })
      setCashiers((current) => editingId
        ? current.map((item) => item.id === cashier.id ? cashier : item)
        : [...current, cashier])
      setDraft(null)
      setNotice(`Cashier #${cashier.id} saved.`)
    } catch (error) {
      setError(error.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setError("")
    try {
      await request(`/${deleting.id}`, { method: "DELETE", body: "{}" })
      setCashiers((current) => current.filter((cashier) => cashier.id !== deleting.id))
      setNotice(`Cashier #${deleting.id} deleted.`)
      setDeleting(null)
    } catch (error) {
      setError(error.message)
    } finally {
      setBusy(false)
    }
  }

  function changeField(event) {
    setDraft((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  return (
    <WorkspacePage title="Employee Management" backTo="/admin" backLabel="Back to Admin" wide>
      {loading ? <p className="mt-5" role="status">Loading cashiers.</p> : loadError ? (
        <p className="mt-5 text-red-700" role="alert">{loadError}</p>
      ) : (
        <>
          <div className="mt-8 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold">Cashiers</h2>
            <button type="button" className="btn-primary" disabled={busy} onClick={() => openForm(null)}>Add cashier</button>
          </div>
          {notice && <p className="mt-5 font-semibold" role="status">{notice}</p>}
          {error && <p className="mt-5 text-red-700" role="alert">{error}</p>}
          {draft && (
            <form onSubmit={save} className="panel mt-5 grid gap-5">
              <h3 className="text-lg font-bold">{editingId ? `Edit cashier #${editingId}` : "Add cashier"}</h3>
              <div className="grid gap-5 sm:grid-cols-3">
                <label className="grid gap-2 text-sm font-semibold">
                  Name
                  <input name="name" className="field" value={draft.name} onChange={changeField} disabled={busy} required autoFocus />
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  Store
                  <select name="storeId" className="field" value={draft.storeId} onChange={changeField} disabled={busy}>
                    <option value="">Unassigned</option>
                    {stores.map((store) => <option key={store.id} value={store.id}>Store #{store.id}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-semibold">
                  {editingId ? "New PIN" : "PIN"}
                  <input name="pin" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{1,32}" maxLength={32} className="field" value={draft.pin} onChange={changeField} disabled={busy} required={!editingId} aria-describedby={editingId ? "pin-help" : undefined} />
                  {editingId && <span id="pin-help" className="text-xs font-normal text-text-muted">Leave blank to keep the current PIN.</span>}
                </label>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
                <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setDraft(null); setError("") }}>Cancel</button>
              </div>
            </form>
          )}
          {deleting && (
            <div className="panel mt-5" role="group" aria-label="Confirm cashier deletion">
              <p>Delete {deleting.name || `cashier #${deleting.id}`}?</p>
              <div className="mt-4 flex gap-2">
                <button type="button" className="btn-primary bg-red-600 hover:bg-red-700" onClick={remove} disabled={busy}>{busy ? "Deleting…" : "Delete cashier"}</button>
                <button type="button" className="btn-secondary" onClick={() => { setDeleting(null); setError("") }} disabled={busy}>Cancel</button>
              </div>
            </div>
          )}
          <section className="panel mt-5 overflow-hidden p-0" aria-label="Cashiers">
            {cashiers.length === 0 ? <p className="p-5 text-text-muted">No cashiers found.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-text-main text-white">
                    <tr>
                      <th scope="col" className="px-5 py-3">ID</th>
                      <th scope="col" className="px-5 py-3">Name</th>
                      <th scope="col" className="px-5 py-3">Store</th>
                      <th scope="col" className="px-5 py-3">PIN</th>
                      <th scope="col" className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-soft">
                    {cashiers.map((cashier) => (
                      <tr key={cashier.id} className="even:bg-background">
                        <td className="px-5 py-4 tabular-nums">{cashier.id}</td>
                        <td className="px-5 py-4 font-medium">{cashier.name || "—"}</td>
                        <td className="px-5 py-4">{cashier.store_id == null ? "Unassigned" : `#${cashier.store_id}`}</td>
                        <td className="px-5 py-4">{cashier.has_pin ? "Set" : "Missing"}</td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button type="button" className="btn-secondary" onClick={() => openForm(cashier)} disabled={busy} aria-label={`Edit cashier ${cashier.id}`}>
                              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                                <path d="M12 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
                                <path d="m16 3 5 5M21.5 2.5a2.12 2.12 0 0 1 0 3L12 15l-4 1 1-4 9.5-9.5a2.12 2.12 0 0 1 3 0Z" />
                              </svg>
                            </button>
                            <button type="button" className="btn-secondary text-red-600" disabled={busy} onClick={() => { setDeleting(cashier); setDraft(null); setError(""); setNotice("") }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </WorkspacePage>
  )
}
