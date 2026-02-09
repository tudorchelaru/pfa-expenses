import type { APIRoute } from 'astro';
import { addRegistruEntry } from '../../../lib/registru';

export const POST: APIRoute = async ({ request, cookies }) => {
  // Verificare autentificare
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
    return new Response(JSON.stringify({ error: 'Sesiune invalidă' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  const username = session.username;

  const formData = await request.formData();
  
  // Validare și prelucrare date
  const dataRaw = formData.get('data')?.toString() || '';
  const tip = formData.get('tip')?.toString();
  const metoda = formData.get('metoda')?.toString();
  const suma = formData.get('suma')?.toString().replace(',', '.');
  const document = formData.get('document')?.toString().trim();
  const deductibilitate = parseInt(formData.get('deductibilitate')?.toString() || '100');
  const tip_cheltuiala = formData.get('tip_cheltuiala')?.toString() || 'diverse';

  // Validări
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataRaw)) {
    return new Response(JSON.stringify({ error: 'Formatul datei este invalid.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!tip || !['incasare', 'plata'].includes(tip)) {
    return new Response(JSON.stringify({ error: 'Tip invalid. Alege incasare sau plata.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!metoda || !['numerar', 'banca'].includes(metoda)) {
    return new Response(JSON.stringify({ error: 'Metodă invalidă. Alege numerar sau bancă.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const sumaNum = parseFloat(suma || '0');
  if (isNaN(sumaNum) || sumaNum <= 0) {
    return new Response(JSON.stringify({ error: 'Suma trebuie să fie un număr pozitiv.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!document) {
    return new Response(JSON.stringify({ error: 'Completează câmpul document.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Construiește intrarea
  const linie: any = {
    data: dataRaw,
    tip: tip as 'incasare' | 'plata',
    metoda: metoda as 'numerar' | 'banca',
    suma: sumaNum,
    valuta: 'RON',
    document,
    deductibilitate
  };
  
  // Pentru plata, adaugă tip_cheltuiala
  if (tip === 'plata') {
    linie.tip_cheltuiala = tip_cheltuiala;
  } else {
    // Pentru incasare, adaugă tip_cheltuiala: null dacă nu există deja
    linie.tip_cheltuiala = null;
  }

  // Salvează în fișier JSON
  try {
    await addRegistruEntry(username, linie);

    return new Response(JSON.stringify({ message: 'Înregistrare salvată cu succes.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Eroare la salvare:', error);
    return new Response(JSON.stringify({ error: 'Eroare la salvare.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
