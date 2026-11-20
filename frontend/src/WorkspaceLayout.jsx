import { Link, Outlet } from 'react-router'

export function WorkspaceLayout({ children, headerActions, themeClass = "" }) {
  return (
    <div className={`min-h-svh bg-background font-body text-text-main antialiased ${themeClass}`}>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link to="/" className="inline-flex items-center gap-3 rounded-md font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
            <span aria-hidden="true" className="grid size-9 grid-cols-2 gap-1 rounded-xl bg-primary-strong p-2">
              <span className="row-span-2 rounded-sm bg-border" />
              <span className="rounded-sm bg-surface" />
              <span className="rounded-sm bg-surface" />
            </span>
            POS System
          </Link>
          {headerActions}
        </div>
      </header>
      {children ?? <Outlet />}
    </div>
  )
}

export function WorkspacePage({ title, backTo, backLabel, wide = false, children }) {
  return (
    <main className={`mx-auto px-5 py-10 sm:px-8 sm:py-16 ${wide ? 'max-w-6xl' : 'max-w-3xl'}`}>
      {backTo && (
        <Link to={backTo} className="mb-7 inline-flex items-center gap-2 rounded text-sm font-semibold text-primary-hover hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
          <span aria-hidden="true">←</span>{backLabel}
        </Link>
      )}
      <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
      {children}
    </main>
  )
}
