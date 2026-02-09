import type { APIRoute } from 'astro';
import { deleteRegistruEntry } from '../../../../lib/registru';

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const sessionId = cookies.get('session')?.value;
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Neautorizat' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Obține username-ul din sesiune
  const { findSession } = await import('../../../../lib/sessions');
  const session = await findSession(sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Sesiune invalidă' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const username = session.username;
  const entryId = parseInt(params.id || '0');

  try {
    await deleteRegistruEntry(username, entryId);

    return new Response(JSON.stringify({ message: 'Intrarea a fost ștearsă.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Eroare la ștergere:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Eroare la ștergere.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
