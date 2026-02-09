#!/usr/bin/env node

/**
 * Script pentru actualizare parolă utilizator în data/users.json
 * 
 * Utilizare:
 *   node scripts/update-password.js <username> <new_password>
 * 
 * Exemplu:
 *   node scripts/update-password.js tudor noua_parola123
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import bcrypt from 'bcryptjs';

const USERS_FILE = join(process.cwd(), 'data', 'users.json');

async function updatePassword(username, newPassword) {
  // Verifică dacă fișierul există
  if (!existsSync(USERS_FILE)) {
    console.error('❌ Fișierul users.json nu există!');
    process.exit(1);
  }

  // Citește utilizatorii existenți
  const content = await readFile(USERS_FILE, 'utf-8');
  const users = JSON.parse(content);

  // Găsește utilizatorul
  const userIndex = users.findIndex(u => u.username === username);
  
  if (userIndex === -1) {
    console.error(`❌ Utilizatorul "${username}" nu există!`);
    console.log('\n📋 Utilizatori disponibili:');
    users.forEach(u => console.log(`   - ${u.username}`));
    process.exit(1);
  }

  // Actualizează parola
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  users[userIndex].password = hashedPassword;
  users[userIndex].updated_at = new Date().toISOString();

  // Salvează
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');

  console.log(`✅ Parola pentru utilizatorul "${username}" a fost actualizată cu succes!`);
  console.log(`   Username: ${username}`);
  console.log(`   Parolă nouă: ${newPassword} (hash-uită)`);
}

// Verifică argumentele
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('❌ Utilizare: node scripts/update-password.js <username> <new_password>');
  process.exit(1);
}

const [username, newPassword] = args;

if (!username || !newPassword) {
  console.error('❌ Username și parola nouă sunt obligatorii!');
  process.exit(1);
}

updatePassword(username, newPassword).catch(error => {
  console.error('❌ Eroare:', error.message);
  process.exit(1);
});
