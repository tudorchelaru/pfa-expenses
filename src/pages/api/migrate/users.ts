import type { APIRoute } from 'astro';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { writeJSONFile, readJSONFile } from '../../../lib/storage';

// Endpoint pentru migrare utilizatori din data/users.json în Redis
// Acceptă atât GET cât și POST pentru ușurință
export const GET: APIRoute = async () => {
  return await migrateUsers();
};

export const POST: APIRoute = async () => {
  return await migrateUsers();
};

async function migrateUsers() {
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
    
    // Pe Vercel, data/users.json nu există în build, deci creăm utilizatori default
    // Folosim utilizatorii din data/users.json dacă există, altfel creăm default
    let users: any[] = [];
    
    // Încearcă să citească din data/users.json (doar în development sau dacă există)
    const localUsersPath = join(process.cwd(), 'data', 'users.json');
    
    if (existsSync(localUsersPath)) {
      try {
        const content = await readFile(localUsersPath, 'utf-8');
        users = JSON.parse(content);
      } catch (error) {
        console.warn('Nu s-a putut citi data/users.json:', error);
      }
    }
    
    // Dacă nu există utilizatori, creăm utilizatori default
    if (!Array.isArray(users) || users.length === 0) {
      const bcrypt = await import('bcryptjs');
      users = [
        {
          id: 1,
          username: 'tudor',
          password: await bcrypt.default.hash('demo123', 10),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          username: 'razvan',
          password: await bcrypt.default.hash('demo123', 10),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 3,
          username: 'andreea',
          password: await bcrypt.default.hash('demo123', 10),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 4,
          username: 'roxana',
          password: await bcrypt.default.hash('demo123', 10),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
    }
    
    // Scrie utilizatorii în Redis
    await writeJSONFile('users', users);
    
    return new Response(JSON.stringify({ 
      message: 'Utilizatorii au fost migrați/creați cu succes în Redis',
      count: users.length,
      users: users.map((u: any) => ({ id: u.id, username: u.username })),
      note: 'Parola default pentru toți utilizatorii: demo123'
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
}
