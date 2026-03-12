import { createSSRClient } from './supabase/server';
import { redirect } from 'next/navigation';

export async function requireSession(redirectTo = "/login") {
  const supabase = await createSSRClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect(redirectTo);
  }
  
  return session;
}
