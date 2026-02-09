#!/usr/bin/env node

/**
 * Script pentru migrarea registrelor din data/ în Redis pe Vercel
 * 
 * Usage: node scripts/migrate-to-redis.js
 */

import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const VERCEL_URL = process.env.VERCEL_URL || 'https://pfa-expenses.vercel.app';

async function migrateFile(fileName) {
  const match = fileName.match(/^(.+)_registru_(\d{4})\.json$/);
  if (!match) {
    console.log(`⏭️  Skip ${fileName} (format invalid)`);
    return;
  }
  
  const [, username, year] = match;
  const filePath = join('data', fileName);
  
  if (!existsSync(filePath)) {
    console.log(`❌ ${fileName}: fișierul nu există`);
    return;
  }
  
  try {
    console.log(`📄 Citind ${fileName}...`);
    const content = await readFile(filePath, 'utf-8');
    const entries = JSON.parse(content);
    
    if (!Array.isArray(entries)) {
      console.log(`❌ ${fileName}: format invalid (nu este array)`);
      return;
    }
    
    console.log(`📤 Migrând ${entries.length} înregistrări pentru ${username} ${year}...`);
    
    const response = await fetch(`${VERCEL_URL}/api/migrate/registru`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, year, entries })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ ${fileName}: ${result.message}`);
      console.log(`   Key: ${result.key}, Count: ${result.count}`);
    } else {
      console.log(`❌ ${fileName}: ${result.error || 'Eroare necunoscută'}`);
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
    }
  } catch (error) {
    console.error(`❌ ${fileName}:`, error.message);
  }
}

async function main() {
  console.log('🚀 Încep migrarea registrelor în Redis...\n');
  console.log(`📍 Target: ${VERCEL_URL}\n`);
  
  const dataDir = 'data';
  
  if (!existsSync(dataDir)) {
    console.error('❌ Directorul data/ nu există!');
    process.exit(1);
  }
  
  try {
    const files = await readdir(dataDir);
    const registruFiles = files.filter(f => 
      f.includes('_registru_') && f.endsWith('.json')
    );
    
    if (registruFiles.length === 0) {
      console.log('ℹ️  Nu există fișiere de registru de migrat');
      return;
    }
    
    console.log(`📋 Găsite ${registruFiles.length} fișiere de registru:\n`);
    
    for (const file of registruFiles) {
      await migrateFile(file);
      console.log(''); // Linie goală între fișiere
      
      // Delay între request-uri pentru a evita rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('✨ Migrare completă!');
  } catch (error) {
    console.error('❌ Eroare:', error.message);
    process.exit(1);
  }
}

main();
