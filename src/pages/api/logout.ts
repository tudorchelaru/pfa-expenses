import type { APIRoute } from 'astro';
import { deleteSession } from '../../lib/sessions';

export const GET: APIRoute = async ({ cookies, redirect }) => {
  const sessionId = cookies.get('session')?.value;
  
  if (sessionId) {
    await deleteSession(sessionId);
  }
  
  cookies.delete('session', { path: '/' });
  return redirect('/login');
};
