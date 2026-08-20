import { NextRequest, NextResponse } from 'next/server';

const legacyHosts = new Set(['helpmeetshine.org.ng', 'www.helpmeetshine.org.ng']);

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host')?.split(':')[0].toLowerCase();

  if (!hostname || !legacyHosts.has(hostname)) {
    return NextResponse.next();
  }

  const destination = request.nextUrl.clone();
  destination.protocol = 'https:';
  destination.hostname = 'www.hmsi.org.ng';

  return NextResponse.redirect(destination, 308);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
