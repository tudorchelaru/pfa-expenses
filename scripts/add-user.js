#!/usr/bin/env node

/**
 * Script pentru adăugare utilizatori în data/users.json
 * 
 * Utilizare:
 *   node scripts/add-user.js <username> <password>
 * 
 * Exemplu:
 *   node scripts/add-user.js andreea parola123
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import bcrypt from 'bcryptjs';

const USERS_FILE = join(process.cwd(), 'data', 'users.json');

async function addUser(username, password) {
  // Creează directorul dacă nu există
  const dir = join(process.cwd(), 'data');
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  // Citește utilizatorii existenți
  let users = [];
  if (existsSync(USERS_FILE)) {
    const content = await readFile(USERS_FILE, 'utf-8');
    users = JSON.parse(content);
  }

  // Verifică dacă utilizatorul există deja
  if (users.find(u => u.username === username)) {
    console.error(`❌ Utilizatorul "${username}" există deja!`);
    process.exit(1);
  }

  // Creează utilizatorul nou
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: Math.max(...users.map(u => u.id || 0), 0) + 1,
    username,
    password: hashedPassword,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  users.push(newUser);

  // Salvează
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');

  console.log(`✅ Utilizator "${username}" adăugat cu succes!`);
  console.log(`   ID: ${newUser.id}`);
  console.log(`   Username: ${username}`);
  console.log(`   Parolă: ${password} (hash-uită)`);
}

// Verifică argumentele
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('❌ Utilizare: node scripts/add-user.js <username> <password>');
  process.exit(1);
}

const [username, password] = args;

if (!username || !password) {
  console.error('❌ Username și parola sunt obligatorii!');
  process.exit(1);
}

addUser(username, password).catch(error => {
  console.error('❌ Eroare:', error.message);
  process.exit(1);
});
