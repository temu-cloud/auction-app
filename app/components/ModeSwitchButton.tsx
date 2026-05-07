'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function ModeSwitchButton() {
  const pathname = usePathname()
  const isDisplay = pathname?.startsWith('/display')

  if (isDisplay) {
    return (
      <Link
        href="/control"
        className="fixed top-4 left-4 z-50 flex items-center gap-1.5 rounded-md bg-zinc-900/80 px-3 py-1.5 text-sm font-medium text-amber-400 backdrop-blur-sm transition-colors hover:bg-zinc-800/90"
      >
        ⚙ Control
      </Link>
    )
  }

  return (
    <Link
      href="/display"
      className="fixed top-4 left-4 z-50 flex items-center gap-1.5 rounded-md bg-zinc-900/80 px-3 py-1.5 text-sm font-medium text-amber-400 backdrop-blur-sm transition-colors hover:bg-zinc-800/90"
    >
      📺 Display
    </Link>
  )
}
