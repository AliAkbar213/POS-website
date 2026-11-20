import { BrowserRouter, Link, Routes, Route } from "react-router"
import Home from "./Pages/Home"
import { WorkspaceLayout, WorkspacePage } from "./WorkspaceLayout"
import AdminWorkspace from "./Pages/AdminWorkspace"
import AdminSales from "./Pages/AdminSales"
import AdminEmployees from "./Pages/AdminEmployees"
import AdminProducts from "./Pages/AdminProducts"
import Cashier from "./Pages/Cashier"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="cashier" element={<Cashier />} />
        <Route element={<WorkspaceLayout />}>
          <Route index element={<Home />} />
        </Route>
        <Route path="admin" element={<AdminWorkspace />}>
          <Route index element={
            <WorkspacePage title="Admin" backTo="/" backLabel="Workspaces">
              <Link className="mt-8 flex items-center justify-between rounded-2xl border border-border bg-surface p-6 font-semibold shadow-sm hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary" to="/admin/products">
                View products <span aria-hidden="true" className="text-primary-hover">→</span>
              </Link>
              <Link className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-surface p-6 font-semibold shadow-sm hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary" to="/admin/employees">
                Employee Management <span aria-hidden="true" className="text-primary-hover">→</span>
              </Link>
              <Link className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-surface p-6 font-semibold shadow-sm hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary" to="/admin/sales">
                Sales &amp; Analytics <span aria-hidden="true" className="text-primary-hover">→</span>
              </Link>
            </WorkspacePage>
          } />
          <Route path="sales" element={<AdminSales />} />
          <Route path="employees" element={<AdminEmployees />} />
          <Route path="products" element={<AdminProducts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
