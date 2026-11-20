import { useState } from "react"
import { useSearchParams } from "react-router"
import { WorkspacePage } from "../WorkspaceLayout"
import useFetch from "../CustomHooks/useFetch"
import apiUrl from "../apiUrl"

const salesUrl = `${apiUrl}/api/admin/sales`
const money = new Intl.NumberFormat("en-KW", { style: "currency", currency: "KWD" })
const numbers = new Intl.NumberFormat("en-KW")
const dates = new Intl.DateTimeFormat("en-KW", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuwait" })
const defaults = { from: "", to: "", store: "", cashier: "", payment: "", min: "", max: "", sort: "newest" }

function SaleDetails({ id, onClose }) {
  const { data, loading, error } = useFetch("admin", `${salesUrl}/${id}`)
  return (
    <section className="panel mt-5" aria-label={`Sale #${id} details`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Sale #{id}</h2>
        <button className="btn-secondary" type="button" onClick={onClose}>Close</button>
      </div>
      {loading ? <p className="mt-4" role="status">Loading sale.</p> : error ? (
        <p className="mt-4 text-red-700" role="alert">{error}</p>
      ) : (
        <>
          <p className="mt-3 text-sm text-text-muted">
            {data.sale.created_at ? dates.format(new Date(data.sale.created_at)) : "Unknown date"}
            {" · "}Store #{data.sale.store_id ?? "—"}
            {" · "}{data.sale.cashier_name || `Cashier #${data.sale.cashier_id ?? "—"}`}
            {" · "}{data.sale.payment_method || "Unknown payment"}
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background"><tr>
                {["Product", "Quantity", "Unit price", "Total"].map((label) => <th key={label} scope="col" className="whitespace-nowrap p-3">{label}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-primary-soft">
                {data.items.map((item) => <tr key={item.product_id}>
                  <td className="p-3">{item.name || `Product #${item.product_id}`}</td>
                  <td className="p-3">{numbers.format(item.quantity)}</td>
                  <td className="whitespace-nowrap p-3">{money.format(item.purchase_price ?? 0)}</td>
                  <td className="whitespace-nowrap p-3">{money.format(item.total ?? 0)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          {!data.items.length && <p className="mt-3 text-text-muted">No line items recorded.</p>}
          <p className="mt-4 text-right text-lg font-bold">Total {data.sale.total == null ? "—" : money.format(data.sale.total)}</p>
        </>
      )}
    </section>
  )
}

export default function AdminSales() {
  const [params, setParams] = useSearchParams()
  const [filters, setFilters] = useState(() => Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, params.get(key) ?? value])))
  const [revision, setRevision] = useState(0)
  const [selected, setSelected] = useState(null)
  const { data: options, error: optionsError } = useFetch("admin", `${salesUrl}/options`)
  const { data, loading, error } = useFetch("admin", `${salesUrl}?${params}&v=${revision}`)
  const page = Number(params.get("page") || 1)
  const invalidRange = filters.from && filters.to && filters.from > filters.to
  const invalidAmounts = filters.min !== "" && filters.max !== "" && Number(filters.min) > Number(filters.max)

  function change(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function apply(event) {
    event.preventDefault()
    if (invalidRange || invalidAmounts) return
    setSelected(null)
    setParams(new URLSearchParams({ ...filters, page: "1" }))
  }

  function reset() {
    setFilters(defaults)
    setSelected(null)
    setParams({})
  }

  function changePage(value) {
    const next = new URLSearchParams(params)
    next.set("page", String(value))
    setSelected(null)
    setParams(next)
  }

  const peak = Math.max(1, ...(data.daily ?? []).map((day) => Number(day.revenue)))

  return (
    <WorkspacePage title="Sales" backTo="/admin" backLabel="Back to Admin" wide>
      <form className="panel mt-8" onSubmit={apply}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1 text-sm font-semibold">From
            <input className="field" type="date" name="from" value={filters.from} onChange={change} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">To
            <input className="field" type="date" name="to" value={filters.to} onChange={change} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">Store
            <select className="field" name="store" value={filters.store} onChange={change}>
              <option value="">All stores</option>
              {(options.stores ?? []).map((store) => <option key={store.id} value={store.id}>Store #{store.id}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">Cashier
            <select className="field" name="cashier" value={filters.cashier} onChange={change}>
              <option value="">All cashiers</option>
              {(options.cashiers ?? []).map((cashier) => <option key={cashier.id} value={cashier.id}>{cashier.name || "Cashier"} (#{cashier.id})</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">Payment
            <select className="field" name="payment" value={filters.payment} onChange={change}>
              <option value="">All methods</option><option>Cash</option><option>Card</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold">Minimum total (KWD)
            <input className="field" type="number" min="0" step="0.001" name="min" value={filters.min} onChange={change} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">Maximum total (KWD)
            <input className="field" type="number" min="0" step="0.001" name="max" value={filters.max} onChange={change} />
          </label>
          <label className="grid gap-1 text-sm font-semibold">Sort by
            <select className="field" name="sort" value={filters.sort} onChange={change}>
              <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
              <option value="highest">Highest total</option><option value="lowest">Lowest total</option>
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-text-muted">Dates and times use Kuwait time. Analytics cover all sales matching the applied filters.</p>
        {optionsError && <p className="mt-3 text-red-700" role="alert">Could not load store and cashier options. Refresh to try again.</p>}
        {(invalidRange || invalidAmounts) && <p className="mt-3 text-red-700" role="alert">{invalidRange ? "The end date must be on or after the start date." : "Maximum total must be at least the minimum."}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" disabled={Boolean(invalidRange || invalidAmounts)}>Apply filters</button>
          <button className="btn-secondary" type="button" onClick={reset}>Reset</button>
          <button className="btn-secondary" type="button" onClick={() => setRevision((current) => current + 1)} disabled={loading}>Refresh</button>
        </div>
      </form>

      {loading ? <p className="mt-5" role="status">Loading sales and analytics.</p> : error ? (
        <p className="mt-5 text-red-700" role="alert">{error}</p>
      ) : (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Revenue", money.format(data.summary.revenue)],
              ["Sales", numbers.format(data.summary.count)],
              ["Average sale", money.format(data.summary.average)],
              ["Units sold", numbers.format(data.summary.units)],
            ].map(([label, value]) => (
              <div key={label} className="panel min-w-0">
                <p className="text-sm text-text-muted">{label}</p>
                <p className="mt-2 break-words text-2xl font-bold tabular-nums">{value}</p>
              </div>
            ))}
          </div>
          {Number(data.summary.count) > 0 && (
            <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
              <section className="panel">
                <h2 className="text-xl font-bold">Daily revenue</h2>
                <p className="mt-1 text-xs text-text-muted">Most recent 30 days with matching sales.</p>
                <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-2">
                  {data.daily.map((day) => (
                    <div key={day.day}>
                      <div className="mb-1 flex justify-between gap-2 text-xs">
                        <span>{day.day}</span><span className="font-semibold tabular-nums">{money.format(day.revenue)} · {numbers.format(day.count)} sales</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-primary-soft">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Number(day.revenue)) / peak * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <div className="grid gap-5">
                <section className="panel">
                  <h2 className="text-xl font-bold">Payment breakdown</h2>
                  <ul className="mt-3 divide-y divide-primary-soft">
                    {data.payments.map((payment) => (
                      <li key={payment.method} className="flex justify-between gap-3 py-3 text-sm">
                        <span>{payment.method}<span className="block text-xs text-text-muted">{numbers.format(payment.count)} sales</span></span>
                        <span className="font-semibold tabular-nums">{money.format(payment.revenue)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="panel">
                  <h2 className="text-xl font-bold">Top products by revenue</h2>
                  {!data.products.length && <p className="mt-3 text-sm text-text-muted">No line items recorded.</p>}
                  <ul className="mt-3 divide-y divide-primary-soft">
                    {data.products.map((product) => (
                      <li key={product.id} className="flex justify-between gap-3 py-3 text-sm">
                        <span>{product.name || `Product #${product.id}`}<span className="block text-xs text-text-muted">{numbers.format(product.units)} units</span></span>
                        <span className="shrink-0 font-semibold tabular-nums">{money.format(product.revenue)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>
          )}

          <section className="panel mt-5 overflow-hidden p-0" aria-label="Sales history">
            <h2 className="px-5 py-4 text-xl font-bold">Sales history</h2>
            {!data.sales.length ? <p className="px-5 pb-5 text-text-muted">No sales on this page match the applied filters.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-text-main text-white"><tr>
                    {["Sale", "Date", "Store", "Cashier", "Payment", "Total", "Details"].map((label) => <th key={label} scope="col" className="whitespace-nowrap px-5 py-3">{label}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-primary-soft">
                    {data.sales.map((sale) => (
                      <tr key={sale.id} className="even:bg-background">
                        <td className="px-5 py-4">#{sale.id}</td>
                        <td className="whitespace-nowrap px-5 py-4">{sale.created_at ? dates.format(new Date(sale.created_at)) : "—"}</td>
                        <td className="px-5 py-4">#{sale.store_id ?? "—"}</td>
                        <td className="px-5 py-4">{sale.cashier_name || `Cashier #${sale.cashier_id ?? "—"}`}</td>
                        <td className="px-5 py-4">{sale.payment_method || "—"}</td>
                        <td className="whitespace-nowrap px-5 py-4 tabular-nums">{sale.total == null ? "—" : money.format(sale.total)}</td>
                        <td className="px-5 py-4"><button className="btn-secondary" type="button" aria-expanded={selected === sale.id} aria-label={`View sale ${sale.id}`} onClick={() => setSelected(selected === sale.id ? null : sale.id)}>View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-5">
              <p className="text-sm text-text-muted">{numbers.format(data.summary.count)} matching sales · Page {page} of {Math.max(1, data.pages)}</p>
              <div className="flex gap-2">
                <button className="btn-secondary" type="button" disabled={page <= 1} onClick={() => changePage(page - 1)}>Previous</button>
                <button className="btn-primary" type="button" disabled={page >= data.pages} onClick={() => changePage(page + 1)}>Next</button>
              </div>
            </div>
          </section>
          {selected && <SaleDetails key={selected} id={selected} onClose={() => setSelected(null)} />}
        </>
      )}
    </WorkspacePage>
  )
}
