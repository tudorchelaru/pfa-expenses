#!/usr/bin/env node

/**
 * Script pentru migrarea utilizatorilor din data/users.json în Redis pe Vercel
 * 
 * Usage: node scripts/migrate-users-to-redis.js [url]
 * 
 * Exemplu:
 *   node scripts/migrate-users-to-redis.js
 *   node scripts/migrate-users-to-redis.js https://pfa-expenses.vercel.app
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const USERS_FILE = join(process.cwd(), 'data', 'users.json');
const VERCEL_URL = process.env.VERCEL_URL || process.argv[2] || 'https://pfa-expenses.vercel.app';

async function migrateUsers() {
  console.log('🚀 Migrare utilizatori în Redis pe Vercel...\n');
  console.log(`📍 Target: ${VERCEL_URL}\n`);

  // Verifică dacă fișierul există
  if (!existsSync(USERS_FILE)) {
    console.error('❌ Fișierul users.json nu există!');
    process.exit(1);
  }

  try {
    // Citește utilizatorii din fișierul local
    console.log('📄 Citind utilizatori din data/users.json...');
    const content = await readFile(USERS_FILE, 'utf-8');
    const users = JSON.parse(content);
    
    if (!Array.isArray(users) || users.length === 0) {
      console.error('❌ Nu există utilizatori în fișier!');
      process.exit(1);
    }

    console.log(`📋 Găsiți ${users.length} utilizatori:\n`);
    users.forEach(u => {
      console.log(`   - ${u.username} (ID: ${u.id})`);
    });
    console.log('');

    // Trimite utilizatorii la endpoint-ul de migrare
    console.log('📤 Trimitere utilizatori la Vercel...\n');
    
    const response = await fetch(`${VERCEL_URL}/api/migrate/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users })
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`✅ ${result.message || 'Utilizatorii au fost migrați cu succes!'}`);
      if (result.count) {
        console.log(`   Count: ${result.count}`);
      }
      if (result.users) {
        console.log(`\n📋 Utilizatori migrați:`);
        result.users.forEach(u => {
          console.log(`   ✅ ${u.username}`);
        });
      }
    } else {
      console.error(`❌ Eroare: ${result.error || 'Eroare necunoscută'}`);
      if (result.details) {
        console.error(`   Details: ${result.details}`);
      }
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Eroare:`, error.message);
    process.exit(1);
  }
}

migrateUsers();
