#!/usr/bin/env node

/**
 * Script care copiază fișierele *_registru_*.json din data/ în public/data/
 * pentru a fi incluse în build și a putea fi migrate în Redis pe Vercel
 */

import { readdir, copyFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

async function copyRegistruFiles() {
  const dataDir = 'data';
  const publicDataDir = 'public/data';
  
  if (!existsSync(dataDir)) {
    console.log('ℹ️  Directorul data/ nu există');
    return;
  }
  
  // Creează directorul public/data dacă nu există
  if (!existsSync(publicDataDir)) {
    await mkdir(publicDataDir, { recursive: true });
    console.log(`✅ Creat director ${publicDataDir}`);
  }
  
  try {
    const files = await readdir(dataDir);
    const registruFiles = files.filter(f => 
      f.includes('_registru_') && f.endsWith('.json')
    );
    
    if (registruFiles.length === 0) {
      console.log('ℹ️  Nu există fișiere de registru de copiat');
      return;
    }
    
    console.log(`📋 Găsite ${registruFiles.length} fișiere de registru:\n`);
    
    let copied = 0;
    for (const file of registruFiles) {
      const sourcePath = join(dataDir, file);
      const destPath = join(publicDataDir, file);
      
      try {
        await copyFile(sourcePath, destPath);
        console.log(`✅ Copiat: ${file}`);
        copied++;
      } catch (error) {
        console.error(`❌ Eroare la copiere ${file}:`, error.message);
      }
    }
    
    console.log(`\n✨ Copiere completă: ${copied}/${registruFiles.length} fișiere copiate`);
    console.log(`📁 Fișierele sunt acum în ${publicDataDir} și vor fi incluse în build`);
  } catch (error) {
    console.error('❌ Eroare:', error.message);
    process.exit(1);
  }
}

copyRegistruFiles();
