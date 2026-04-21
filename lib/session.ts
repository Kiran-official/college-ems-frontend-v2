import { createSSRClient } from './supabase/server';
import { redirect } from 'next/navigation';

export async function requireSession(redirectTo = "/login") {
  const supabase = await createSSRClient();
  // Use getUser() — authenticates the JWT by contacting the Supabase Auth server.
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(redirectTo);
  }

  return user;
}
