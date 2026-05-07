'use client'

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

interface UserRecord {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

type Role = 'SUPER_OPERATOR' | 'OPERATOR' | 'UNASSIGNED'

const ROLE_LABELS: Record<Role, string> = {
  SUPER_OPERATOR: 'Super Operator',
  OPERATOR: 'Operator',
  UNASSIGNED: 'Unassigned',
}

const ROLE_COLORS: Record<Role, string> = {
  SUPER_OPERATOR: 'text-amber-400',
  OPERATOR: 'text-green-400',
  UNASSIGNED: 'text-zinc-500',
}

export default function UserRoleManager() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  async function handleRoleChange(userId: string, newRole: Role) {
    setUpdatingId(userId)
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to update role')
      }

      const updated = await res.json()
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u))
      )
      toast.success(`Role updated to ${ROLE_LABELS[newRole]}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
          User Management
        </h2>
        <button
          onClick={fetchUsers}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-6 text-zinc-500 text-sm">Loading users…</div>
      ) : users.length === 0 ? (
        <div className="text-center py-6 text-zinc-500 text-sm">No users found</div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 bg-zinc-800 rounded-lg px-4 py-3"
            >
              {/* User info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100 truncate">{user.name}</p>
                <p className="text-xs text-zinc-500 truncate">{user.email}</p>
              </div>

              {/* Current role badge */}
              <span
                className={`text-xs font-medium ${ROLE_COLORS[user.role as Role] ?? 'text-zinc-400'} hidden sm:block`}
              >
                {ROLE_LABELS[user.role as Role] ?? user.role}
              </span>

              {/* Role selector */}
              <select
                value={user.role}
                onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                disabled={updatingId === user.id}
                aria-label={`Role for ${user.name}`}
                className="rounded-lg bg-zinc-700 border border-zinc-600 text-zinc-100 text-xs px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="SUPER_OPERATOR">Super Operator</option>
                <option value="OPERATOR">Operator</option>
                <option value="UNASSIGNED">Unassigned</option>
              </select>

              {updatingId === user.id && (
                <span className="text-xs text-zinc-500 animate-pulse">Saving…</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
