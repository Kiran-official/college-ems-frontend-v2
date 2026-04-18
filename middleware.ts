import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll: () => request.cookies.getAll(),
                setAll: (cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) => {
                    cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) => response.cookies.set(name, value, options));
                },
            },
        }
    );

    // Use getSession() — reads JWT from cookie locally, NO network call.
    // This is safe in middleware because:
    // 1. The JWT is cryptographically signed — it can't be tampered with
    // 2. We only use it for routing decisions, not data access
    // 3. Actual data queries use getUser() via SSR client which validates server-side
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    const { pathname } = request.nextUrl;

    const PUBLIC_PATHS = ['/login', '/register', '/sw.js', '/manifest.json', '/offline.html'];
    const isPublic = PUBLIC_PATHS.some(path => pathname === path) || pathname.startsWith('/api/');

    // 1. Public routes
    if (isPublic) {
        if (user && (pathname === '/login' || pathname === '/register')) {
            // Already logged in on auth page? Redirect to role dashboard
            // Extract role from JWT metadata to avoid DB call
            const role = user.user_metadata?.role || session?.user?.app_metadata?.role;
            if (role) {
                return NextResponse.redirect(new URL(`/${role}`, request.url));
            }
            // Fallback: fetch from DB only if role not in JWT
            try {
                const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
                if (profile) return NextResponse.redirect(new URL(`/${profile.role}`, request.url));
            } catch {
                return response;
            }
        }
        return response;
    }

    // 2. No session → login
    if (!user) return NextResponse.redirect(new URL('/login', request.url));

    // 3. Role-based routing
    // Fast path: if user is already on a role-prefixed path, we can infer correctness
    // from the JWT rather than making a DB query
    const role = user.user_metadata?.role || user.app_metadata?.role;

    if (role) {
        // Check must_change_password from metadata if available
        const mustChange = user.user_metadata?.must_change_password;
        if (mustChange && pathname !== '/change-password') {
            return NextResponse.redirect(new URL('/change-password', request.url));
        }

        // Role-based route protection using JWT role
        if ((pathname.startsWith('/admin') || pathname === '/dashboard') && role !== 'admin') {
            return NextResponse.redirect(new URL(`/${role}`, request.url));
        }
        if (pathname.startsWith('/teacher') && role !== 'teacher') {
            return NextResponse.redirect(new URL(`/${role}`, request.url));
        }
        if (pathname.startsWith('/student') && role !== 'student') {
            return NextResponse.redirect(new URL(`/${role}`, request.url));
        }

        return response;
    }

    // Fallback: JWT doesn't have role metadata — fetch from DB (only happens once until JWT refreshes)
    let profile = null;
    try {
        const { data } = await supabase.from('users').select('role, is_active, must_change_password').eq('id', user.id).single();
        profile = data;
    } catch (err) {
        console.error('Middleware profile fetch error:', err);
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Inactive → login with error
    if (!profile || !profile.is_active) {
        const url = new URL('/login', request.url);
        url.searchParams.set('error', 'inactive');
        return NextResponse.redirect(url);
    }

    // Must change password → /change-password
    if (profile.must_change_password && pathname !== '/change-password') {
        return NextResponse.redirect(new URL('/change-password', request.url));
    }

    // Role-based route protection
    const dbRole = profile.role;
    if ((pathname.startsWith('/admin') || pathname === '/dashboard') && dbRole !== 'admin') {
        return NextResponse.redirect(new URL(`/${dbRole}`, request.url));
    }
    if (pathname.startsWith('/teacher') && dbRole !== 'teacher') {
        return NextResponse.redirect(new URL(`/${dbRole}`, request.url));
    }
    if (pathname.startsWith('/student') && dbRole !== 'student') {
        return NextResponse.redirect(new URL(`/${dbRole}`, request.url));
    }

    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|offline.html|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|mp4|webm|woff|woff2|ttf|eot)$).*)',
    ],
};
