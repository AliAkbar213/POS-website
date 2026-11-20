import { apiFetch } from "../auth"
import { useState } from "react"
import apiUrl from "../apiUrl"
import useFetch from "../CustomHooks/useFetch"

const salesUrl = `${apiUrl}/api/cashier-sales`
const currency = new Intl.NumberFormat("en-KW", { style: "currency", currency: "KWD" })
const dateTime = new Intl.DateTimeFormat("en-KW", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuwait" })

function Checkout() {
  const [revision, setRevision] = useState(0)
  const { data: products, loading, error: catalogError } = useFetch("cashier", `${salesUrl}/catalog?v=${revision}`)
  const [search, setSearch] = useState("")
  const [cart, setCart] = useState({})
  const [paymentMethod, setPaymentMethod] = useState("Cash")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [receipt, setReceipt] = useState(null)

  const selected = products.filter((product) => cart[product.id])
  const term = search.trim().toLowerCase()
  const visible = products.filter(({ name, barcode }) =>
    name?.toLowerCase().includes(term) || String(barcode ?? "").includes(term))
  const total = selected.reduce((sum, product) => sum + Number(product.price) * cart[product.id], 0)

  async function checkout(event) {
    event.preventDefault()
    setError("")
    setReceipt(null)
    setSubmitting(true)
    try {
      const response = await apiFetch("cashier", salesUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod,
          items: selected.map(({ id }) => ({ productId: String(id), quantity: cart[id] })),
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        if (response.status === 409) {
          setCart({})
          setRevision((value) => value + 1)
        }
        throw new Error(result.message)
      }
      setCart({})
      setReceipt(result)
      setRevision((value) => value + 1)
    } catch (error) {
      setError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="panel">
        <h2 className="text-xl font-bold">Products</h2>
        <label className="mt-4 block text-sm font-medium">
          Search by name or barcode
          <input className="field mt-1" type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        {loading && <p className="mt-4" role="status">Loading products…</p>}
        {catalogError && <p className="mt-4 text-red-700" role="alert">{catalogError}</p>}
        {!loading && !catalogError && !visible.length && <p className="mt-4">No matching products.</p>}
        <ul className="mt-4 max-h-112 divide-y divide-primary-soft overflow-auto">
          {visible.map((product) => {
            const quantity = cart[product.id] ?? 0
            const outOfStock = Number(product.stock) <= 0
            return (
              <li key={product.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-semibold">{product.name ?? `Product #${product.id}`}</p>
                  <p className="text-sm text-text-muted">
                    {currency.format(product.price)} · {outOfStock ? (
                      <span className="font-medium text-red-700">Out of stock</span>
                    ) : (
                      <span>{product.stock} in stock</span>
                    )}
                  </p>
                </div>
                <button type="button" className="btn-primary size-11 shrink-0 rounded-full p-0 text-xl leading-none" aria-label={`Add ${product.name ?? `product #${product.id}`} to sale`} disabled={submitting || quantity >= Number(product.stock) || quantity >= Number.MAX_SAFE_INTEGER || (!quantity && selected.length >= 100)}
                  onClick={() => setCart({ ...cart, [product.id]: quantity + 1 })}>+</button>
              </li>
            )
          })}
        </ul>
      </section>

      <form className="panel" onSubmit={checkout}>
        <h2 className="text-xl font-bold">Current sale</h2>
        {selected.length === 0 && <p className="mt-4 text-sm text-text-muted">Add a product to start.</p>}
        <ul className="mt-3 divide-y divide-primary-soft">
          {selected.map(({ id, name, price }) => (
            <li key={id} className="flex items-center justify-between gap-2 py-3">
              <span>{cart[id]} × {name ?? `Product #${id}`}<span className="block text-sm text-text-muted">{currency.format(Number(price) * cart[id])}</span></span>
              <button type="button" className="btn-primary min-h-11 shrink-0 bg-red-600 text-sm hover:bg-red-700 focus-visible:outline-red-600" aria-label={`Delete one ${name ?? `product #${id}`} from sale`} disabled={submitting}
                onClick={() => setCart({ ...cart, [id]: cart[id] - 1 })}>Delete</button>
            </li>
          ))}
        </ul>
        <p className="my-4 flex justify-between border-t border-primary-soft pt-4 font-bold"><span>Total</span>{currency.format(total)}</p>
        <label className="block text-sm font-medium">
          Payment method
          <select className="field mt-1" value={paymentMethod} disabled={submitting} onChange={(event) => setPaymentMethod(event.target.value)}>
            <option>Cash</option>
            <option>Card</option>
          </select>
        </label>
        <button className="btn-primary mt-4 w-full" disabled={submitting || !selected.length}>
          {submitting ? "Saving sale…" : "Complete sale"}
        </button>
        {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
        {receipt && <p className="mt-3 text-base text-primary-hover" role="status">Sale #{receipt.id} saved · {currency.format(receipt.total)}</p>}
      </form>
    </div>
  )
}

function SalesHistory() {
  const [filters, setFilters] = useState({ from: "", to: "", payment: "", sort: "newest" })
  const [page, setPage] = useState(1)
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to)
  const query = new URLSearchParams({ ...filters, page })
  const { data, loading, error } = useFetch("cashier", `${salesUrl}?${query}`)

  function update(event) {
    setFilters({ ...filters, [event.target.name]: event.target.value })
    setPage(1)
  }

  return (
    <section className="panel">
      <h2 className="text-xl font-bold">Store sales history</h2>
      <div className="my-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label>From<input className="field" type="date" name="from" value={filters.from} onChange={update} /></label>
        <label>To<input className="field" type="date" name="to" value={filters.to} onChange={update} /></label>
        <label>Payment method
          <select className="field" name="payment" value={filters.payment} onChange={update}>
            <option value="">All methods</option><option>Cash</option><option>Card</option>
          </select>
        </label>
        <label>Sort by
          <select className="field" name="sort" value={filters.sort} onChange={update}>
            <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
            <option value="highest">Highest total</option><option value="lowest">Lowest total</option>
          </select>
        </label>
      </div>
      {invalidRange ? <p role="alert">The end date must be on or after the start date.</p> :
        loading ? <p role="status">Loading sales…</p> :
        error ? <p className="text-red-700" role="alert">{error}</p> :
        !data.sales.length ? <p>No sales match these filters.</p> : (
          <div className="overflow-x-auto rounded-lg border border-primary-soft">
            <table className="w-full text-left text-sm">
              <thead className="bg-background text-text-main">
                <tr>{["Sale", "Date", "Cashier", "Payment", "Total"].map((label) =>
                  <th key={label} className="whitespace-nowrap p-3" scope="col">{label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-primary-soft">
                {data.sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="p-3">#{sale.id}</td>
                    <td className="whitespace-nowrap p-3">{dateTime.format(new Date(sale.created_at))}</td>
                    <td className="p-3">{sale.cashier_name ?? sale.cashier_id ?? "—"}</td>
                    <td className="p-3">{sale.payment_method ?? "—"}</td>
                    <td className="whitespace-nowrap p-3">{sale.total == null ? "—" : currency.format(sale.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {(page > 1 || data.hasMore) && (
        <div className="mt-4 flex items-center gap-3">
          <button className="btn-primary" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page}</span>
          <button className="btn-primary" disabled={!data.hasMore || loading} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}
    </section>
  )
}

export default function CashierSales({ storeId }) {
  const [view, setView] = useState("checkout")
  if (storeId == null) return <p className="mt-6" role="alert">This cashier has no assigned store.</p>

  return (
    <div className="mt-6">
      <div className="mb-5 flex flex-wrap gap-2">
        {[["checkout", "New sale"], ["history", "Sales history"]].map(([id, label]) => (
          <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)}
            className="btn-secondary">
            {label}
          </button>
        ))}
      </div>
      <div hidden={view !== "checkout"}><Checkout /></div>
      {view === "history" && <SalesHistory />}
    </div>
  )
}
