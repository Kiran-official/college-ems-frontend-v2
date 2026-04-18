import { createSSRClient } from './supabase/server';
import { redirect } from 'next/navigation';

export async function requireSession(redirectTo = "/login") {
  const supabase = await createSSRClient();
  // Use getSession() — reads JWT from cookie, no network call.
  // Middleware has already validated the session, so this is safe for
  // determining if a user is logged in and getting their basic info.
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    redirect(redirectTo);
  }
  
  return session.user;
}
