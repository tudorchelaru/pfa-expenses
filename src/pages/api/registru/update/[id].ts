import type { APIRoute } from 'astro';
import { updateRegistruEntry } from '../../../../lib/registru';

export const POST: APIRoute = async ({ params, request, cookies }) => {
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

  const formData = await request.formData();
  const data = formData.get('data')?.toString() || '';
  const tip = formData.get('tip')?.toString() || '';
  const metoda = formData.get('metoda')?.toString() || '';
  const suma = parseFloat(formData.get('suma')?.toString() || '0');
  const valuta = formData.get('valuta')?.toString() || 'RON';
  const document = formData.get('document')?.toString() || '';
  const deductibilitate = parseInt(formData.get('deductibilitate')?.toString() || '100');
  const tip_cheltuiala = formData.get('tip_cheltuiala')?.toString() || 'diverse';

  try {
    const entry = {
      data,
      tip: tip as 'incasare' | 'plata',
      metoda: metoda as 'numerar' | 'banca',
      suma,
      valuta,
      document,
      deductibilitate,
      tip_cheltuiala: tip === 'plata' ? tip_cheltuiala : undefined
    };

    await updateRegistruEntry(username, entryId, entry);

    return new Response(JSON.stringify({ message: 'Intrarea a fost actualizată.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Eroare la actualizare:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Eroare la actualizare.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
