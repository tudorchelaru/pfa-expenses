import type { APIRoute } from 'astro';
import { getRegistruEntry } from '../../../../lib/registru';

export const GET: APIRoute = async ({ params, cookies }) => {
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
    const entry = await getRegistruEntry(username, entryId);
    
    if (!entry) {
      return new Response(JSON.stringify({ error: 'Intrarea nu există.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ entry }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Eroare la citire:', error);
    return new Response(JSON.stringify({ error: 'Eroare la citire.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
