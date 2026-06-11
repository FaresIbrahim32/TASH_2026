import { NextResponse } from "next/server";

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("tash_session");

  // Define route groups
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/signup");
  
  // Protect all routes except auth routes, public assets, and API endpoints
  const isProtectedRoute = 
    pathname === "/" || 
    pathname.startsWith("/dashboard") || 
    pathname.startsWith("/test");

  // If user is trying to access a protected page and doesn't have a session cookie, redirect to login
  if (isProtectedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If user is already logged in and tries to access login/signup, redirect them to the home dashboard
  if (isAuthRoute && sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// Config to specify matching paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - tests (public PDF and test assets)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|tests).*)",
  ],
};
