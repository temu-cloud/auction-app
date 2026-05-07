import { NextRequest, NextResponse } from 'next/server'
import type { NextProxy, ProxyConfig } from 'next/server'

// The proxy only does a lightweight cookie presence check.
// The actual session validation happens in the page/API route via lib/auth.ts,
// which uses Node.js-only modules (PrismaPg, better-auth) that cannot be
// bundled by Turbopack in the proxy context.
const proxy: NextProxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/control')) {
    // Check for the better-auth session cookie (token is stored as 'better-auth.session_token')
    const sessionToken =
      request.cookies.get('better-auth.session_token')?.value ??
      request.cookies.get('__Secure-better-auth.session_token')?.value

    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export default proxy

export const config: ProxyConfig = {
  matcher: ['/control/:path*'],
}
