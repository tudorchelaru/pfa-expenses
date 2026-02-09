import type { APIRoute } from 'astro';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { findSession } from '../../../lib/sessions';

export const GET: APIRoute = async ({ params, cookies }) => {
  // Verificare autentificare
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

  // Verifică că fișierul aparține utilizatorului (securitate)
  if (!filename.toLowerCase().includes(username.toLowerCase())) {
    return new Response('Acces interzis', { status: 403 });
  }

  // Căută fișierul în mai multe locații posibile
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

  if (!filePath) {
    return new Response('Fișierul nu există', { status: 404 });
  }

  try {
    const fileContent = await readFile(filePath);
    
    return new Response(fileContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Eroare la citirea PDF:', error);
    return new Response('Eroare la citirea fișierului', { status: 500 });
  }
};
