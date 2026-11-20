import { Link } from 'react-router'
import { WorkspacePage } from '../WorkspaceLayout'

const roles = [
  {
    name: 'Cashier',
    path: '/cashier',
    description: 'Register sales and process refunds.',
    icon: 'M3 4h18v12H3z M8 20h8 M12 16v4 M7 9h5',
    accent: 'bg-primary-soft text-primary-strong',
  },
  {
    name: 'Admin',
    path: '/admin',
    description: 'Manage inventory, staff and sales.',
    icon: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    accent: 'bg-primary-hover text-white',
  },
]

export default function Home() {
  return (
    <WorkspacePage title="Choose your workspace">
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {roles.map((role) => (
          <Link key={role.path} to={role.path} className="group panel p-6 transition hover:border-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary motion-reduce:transition-none">
            <div className="flex items-center justify-between">
              <span className={`grid size-12 place-items-center rounded-xl ${role.accent}`} aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d={role.icon} />
                </svg>
              </span>
              <span aria-hidden="true" className="text-xl text-text-muted group-hover:text-primary-hover">→</span>
            </div>
            <h2 className="mt-6 text-xl font-bold">{role.name}</h2>
            <p className="mt-1 text-sm leading-6 text-text-muted">{role.description}</p>
          </Link>
        ))}
      </div>
    </WorkspacePage>
  )
}
