import { useState } from "react"
import { WorkspacePage } from "../WorkspaceLayout"
import apiUrl from "../apiUrl"
import useFetch from "../CustomHooks/useFetch"

const priceFormat = new Intl.NumberFormat("en-KW", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
})

function AdminProducts() {
  const { data: products, loading, error } = useFetch(`${apiUrl}/api/products`)

  const [savedProducts, setSavedProducts] = useState({})
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [notice, setNotice] = useState("")

  function edit(product) {
    setNotice("")
    setSaveError("")
    setDraft({
      id: product.id,
      name: product.name ?? "",
      barcode: String(product.barcode ?? ""),
      price: String(product.price ?? ""),
    })
  }

  function updateField(event) {
    const { name, value } = event.target
    setDraft((current) => ({ ...current, [name]: value }))
  }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setSaveError("")
    try {
      const { id, name, price, barcode } = draft
      const response = await fetch(`${apiUrl}/api/products/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, price: price.trim(), barcode }),
      })
      if (response.status === 401) {
        throw new Error("Your admin session has expired. Refresh to sign in again.")
      }
      const product = await response.json().catch(() => null)
      if (!response.ok || !product) {
        throw new Error(product?.message || "Could not save the product.")
      }
      setSavedProducts((current) => ({ ...current, [product.id]: product }))
      setDraft(null)
      setNotice(`${product.name} saved.`)
    } catch (error) {
      setSaveError(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <WorkspacePage title="Products" backTo="/admin" backLabel="Back to Admin" wide>
      {saveError && <p className="mt-5 text-red-700" role="alert">{saveError}</p>}
      {notice && <p className="mt-5 font-semibold" role="status">{notice}</p>}
      <section className="panel mt-8 overflow-hidden p-0" aria-label="Product catalog" aria-busy={loading}>
        {loading ? (
          <p className="p-5 text-text-muted" role="status">Loading products…</p>
        ) : error ? (
          <p className="p-5 text-red-700" role="alert">{error}</p>
        ) : products.length === 0 ? (
          <p className="p-5 text-text-muted" role="status">No products found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-text-main text-white">
                <tr>
                  <th scope="col" className="px-5 py-3">ID</th>
                  <th scope="col" className="px-5 py-3">Product</th>
                  <th scope="col" className="px-5 py-3">Barcode</th>
                  <th scope="col" className="whitespace-nowrap px-5 py-3 text-right">Price (KWD)</th>
                  <th scope="col" className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary-soft">
                {products.map((original) => {
                  const product = savedProducts[original.id] ?? original
                  const editing = draft?.id === product.id
                  return (
                    <tr key={product.id} className="even:bg-background">
                      <td className="px-5 py-4 tabular-nums text-text-muted">{product.id}</td>
                      <td className="px-5 py-4 font-medium">
                        {editing ? <input form="product-edit" aria-label="Product name" name="name" className="field min-w-28" value={draft.name} onChange={updateField} disabled={saving} required /> : product.name ?? "-"}
                      </td>
                      <td className="px-5 py-4 tabular-nums text-text-muted">
                        {editing ? <input form="product-edit" aria-label="Barcode" name="barcode" className="field min-w-24" value={draft.barcode} onChange={updateField} disabled={saving} /> : product.barcode ?? "-"}
                      </td>
                      <td className="px-5 py-4 text-right tabular-nums">
                        {editing ? <input form="product-edit" aria-label="Price (KWD)" name="price" inputMode="decimal" className="field min-w-24 text-right" value={draft.price} onChange={updateField} disabled={saving} required /> : product.price == null ? "-" : priceFormat.format(product.price)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {editing ? (
                          <form id="product-edit" className="flex flex-wrap justify-end gap-2" onSubmit={save}>
                            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                            <button type="button" className="btn-secondary" onClick={() => { setDraft(null); setSaveError("") }} disabled={saving}>Cancel</button>
                          </form>
                        ) : (
                          <button type="button" className="btn-secondary" onClick={() => edit(product)} disabled={Boolean(draft)} aria-label={`Edit ${product.name ?? `product ${product.id}`}`}>
                            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                              <path d="M12 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
                              <path d="m16 3 5 5M21.5 2.5a2.12 2.12 0 0 1 0 3L12 15l-4 1 1-4 9.5-9.5a2.12 2.12 0 0 1 3 0Z" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </WorkspacePage>
  )
}

export default AdminProducts
