import type { APIRoute } from 'astro';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { findSession } from '../../../lib/sessions';
import { readRegistru } from '../../../lib/registru';
import { generateRegistruPDFBuffer } from '../../../lib/pdf-registru';

export const GET: APIRoute = async ({ params, cookies }) => {
  const sessionId = cookies.get('session')?.value;
  if (!sessionId) {
    return new Response('Neautorizat', { status: 401 });
  }

  const session = await findSession(sessionId);
  if (!session) {
    return new Response('Sesiune invalidă', { status: 401 });
  }

  const username = session.username;
  const filename = params.filename;

  if (!filename) {
    return new Response('Nume fișier lipsă', { status: 400 });
  }

  if (!filename.toLowerCase().includes(username.toLowerCase())) {
    return new Response('Acces interzis', { status: 403 });
  }

  // Căută fișierul pe disk (local development)
  const possiblePaths = [
    join(process.cwd(), 'data', 'registre', filename),
    join(process.cwd(), 'OLD_PHP', 'writable', 'registre', filename),
  ];

  let filePath: string | null = null;
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      filePath = path;
      break;
    }
  }

  if (filePath) {
    try {
      const fileContent = await readFile(filePath);
      return new Response(fileContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${filename}"`,
          'Cache-Control': 'no-cache, max-age=0, s-maxage=0, must-revalidate',
          'Pragma': 'no-cache'
        },
      });
    } catch (error) {
      console.error('Eroare la citirea PDF:', error);
      return new Response('Eroare la citirea fișierului', { status: 500 });
    }
  }

  // Pe Vercel sau când fișierul nu există: generează PDF la cerere
  const match = filename.match(/^(.+)_registru_(\d{4})\.pdf$/i);
  if (!match) {
    return new Response('Fișierul nu există', { status: 404 });
  }

  const year = match[2];
  try {
    const entries = await readRegistru(username);
    const byYearMonth: Record<number, typeof entries> = {};
    for (const entry of entries) {
      const date = new Date(entry.data);
      if (isNaN(date.getTime())) continue;
      const entryYear = date.getFullYear().toString();
      if (entryYear !== year) continue;
      const month = date.getMonth() + 1;
      if (!byYearMonth[month]) byYearMonth[month] = [];
      byYearMonth[month].push(entry);
    }

    const hasData = Object.values(byYearMonth).some(arr => arr.length > 0);
    if (!hasData) {
      return new Response('Nu există date pentru acest an', { status: 404 });
    }

    const buffer = await generateRegistruPDFBuffer(username, year, byYearMonth);
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-cache, max-age=0, s-maxage=0, must-revalidate',
        'Pragma': 'no-cache'
      },
    });
  } catch (error) {
    console.error('Eroare la generarea PDF:', error);
    return new Response('Eroare la generarea PDF', { status: 500 });
  }
};
