#!/usr/bin/env node

/**
 * Script pentru redenumire fișiere registru
 * xyz_registru.json -> xyz_registru_2024.json
 * 
 * Utilizare:
 *   node scripts/rename-registru-files.js [year]
 * 
 * Exemplu:
 *   node scripts/rename-registru-files.js 2024
 */

import { rename, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), 'data');
const OLD_DIR = join(process.cwd(), 'OLD_PHP', 'writable');

async function renameRegistruFiles(year = '2024') {
  const directories = [DATA_DIR];
  
  // Adaugă și folderul vechi dacă există
  if (existsSync(OLD_DIR)) {
    directories.push(OLD_DIR);
  }

  let renamed = 0;
  let skipped = 0;

  for (const dir of directories) {
    if (!existsSync(dir)) {
      console.log(`ℹ️  Folderul ${dir} nu există, se sare peste.`);
      continue;
    }

    const files = await readdir(dir);
    const registruFiles = files.filter(f => 
      f.endsWith('_registru.json') && !f.includes('_registru_')
    );

    if (registruFiles.length === 0) {
      console.log(`ℹ️  Nu s-au găsit fișiere de redenumit în ${dir}`);
      continue;
    }

    for (const file of registruFiles) {
      const oldPath = join(dir, file);
      const newFile = file.replace('_registru.json', `_registru_${year}.json`);
      const newPath = join(dir, newFile);

      // Verifică dacă fișierul nou există deja
      if (existsSync(newPath)) {
        console.log(`⏭️  ${file}: Fișierul ${newFile} există deja, se sare peste.`);
        skipped++;
        continue;
      }

      try {
        await rename(oldPath, newPath);
        console.log(`✅ ${file} -> ${newFile}`);
        renamed++;
      } catch (error) {
        console.error(`❌ ${file}: Eroare - ${error.message}`);
      }
    }
  }

  console.log('\n📊 Rezumat:');
  console.log(`   ✅ Redenumite: ${renamed}`);
  console.log(`   ⏭️  Sărite: ${skipped}`);
}

// Verifică argumentele
const args = process.argv.slice(2);
const year = args[0] || '2024';

if (!/^\d{4}$/.test(year)) {
  console.error('❌ Anul trebuie să fie în format YYYY (ex: 2024)');
  process.exit(1);
}

renameRegistruFiles(year).catch(error => {
  console.error('❌ Eroare:', error.message);
  process.exit(1);
});
