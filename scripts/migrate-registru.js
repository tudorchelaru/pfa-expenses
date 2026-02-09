#!/usr/bin/env node

/**
 * Script pentru migrare fișiere registru din OLD_PHP/writable/ în data/
 * 
 * Utilizare:
 *   node scripts/migrate-registru.js [username]
 * 
 * Dacă nu specifici username, migrează toate fișierele găsite.
 * 
 * Exemplu:
 *   node scripts/migrate-registru.js
 *   node scripts/migrate-registru.js tudor
 */

import { readFile, writeFile, mkdir, copyFile } from 'fs/promises';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

const OLD_DIR = join(process.cwd(), 'OLD_PHP', 'writable');
const NEW_DIR = join(process.cwd(), 'data');

async function migrateRegistru(username = null) {
  // Creează directorul data/ dacă nu există
  if (!existsSync(NEW_DIR)) {
    await mkdir(NEW_DIR, { recursive: true });
  }

  // Dacă nu există folderul vechi, nu avem ce migra
  if (!existsSync(OLD_DIR)) {
    console.log('ℹ️  Folderul OLD_PHP/writable/ nu există.');
    return;
  }

  let filesToMigrate = [];

  if (username) {
    // Migrează doar pentru un utilizator specific
    const oldFile = join(OLD_DIR, `${username.toLowerCase()}_registru.json`);
    const newFile = join(NEW_DIR, `${username.toLowerCase()}_registru.json`);
    
    if (existsSync(oldFile)) {
      filesToMigrate.push({ old: oldFile, new: newFile, username });
    } else {
      console.log(`❌ Fișierul pentru "${username}" nu există în OLD_PHP/writable/`);
      return;
    }
  } else {
    // Migrează toate fișierele *_registru.json
    const files = readdirSync(OLD_DIR);
    const registruFiles = files.filter(f => f.endsWith('_registru.json'));
    
    if (registruFiles.length === 0) {
      console.log('ℹ️  Nu s-au găsit fișiere registru în OLD_PHP/writable/');
      return;
    }

    for (const file of registruFiles) {
      const username = file.replace('_registru.json', '');
      const oldFile = join(OLD_DIR, file);
      const newFile = join(NEW_DIR, file);
      filesToMigrate.push({ old: oldFile, new: newFile, username });
    }
  }

  // Migrează fișierele
  let migrated = 0;
  let skipped = 0;

  for (const { old, new: newFile, username } of filesToMigrate) {
    if (existsSync(newFile)) {
      console.log(`⏭️  ${username}: Fișierul există deja în data/, se sare peste.`);
      skipped++;
      continue;
    }

    try {
      // Citește și validează JSON-ul
      const content = await readFile(old, 'utf-8');
      const data = JSON.parse(content);
      
      // Scrie în locația nouă
      await writeFile(newFile, JSON.stringify(data, null, 2), 'utf-8');
      
      console.log(`✅ ${username}: Migrat cu succes (${Array.isArray(data) ? data.length : 0} înregistrări)`);
      migrated++;
    } catch (error) {
      console.error(`❌ ${username}: Eroare la migrare - ${error.message}`);
    }
  }

  console.log('\n📊 Rezumat:');
  console.log(`   ✅ Migrate: ${migrated}`);
  console.log(`   ⏭️  Sărite: ${skipped}`);
  console.log(`\n💡 Fișierele sunt acum în: ${NEW_DIR}/`);
}

// Verifică argumentele
const args = process.argv.slice(2);
const username = args[0] || null;

migrateRegistru(username).catch(error => {
  console.error('❌ Eroare:', error.message);
  process.exit(1);
});
