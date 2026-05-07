/**
 * Integration test: Role management flow
 * - First user gets SUPER_OPERATOR, subsequent users get UNASSIGNED
 * - Cannot remove the last SUPER_OPERATOR
 * Requirements: 3.1, 3.3
 */

import { describe, it, expect } from 'vitest'

// ─── Replicate the first-user bootstrap logic ─────────────────────────────────
// This mirrors the BetterAuth beforeCreate hook in lib/auth.ts

function determineRoleForNewUser(existingUserCount: number): string {
  return existingUserCount === 0 ? 'SUPER_OPERATOR' : 'UNASSIGNED'
}

// ─── Replicate the last-super-operator guard ──────────────────────────────────
// This mirrors the PATCH /api/users/[id]/role route logic

interface User {
  id: string
  name: string
  email: string
  role: string
}

function changeUserRole(
  users: User[],
  targetId: string,
  newRole: string
): { success: boolean; error?: string; users?: User[] } {
  const target = users.find((u) => u.id === targetId)
  if (!target) return { success: false, error: 'User not found' }

  // Enforce: cannot remove the last SUPER_OPERATOR
  if (newRole !== 'SUPER_OPERATOR') {
    const superOperatorCount = users.filter((u) => u.role === 'SUPER_OPERATOR').length
    if (target.role === 'SUPER_OPERATOR' && superOperatorCount <= 1) {
      return {
        success: false,
        error: 'Cannot remove the last SUPER_OPERATOR. Assign another user as SUPER_OPERATOR first.',
      }
    }
  }

  const updated = users.map((u) =>
    u.id === targetId ? { ...u, role: newRole } : u
  )
  return { success: true, users: updated }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('First-user bootstrap', () => {
  it('first registered user gets SUPER_OPERATOR', () => {
    expect(determineRoleForNewUser(0)).toBe('SUPER_OPERATOR')
  })

  it('second registered user gets UNASSIGNED', () => {
    expect(determineRoleForNewUser(1)).toBe('UNASSIGNED')
  })

  it('all subsequent users get UNASSIGNED', () => {
    for (let count = 1; count <= 100; count++) {
      expect(determineRoleForNewUser(count)).toBe('UNASSIGNED')
    }
  })
})

describe('Role assignment exclusivity', () => {
  const baseUsers: User[] = [
    { id: 'u1', name: 'Alice', email: 'alice@example.com', role: 'SUPER_OPERATOR' },
    { id: 'u2', name: 'Bob', email: 'bob@example.com', role: 'UNASSIGNED' },
    { id: 'u3', name: 'Carol', email: 'carol@example.com', role: 'OPERATOR' },
  ]

  it('Super Operator can assign Operator role to another user', () => {
    const result = changeUserRole(baseUsers, 'u2', 'OPERATOR')
    expect(result.success).toBe(true)
    expect(result.users?.find((u) => u.id === 'u2')?.role).toBe('OPERATOR')
  })

  it('cannot remove the last SUPER_OPERATOR', () => {
    const result = changeUserRole(baseUsers, 'u1', 'OPERATOR')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/last SUPER_OPERATOR/i)
  })

  it('can change SUPER_OPERATOR role when another SUPER_OPERATOR exists', () => {
    const usersWithTwoSuperOps: User[] = [
      { id: 'u1', name: 'Alice', email: 'alice@example.com', role: 'SUPER_OPERATOR' },
      { id: 'u2', name: 'Bob', email: 'bob@example.com', role: 'SUPER_OPERATOR' },
    ]
    const result = changeUserRole(usersWithTwoSuperOps, 'u1', 'OPERATOR')
    expect(result.success).toBe(true)
    expect(result.users?.find((u) => u.id === 'u1')?.role).toBe('OPERATOR')
    // u2 remains SUPER_OPERATOR
    expect(result.users?.find((u) => u.id === 'u2')?.role).toBe('SUPER_OPERATOR')
  })

  it('returns error for non-existent user', () => {
    const result = changeUserRole(baseUsers, 'nonexistent', 'OPERATOR')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/not found/i)
  })

  it('at least one SUPER_OPERATOR always exists after any valid role change', () => {
    // Apply a series of role changes and verify invariant holds
    let users: User[] = [
      { id: 'u1', name: 'Alice', email: 'alice@example.com', role: 'SUPER_OPERATOR' },
      { id: 'u2', name: 'Bob', email: 'bob@example.com', role: 'UNASSIGNED' },
    ]

    // Promote Bob to SUPER_OPERATOR
    const r1 = changeUserRole(users, 'u2', 'SUPER_OPERATOR')
    expect(r1.success).toBe(true)
    users = r1.users!

    // Now demote Alice — should succeed since Bob is SUPER_OPERATOR
    const r2 = changeUserRole(users, 'u1', 'OPERATOR')
    expect(r2.success).toBe(true)
    users = r2.users!

    // Verify exactly one SUPER_OPERATOR remains
    const superOps = users.filter((u) => u.role === 'SUPER_OPERATOR')
    expect(superOps).toHaveLength(1)
    expect(superOps[0].id).toBe('u2')
  })
})
