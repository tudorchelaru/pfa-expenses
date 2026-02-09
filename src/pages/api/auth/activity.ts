import type { APIRoute } from 'astro';
import { findSession, updateSessionActivity } from '../../../lib/sessions';

// Endpoint pentru actualizarea activității utilizatorului (heartbeat)
export const POST: APIRoute = async ({ cookies }) => {
  const sessionId = cookies.get('session')?.value;
  
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Nu există sesiune activă' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Verifică dacă sesiunea există și este validă
    const session = await findSession(sessionId);
    
    if (!session) {
      // Sesiunea a expirat sau nu există
      cookies.delete('session', { path: '/' });
      return new Response(JSON.stringify({ error: 'Sesiune expirată' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Actualizează ultima activitate
    await updateSessionActivity(sessionId);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Eroare la actualizare activitate:', error);
    return new Response(JSON.stringify({ error: 'Eroare la actualizare activitate' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
