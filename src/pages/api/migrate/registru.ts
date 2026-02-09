import type { APIRoute } from 'astro';
import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { writeJSONFile, readJSONFile } from '../../../lib/storage';

// Endpoint pentru migrare registre din data/*_registru_*.json în Redis
export const GET: APIRoute = async ({ url }) => {
  // Pe Vercel, data/ nu există în build, deci GET returnează instrucțiuni
  return new Response(JSON.stringify({
    message: 'Pe Vercel, folosește POST pentru a migra registre',
    instructions: {
      method: 'POST',
      endpoint: '/api/migrate/registru',
      body: {
        username: 'tudor',
        year: '2026',
        entries: [
          {
            "data": "2026-02-09",
            "tip": "plata",
            "metoda": "banca",
            "suma": 86,
            "valuta": "RON",
            "document": "INVOICE YH5RFDWQ-0003 - CURSOR PRO",
            "deductibilitate": 100,
            "tip_cheltuiala": "diverse"
          }
        ]
      }
    },
    note: 'Folosește scriptul: node scripts/migrate-to-redis.js',
    localMigration: 'Pe local, poți folosi GET pentru migrare automată din fișiere'
  }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
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
    
    // Caută fișierul în mai multe locații
    const possiblePaths = [
      join(process.cwd(), '.vercel', 'output', 'static', 'data', fileName), // Vercel build output
      join(process.cwd(), 'public', 'data', fileName), // Local public
      join(process.cwd(), 'data', fileName), // Local development
    ];
    
    let filePath: string | null = null;
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        filePath = path;
        break;
      }
    }
    
    if (!filePath) {
      // Pe Vercel, încercă să citească prin fetch
      if (process.env.VERCEL) {
        return new Response(JSON.stringify({ 
          error: `Fișierul ${fileName} nu este accesibil prin filesystem pe Vercel`,
          note: 'Folosește POST cu datele JSON în body sau scriptul local: node scripts/migrate-to-redis.js',
          searched: possiblePaths
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ 
        error: `Fișierul ${fileName} nu există`,
        searched: possiblePaths,
        note: 'Asigură-te că ai rulat "npm run build" pentru a copia fișierele în public/data/'
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
    // Pe Vercel, fișierele din public/ sunt servite static
    // Trebuie să le citim prin fetch sau din .vercel/output/static
    // Pe local, le citim din data/ sau public/data/
    
    const possibleDirs = [
      join(process.cwd(), '.vercel', 'output', 'static', 'data'), // Vercel build output
      join(process.cwd(), 'public', 'data'), // Local public
      join(process.cwd(), 'data'), // Local development
    ];
    
    let dataDir: string | null = null;
    for (const dir of possibleDirs) {
      if (existsSync(dir)) {
        dataDir = dir;
        break;
      }
    }
    
    if (!dataDir) {
      // Pe Vercel, încercă să citească prin fetch din public/
      if (process.env.VERCEL) {
        // Lista cunoscută de fișiere (din public/data/)
        const knownFiles = [
          'andreea_registru_2024.json',
          'andreea_registru_2026.json',
          'razvan_registru_2024.json',
          'roxana_registru_2024.json',
          'tudor_registru_2025.json',
          'tudor_registru_2026.json',
        ];
        
        const results: any[] = [];
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'https://pfa-expenses.vercel.app';
        
        for (const fileName of knownFiles) {
          try {
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
            
            // Citește prin fetch de la URL-ul public
            const fileUrl = `${baseUrl}/data/${fileName}`;
            const response = await fetch(fileUrl);
            
            if (!response.ok) {
              results.push({ 
                fileName, 
                status: 'skipped', 
                reason: `Nu există la ${fileUrl} (${response.status})` 
              });
              continue;
            }
            
            const entries = await response.json();
            
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
            total: knownFiles.length,
            migrated,
            skipped,
            errors
          },
          results,
          note: migrated > 0 ? 'Fișierele migrate pot fi șterse din public/data/ după verificare' : null
        }, null, 2), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ 
        error: 'Nu s-au găsit fișiere de registru',
        searched: possibleDirs,
        note: 'Asigură-te că ai rulat "npm run build" pentru a copia fișierele în public/data/',
        alternative: 'Folosește POST cu datele JSON în body'
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
      results,
      note: migrated > 0 ? 'Fișierele migrate pot fi șterse din public/data/ după verificare' : null
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
