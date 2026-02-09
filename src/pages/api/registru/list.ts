import type { APIRoute } from 'astro';
import { readRegistru } from '../../../lib/registru';

export const GET: APIRoute = async ({ cookies }) => {
  const sessionId = cookies.get('session')?.value;
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Neautorizat' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Obține username-ul din sesiune
  const { findSession } = await import('../../../lib/sessions');
  const session = await findSession(sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Sesiune invalidă', rows: [] }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const username = session.username;

  try {
    const entries = await readRegistru(username);
    
    // Adaugă index pentru fiecare rând
    const rows = entries.map((entry, index) => ({
      index,
      ...entry
    }));
    
    // Sortează după dată
    rows.sort((a, b) => a.data.localeCompare(b.data));

    return new Response(JSON.stringify({ rows }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Eroare la citire:', error);
    return new Response(JSON.stringify({ error: 'Eroare la citire', rows: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
