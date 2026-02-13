import type { APIRoute } from 'astro';
import { findSession } from '../../lib/sessions';
import { readRegistru } from '../../lib/registru';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { generateRegistruPDFBuffer } from '../../lib/pdf-registru';

const isVercel = typeof process !== 'undefined' && !!process.env.VERCEL;

export const POST: APIRoute = async ({ cookies }) => {
  // Verificare autentificare
  const sessionId = cookies.get('session')?.value;
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'Neautorizat' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const session = await findSession(sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Sesiune invalidă' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const username = session.username;

  try {
    // Citește toate înregistrările
    const entries = await readRegistru(username);

    if (entries.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Nu există înregistrări în registru. Adaugă cel puțin o înregistrare.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Grupează datele pe ani și luni
    const byYearMonth: Record<string, Record<number, typeof entries>> = {};
    
    for (const entry of entries) {
      const date = new Date(entry.data);
      if (isNaN(date.getTime())) continue;
      
      const year = date.getFullYear().toString();
      const month = date.getMonth() + 1;
      
      if (!byYearMonth[year]) {
        byYearMonth[year] = {};
      }
      if (!byYearMonth[year][month]) {
        byYearMonth[year][month] = [];
      }
      
      byYearMonth[year][month].push(entry);
    }

    // Pe Vercel: nu scriem pe disk (filesystem read-only). PDF-urile se generează la cerere.
    let registreDir: string | null = null;
    if (!isVercel) {
      registreDir = join(process.cwd(), 'data', 'registre');
      if (!existsSync(registreDir)) {
        await mkdir(registreDir, { recursive: true });
      }
    }

    // Pe Vercel: nu generăm pe disk, doar returnăm succes (PDF-urile se generează la cerere în /api/registre/[filename])
    if (isVercel) {
      const years = Object.keys(byYearMonth);
      return new Response(JSON.stringify({
        message: `PDF-urile sunt disponibile. Mergi la Registre pentru a le deschide (se generează la cerere). Ani: ${years.join(', ')}`,
        years,
        files: years.map(y => `${username}_registru_${y}.pdf`),
        entryCount: entries.length
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generează PDF-uri pe disk (doar local) - folosește pdf-registru.ts
    const generatedFiles: string[] = [];
    for (const [year, months] of Object.entries(byYearMonth)) {
      const filename = `${username}_registru_${year}.pdf`;
      const filepath = join(registreDir!, filename);
      if (existsSync(filepath)) {
        try {
          await unlink(filepath);
        } catch (error) {
          console.error(`Eroare la ștergerea PDF-ului vechi ${filepath}:`, error);
        }
      }
      const buffer = await generateRegistruPDFBuffer(username, year, months);
      await writeFile(filepath, buffer);
      generatedFiles.push(filename);
    }

    const years = Object.keys(byYearMonth);
    
    return new Response(JSON.stringify({ 
      message: `PDF-urile au fost generate cu succes pentru ${years.length} an(i): ${years.join(', ')}`,
      years: years,
      files: generatedFiles,
      entryCount: entries.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Eroare la generarea PDF-urilor:', error);
    return new Response(JSON.stringify({ 
      error: 'Eroare la generarea PDF-urilor: ' + (error instanceof Error ? error.message : 'Eroare necunoscută')
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
