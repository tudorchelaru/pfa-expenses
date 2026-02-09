import type { APIRoute } from 'astro';
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { writeJSONFile, readJSONFile } from '../../../lib/storage';

// Endpoint pentru migrare registre din data/*_registru_*.json în Redis
export const GET: APIRoute = async ({ url }) => {
  const username = url.searchParams.get('username');
  const year = url.searchParams.get('year');
  
  if (username && year) {
    return await migrateSingleRegistru(username, year);
  }
  
  return await migrateAllRegistru();
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    
    // Dacă există date direct în body, migrează-le
    if (body.entries && Array.isArray(body.entries) && body.username && body.year) {
      return await migrateRegistruFromData(body.username, body.year, body.entries);
    }
    
    const username = body.username;
    const year = body.year;
    
    if (username && year) {
      return await migrateSingleRegistru(username, year);
    }
    
    return await migrateAllRegistru();
  } catch (error: any) {
    return new Response(JSON.stringify({ 
      error: 'Eroare la procesare request',
      details: error.message 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function migrateRegistruFromData(username: string, year: string, entries: any[]) {
  try {
    const usernameLower = username.toLowerCase();
    const redisKey = `registru:${usernameLower}:${year}`;
    
    // Verifică dacă există deja în Redis
    const existing = await readJSONFile(redisKey);
    if (existing && Array.isArray(existing) && existing.length > 0) {
      return new Response(JSON.stringify({ 
        message: `Registru pentru ${username} ${year} există deja în Redis`,
        count: existing.length,
        note: 'Folosește PUT pentru a suprascrie'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validează entries
    if (!Array.isArray(entries)) {
      return new Response(JSON.stringify({ 
        error: 'entries trebuie să fie un array'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Salvează în Redis
    await writeJSONFile(redisKey, entries);
    
    return new Response(JSON.stringify({ 
      message: `Registru pentru ${username} ${year} migrat cu succes în Redis`,
      count: entries.length,
      key: redisKey
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Eroare la migrare registru din date:', error);
    return new Response(JSON.stringify({ 
      error: 'Eroare la migrare',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function migrateSingleRegistru(username: string, year: string) {
  try {
    const usernameLower = username.toLowerCase();
    const fileName = `${usernameLower}_registru_${year}.json`;
    const filePath = join(process.cwd(), 'data', fileName);
    
    // Verifică dacă există deja în Redis
    const redisKey = `registru:${usernameLower}:${year}`;
    const existing = await readJSONFile(redisKey);
    if (existing && Array.isArray(existing) && existing.length > 0) {
      return new Response(JSON.stringify({ 
        message: `Registru ${fileName} există deja în Redis`,
        count: existing.length 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Citește din fișier
    if (!existsSync(filePath)) {
      return new Response(JSON.stringify({ 
        error: `Fișierul ${fileName} nu există`,
        path: filePath
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const content = await readFile(filePath, 'utf-8');
    const entries = JSON.parse(content);
    
    if (!Array.isArray(entries)) {
      return new Response(JSON.stringify({ 
        error: 'Format invalid în fișier',
        suggestion: 'Fișierul trebuie să conțină un array JSON'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Salvează în Redis
    await writeJSONFile(redisKey, entries);
    
    return new Response(JSON.stringify({ 
      message: `Registru ${fileName} migrat cu succes în Redis`,
      count: entries.length,
      key: redisKey
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Eroare la migrare registru:', error);
    return new Response(JSON.stringify({ 
      error: 'Eroare la migrare',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function migrateAllRegistru() {
  try {
    const dataDir = join(process.cwd(), 'data');
    
    if (!existsSync(dataDir)) {
      // Pe Vercel, data/ nu există în build
      return new Response(JSON.stringify({ 
        error: 'Directorul data/ nu există',
        note: 'Pe Vercel, folosește POST cu datele JSON în body',
        example: {
          method: 'POST',
          body: {
            username: 'tudor',
            year: '2026',
            entries: [
              { "data": "2026-02-09", "tip": "plata", ... }
            ]
          }
        }
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Găsește toate fișierele *_registru_*.json
    const files = await readdir(dataDir);
    const registruFiles = files.filter(f => 
      f.includes('_registru_') && f.endsWith('.json')
    );
    
    if (registruFiles.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'Nu există fișiere de registru de migrat',
        files: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const results: any[] = [];
    
    for (const fileName of registruFiles) {
      try {
        // Extrage username și year din nume
        const match = fileName.match(/^(.+)_registru_(\d{4})\.json$/);
        if (!match) {
          results.push({ fileName, status: 'skipped', reason: 'Format invalid' });
          continue;
        }
        
        const [, username, year] = match;
        const usernameLower = username.toLowerCase();
        const redisKey = `registru:${usernameLower}:${year}`;
        
        // Verifică dacă există deja în Redis
        const existing = await readJSONFile(redisKey);
        if (existing && Array.isArray(existing) && existing.length > 0) {
          results.push({ 
            fileName, 
            status: 'skipped', 
            reason: 'Există deja în Redis',
            count: existing.length 
          });
          continue;
        }
        
        // Citește și migrează
        const filePath = join(dataDir, fileName);
        const content = await readFile(filePath, 'utf-8');
        const entries = JSON.parse(content);
        
        if (Array.isArray(entries)) {
          await writeJSONFile(redisKey, entries);
          results.push({ 
            fileName, 
            status: 'migrated', 
            count: entries.length,
            key: redisKey
          });
        } else {
          results.push({ fileName, status: 'error', reason: 'Format invalid' });
        }
      } catch (error: any) {
        results.push({ 
          fileName, 
          status: 'error', 
          error: error.message 
        });
      }
    }
    
    const migrated = results.filter(r => r.status === 'migrated').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;
    
    return new Response(JSON.stringify({ 
      message: `Migrare completă: ${migrated} migrate, ${skipped} skipate, ${errors} erori`,
      summary: {
        total: registruFiles.length,
        migrated,
        skipped,
        errors
      },
      results
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Eroare la migrare registre:', error);
    return new Response(JSON.stringify({ 
      error: 'Eroare la migrare',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
