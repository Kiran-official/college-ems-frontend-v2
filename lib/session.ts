import { createSSRClient } from './supabase/server';
import { redirect } from 'next/navigation';

export async function requireSession(redirectTo = "/login") {
  const supabase = await createSSRClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect(redirectTo);
  }
  
  return user;
}
