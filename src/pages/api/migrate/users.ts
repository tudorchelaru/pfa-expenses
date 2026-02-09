import type { APIRoute } from 'astro';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { writeJSONFile, readJSONFile } from '../../../lib/storage';

// Endpoint pentru migrare utilizatori din data/users.json în Redis
export const POST: APIRoute = async ({ request }) => {
  try {
    // Verifică dacă există deja utilizatori în Redis
    const existingUsers = await readJSONFile('users');
    if (existingUsers && existingUsers.length > 0) {
      return new Response(JSON.stringify({ 
        message: 'Utilizatorii există deja în Redis',
        count: existingUsers.length 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Încearcă să citească din data/users.json
    const localUsersPath = join(process.cwd(), 'data', 'users.json');
    
    if (!existsSync(localUsersPath)) {
      return new Response(JSON.stringify({ 
        error: 'Fișierul data/users.json nu există',
        suggestion: 'Creează utilizatori manual sau folosește scriptul npm run user:add'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const content = await readFile(localUsersPath, 'utf-8');
    const users = JSON.parse(content);
    
    if (!Array.isArray(users) || users.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Nu există utilizatori în fișier',
        suggestion: 'Creează utilizatori manual sau folosește scriptul npm run user:add'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Scrie utilizatorii în Redis
    await writeJSONFile('users', users);
    
    return new Response(JSON.stringify({ 
      message: 'Utilizatorii au fost migrați cu succes în Redis',
      count: users.length,
      users: users.map((u: any) => ({ id: u.id, username: u.username }))
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Eroare la migrare utilizatori:', error);
    return new Response(JSON.stringify({ 
      error: 'Eroare la migrare',
      details: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
