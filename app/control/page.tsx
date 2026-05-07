import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import ControlClient from './ControlClient'

// Control panel — requires authentication (Requirements: 2.1, 3.1)
export default async function ControlPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect('/login')
  }

  if (session.user.role === 'UNASSIGNED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
        <div className="text-center space-y-4">
          <div className="text-6xl">🚫</div>
          <h1 className="text-3xl font-bold text-red-400">Access Denied</h1>
          <p className="text-zinc-400 text-lg max-w-md">
            Your account does not have permission to access the control panel.
            Please contact a Super Operator to have your role assigned.
          </p>
          <p className="text-zinc-500 text-sm">
            Signed in as: <span className="text-zinc-300">{session.user.email}</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <ControlClient
      user={{
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role as string,
      }}
    />
  )
}
