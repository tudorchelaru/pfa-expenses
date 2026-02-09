import type { APIRoute } from 'astro';
import { readdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { readJSONFile } from '../../../lib/storage';

// Endpoint pentru ștergerea fișierelor migrate din public/data/
// Șterge doar fișierele care există deja în Redis
export const POST: APIRoute = async () => {
  try {
    const publicDataDir = join(process.cwd(), 'public', 'data');
    
    if (!existsSync(publicDataDir)) {
      return new Response(JSON.stringify({ 
        message: 'Directorul public/data/ nu există',
        deleted: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const files = await readdir(publicDataDir);
    const registruFiles = files.filter(f => 
      f.includes('_registru_') && f.endsWith('.json')
    );
    
    if (registruFiles.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'Nu există fișiere de registru în public/data/',
        deleted: 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const results: any[] = [];
    let deleted = 0;
    
    for (const fileName of registruFiles) {
      try {
        const match = fileName.match(/^(.+)_registru_(\d{4})\.json$/);
        if (!match) {
          results.push({ fileName, status: 'skipped', reason: 'Format invalid' });
          continue;
        }
        
        const [, username, year] = match;
        const usernameLower = username.toLowerCase();
        const redisKey = `registru:${usernameLower}:${year}`;
        
        // Verifică dacă există în Redis
        const existsInRedis = await readJSONFile(redisKey);
        if (existsInRedis && Array.isArray(existsInRedis) && existsInRedis.length > 0) {
          // Șterge fișierul pentru că există în Redis
          const filePath = join(publicDataDir, fileName);
          await unlink(filePath);
          deleted++;
          results.push({ 
            fileName, 
            status: 'deleted', 
            reason: 'Există în Redis',
            count: existsInRedis.length
          });
        } else {
          results.push({ 
            fileName, 
            status: 'kept', 
            reason: 'Nu există în Redis - migrează-l mai întâi'
          });
        }
      } catch (error: any) {
        results.push({ 
          fileName, 
          status: 'error', 
          error: error.message 
        });
      }
    }
    
    return new Response(JSON.stringify({ 
      message: `Cleanup complet: ${deleted} fișiere șterse`,
      summary: {
        total: registruFiles.length,
        deleted,
        kept: registruFiles.length - deleted
      },
      results
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Eroare la cleanup:', error);
    return new Response(JSON.stringify({ 
      error: 'Eroare la cleanup',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
