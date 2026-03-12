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

    let user = null;
    try {
        const { data } = await supabase.auth.getUser();
        user = data.user;
    } catch (error) {
        console.error('Middleware Supabase getUser error:', error);
    }

    const { pathname } = request.nextUrl;

    const PUBLIC_PATHS = ['/login', '/register'];
    const isPublic = PUBLIC_PATHS.includes(pathname);

    // 1. Public routes
    if (isPublic) {
        if (user) {
            // Already logged in? Redirect to role dashboard
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

    // Fetch profile
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
    const role = profile.role;
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

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|mp4|webm|woff|woff2|ttf|eot)$).*)',
    ],
};
