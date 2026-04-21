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

    // Use getUser() — authenticates the JWT by contacting the Supabase Auth server.
    const { data: { user } } = await supabase.auth.getUser();

    const { pathname } = request.nextUrl;

    const PUBLIC_PATHS = ['/login', '/register', '/sw.js', '/manifest.json', '/offline.html'];
    const isPublic = PUBLIC_PATHS.some(path => pathname === path) || pathname.startsWith('/api/');

    // 1. Public routes
    if (isPublic) {
        if (user && (pathname === '/login' || pathname === '/register')) {
            // Check app_metadata (admin-controlled) for role and status
            const role = user.app_metadata?.role;
            const isActive = user.app_metadata?.is_active;

            // ONLY redirect away from auth pages if the user is active
            // If isActive is undefined, we don't redirect (wait for session refresh or forced login)
            if (role && isActive === true) {
                return NextResponse.redirect(new URL(`/${role}`, request.url));
            }
            // If they are logged in but we don't have certain metadata, 
            // we stay on the login page or let them sign out.
            return response;
        }
        return response;
    }

    // 2. No session → login
    if (!user) return NextResponse.redirect(new URL('/login', request.url));

    // 3. Role-based routing
    const role = user.app_metadata?.role;
    const isActive = user.app_metadata?.is_active;
    const mustChange = user.app_metadata?.must_change_password;

    // Fast Path: Role and Status exist in JWT app_metadata
    if (role !== undefined && isActive !== undefined) {
        // 1. Block inactive users
        if (isActive === false) {
            const url = new URL('/login', request.url);
            url.searchParams.set('error', 'inactive');
            return NextResponse.redirect(url);
        }

        // 2. Force password change
        if (mustChange && pathname !== '/change-password') {
            return NextResponse.redirect(new URL('/change-password', request.url));
        }

        // 3. Role-based protection
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
