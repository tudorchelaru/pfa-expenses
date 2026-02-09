#!/usr/bin/env node

/**
 * Script pentru actualizare parolă pentru TOȚI utilizatorii
 * 
 * Utilizare:
 *   node scripts/update-all-passwords.js <new_password> [url]
 * 
 * Exemplu:
 *   node scripts/update-all-passwords.js test123
 *   node scripts/update-all-passwords.js test123 http://localhost:4321
 *   node scripts/update-all-passwords.js test123 https://pfa-expenses.vercel.app
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import bcrypt from 'bcryptjs';

const USERS_FILE = join(process.cwd(), 'data', 'users.json');
const API_URL = process.env.API_URL || process.argv[3];

async function updateAllPasswordsLocal(newPassword) {
  console.log('🔐 Actualizare parole pentru toți utilizatorii (local)...\n');

  // Verifică dacă fișierul există
  if (!existsSync(USERS_FILE)) {
    console.error('❌ Fișierul users.json nu există!');
    process.exit(1);
  }

  // Citește utilizatorii existenți
  const content = await readFile(USERS_FILE, 'utf-8');
  const users = JSON.parse(content);

  if (!Array.isArray(users) || users.length === 0) {
    console.error('❌ Nu există utilizatori în fișier!');
    process.exit(1);
  }

  console.log(`📋 Găsiți ${users.length} utilizatori:\n`);

  // Generează hash-ul pentru noua parolă
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  console.log(`🔑 Hash generat pentru parola: ${newPassword}\n`);

  // Actualizează parola pentru fiecare utilizator
  for (const user of users) {
    const oldPasswordHash = user.password.substring(0, 20) + '...';
    user.password = hashedPassword;
    user.updated_at = new Date().toISOString();
    
    console.log(`✅ ${user.username}`);
    console.log(`   Parolă veche: ${oldPasswordHash}`);
    console.log(`   Parolă nouă: ${newPassword} (hash-uită)`);
    console.log(`   Updated at: ${user.updated_at}\n`);
  }

  // Salvează
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');

  console.log(`✨ Parolele au fost actualizate cu succes pentru ${users.length} utilizatori!`);
  console.log(`\n📝 Toți utilizatorii pot acum să se autentifice cu parola: ${newPassword}`);
}

async function updateAllPasswordsRemote(newPassword, url) {
  console.log('🔐 Actualizare parole pentru toți utilizatorii (remote)...\n');
  console.log(`📍 Target: ${url}\n`);

  try {
    const response = await fetch(`${url}/api/admin/update-all-passwords`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword })
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`✅ ${result.message}\n`);
      console.log(`📋 Utilizatori actualizați: ${result.usersCount}\n`);
      
      result.users.forEach(user => {
        console.log(`   ✅ ${user.username}`);
        console.log(`      Updated at: ${user.updated_at}\n`);
      });
      
      console.log(`✨ Toți utilizatorii pot acum să se autentifice cu parola: ${newPassword}`);
    } else {
      console.error(`❌ Eroare: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Eroare la apelarea API:', error.message);
    console.error('\n💡 Asigură-te că aplicația rulează sau că URL-ul este corect');
    process.exit(1);
  }
}

async function updateAllPasswords(newPassword) {
  if (API_URL) {
    await updateAllPasswordsRemote(newPassword, API_URL);
  } else {
    await updateAllPasswordsLocal(newPassword);
  }
}

// Verifică argumentele
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('❌ Utilizare: node scripts/update-all-passwords.js <new_password>');
  console.error('\nExemplu:');
  console.error('   node scripts/update-all-passwords.js test123');
  process.exit(1);
}

const newPassword = args[0];

if (!newPassword) {
  console.error('❌ Parola nouă este obligatorie!');
  process.exit(1);
}

updateAllPasswords(newPassword).catch(error => {
  console.error('❌ Eroare:', error.message);
  process.exit(1);
});
