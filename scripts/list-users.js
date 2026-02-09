#!/usr/bin/env node

/**
 * Script pentru listare utilizatori din data/users.json
 * 
 * Utilizare:
 *   node scripts/list-users.js
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const USERS_FILE = join(process.cwd(), 'data', 'users.json');

async function listUsers() {
  if (!existsSync(USERS_FILE)) {
    console.log('📋 Nu există utilizatori încă.');
    console.log('   Folosește: node scripts/add-user.js <username> <password>');
    return;
  }

  const content = await readFile(USERS_FILE, 'utf-8');
  const users = JSON.parse(content);

  if (users.length === 0) {
    console.log('📋 Nu există utilizatori încă.');
    return;
  }

  console.log('📋 Utilizatori existenti:\n');
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.username}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Creat: ${user.created_at || 'N/A'}`);
    console.log('');
  });
}

listUsers().catch(error => {
  console.error('❌ Eroare:', error.message);
  process.exit(1);
});
