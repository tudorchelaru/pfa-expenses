import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { readJSONFile, writeJSONFile, fileExists } from './storage';

export interface RegistruEntry {
  data: string;
  tip: 'incasare' | 'plata';
  metoda: 'numerar' | 'banca';
  suma: number;
  valuta: string;
  document: string;
  deductibilitate: number;
  tip_cheltuiala?: string | null;
}

// Pe Vercel, filesystem-ul este read-only, folosim /tmp
function getDataPath(): string {
  // Pe Vercel, filesystem-ul este read-only, folosim /tmp
  // Vercel setează automat variabila de mediu VERCEL
  if (typeof process !== 'undefined' && process.env.VERCEL) {
    return '/tmp';
  }
  if (import.meta.env.VERCEL) {
    return '/tmp';
  }
  return import.meta.env.WRITEPATH || './data';
}

/**
 * Găsește toate fișierele de registru pentru un utilizator
 * Caută pattern-ul: {username}_registru_*.json
 * Returnează primul fișier găsit sau null
 */
export async function findRegistruFiles(username: string): Promise<string[]> {
  const usernameLower = username.toLowerCase();
  const pattern = new RegExp(`^${usernameLower}_registru_.*\\.json$`);
  const files: string[] = [];
  
  // Caută în folderul nou (data/ sau /tmp pe Vercel)
  const dataDir = getDataPath();
  if (existsSync(dataDir)) {
    try {
      const dataFiles = await readdir(dataDir);
      const matchingFiles = dataFiles
        .filter(f => pattern.test(f))
        .map(f => join(dataDir, f));
      files.push(...matchingFiles);
    } catch (e) {
      // Continuă dacă există o eroare
    }
  }
  
  return files;
}

/**
 * Obține calea către fișierul de registru pentru un utilizator
 * Caută pattern-ul: {username}_registru_*.json
 * Dacă nu găsește, returnează calea către un fișier nou cu anul curent
 */
export async function getRegistruPath(username: string, year?: string): Promise<{ path: string; source: 'new' | 'old' }> {
  const usernameLower = username.toLowerCase();
  const files = await findRegistruFiles(username);
  
  // Dacă există fișiere, returnează primul
  if (files.length > 0) {
    const firstFile = files[0];
    const source = firstFile.includes('OLD_PHP') ? 'old' : 'new';
    return { path: firstFile, source };
  }
  
  // Dacă nu există, creează un fișier nou cu anul specificat sau anul curent
  const targetYear = year || new Date().getFullYear().toString();
  const newPath = join(getDataPath(), `${usernameLower}_registru_${targetYear}.json`);
  return { path: newPath, source: 'new' };
}

/**
 * Citește toate înregistrările din toate fișierele de registru pentru un utilizator
 * Combină datele din toate fișierele care se potrivesc pattern-ului {username}_registru_*.json
 * Elimină duplicatele bazate pe data, tip, suma, document
 * Verifică mai întâi în Redis, apoi în fișiere
 */
export async function readRegistru(username: string): Promise<RegistruEntry[]> {
  const usernameLower = username.toLowerCase();
  const allEntries: RegistruEntry[] = [];
  const seenEntries = new Set<string>();
  
  // Încearcă să citească din Redis (pentru fiecare an posibil)
  // Verifică ultimii 3 ani + anul curent
  const currentYear = new Date().getFullYear();
  const yearsToCheck = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
  
  for (const year of yearsToCheck) {
    const redisKey = `registru:${usernameLower}:${year}`;
    try {
      const redisData = await readJSONFile(redisKey);
      if (Array.isArray(redisData) && redisData.length > 0) {
        for (const entry of redisData) {
          const entryKey = `${entry.data}|${entry.tip}|${entry.suma}|${entry.document}|${entry.metoda}`;
          if (!seenEntries.has(entryKey)) {
            seenEntries.add(entryKey);
            allEntries.push(entry);
          }
        }
      }
    } catch (error) {
      // Continuă dacă nu există în Redis
    }
  }
  
  // Dacă nu găsește în Redis, încearcă din fișiere (fallback)
  if (allEntries.length === 0) {
    const files = await findRegistruFiles(username);
    
    if (files.length === 0) {
      return [];
    }
    
    // Prioritizează fișierele din data/ față de OLD_PHP/writable/
    const sortedFiles = files.sort((a, b) => {
      const aIsNew = a.includes('data/') ? 1 : 0;
      const bIsNew = b.includes('data/') ? 1 : 0;
      return bIsNew - aIsNew; // data/ primele
    });
    
    // Citește toate fișierele și combină datele, eliminând duplicatele
    for (const filePath of sortedFiles) {
      try {
        if (existsSync(filePath)) {
          const content = await readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          if (Array.isArray(data)) {
            for (const entry of data) {
              // Creează o cheie unică pentru fiecare intrare
              const entryKey = `${entry.data}|${entry.tip}|${entry.suma}|${entry.document}|${entry.metoda}`;
              
              // Adaugă doar dacă nu am văzut deja această intrare
              if (!seenEntries.has(entryKey)) {
                seenEntries.add(entryKey);
                allEntries.push(entry);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Eroare la citirea fișierului ${filePath}:`, error);
      }
    }
  }
  
  return allEntries;
}

/**
 * Salvează înregistrările în registru
 * Grupează înregistrările pe ani și salvează în fișiere separate
 * NOTA: Această funcție este folosită doar pentru migrare/compatibilitate
 * Pentru operații normale, folosește addRegistruEntry, updateRegistruEntry, deleteRegistruEntry
 */
export async function writeRegistru(username: string, entries: RegistruEntry[]): Promise<void> {
  // Grupează înregistrările pe ani
  const byYear: Record<string, RegistruEntry[]> = {};
  
  for (const entry of entries) {
    const year = getYearFromDate(entry.data);
    if (!byYear[year]) {
      byYear[year] = [];
    }
    byYear[year].push(entry);
  }
  
  // Asigură-te că directorul există
  const dir = getDataPath();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  
  // Salvează fiecare an în fișierul său
  const usernameLower = username.toLowerCase();
  for (const [year, yearEntries] of Object.entries(byYear)) {
    const filePath = join(dir, `${usernameLower}_registru_${year}.json`);
    await writeFile(filePath, JSON.stringify(yearEntries, null, 2), 'utf-8');
  }
}

/**
 * Obține anul dintr-o dată
 */
function getYearFromDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Dacă data nu este validă, folosește anul curent
      return new Date().getFullYear().toString();
    }
    return date.getFullYear().toString();
  } catch {
    return new Date().getFullYear().toString();
  }
}

/**
 * Adaugă o nouă înregistrare în registru
 * Creează automat un fișier nou pentru anul datei dacă nu există
 */
export async function addRegistruEntry(username: string, entry: RegistruEntry): Promise<void> {
  const year = getYearFromDate(entry.data);
  const usernameLower = username.toLowerCase();
  const redisKey = `registru:${usernameLower}:${year}`;
  
  // Normalizează intrarea: pentru incasare, adaugă tip_cheltuiala: null dacă nu există deja
  const normalizedEntry = { ...entry };
  if (normalizedEntry.tip === 'incasare' && normalizedEntry.tip_cheltuiala === undefined) {
    normalizedEntry.tip_cheltuiala = null;
  }
  
  // Încearcă să citească din Redis
  let entries: RegistruEntry[] = [];
  try {
    const redisData = await readJSONFile(redisKey);
    if (Array.isArray(redisData)) {
      entries = redisData;
    }
  } catch (error) {
    // Dacă nu există în Redis, încearcă din fișier (fallback)
    const filePath = join(getDataPath(), `${usernameLower}_registru_${year}.json`);
    if (existsSync(filePath)) {
      try {
        const content = await readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          entries = data;
        }
      } catch (fileError) {
        console.error(`Eroare la citirea fișierului ${filePath}:`, fileError);
      }
    }
  }
  
  // Adaugă noua înregistrare
  entries.push(normalizedEntry);
  
  // Salvează în Redis (sau fallback la fișier)
  try {
    await writeJSONFile(redisKey, entries);
  } catch (error) {
    // Fallback la fișier dacă Redis nu este disponibil
    const dir = getDataPath();
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    const filePath = join(dir, `${usernameLower}_registru_${year}.json`);
    await writeFile(filePath, JSON.stringify(entries, null, 2), 'utf-8');
  }
}

/**
 * Actualizează o înregistrare existentă
 * Găsește fișierul corect bazat pe anul datei și actualizează intrarea
 */
export async function updateRegistruEntry(username: string, index: number, entry: RegistruEntry): Promise<void> {
  // Citește toate înregistrările pentru a găsi cea cu index-ul dat
  const allEntries = await readRegistru(username);
  
  if (index < 0 || index >= allEntries.length) {
    throw new Error('Index invalid');
  }
  
  // Găsește anul din înregistrarea originală
  const originalEntry = allEntries[index];
  const originalYear = getYearFromDate(originalEntry.data);
  const newYear = getYearFromDate(entry.data);
  
  const usernameLower = username.toLowerCase();
  const originalRedisKey = `registru:${usernameLower}:${originalYear}`;
  const newRedisKey = `registru:${usernameLower}:${newYear}`;
  
  // Normalizează intrarea: pentru incasare, adaugă tip_cheltuiala: null dacă nu există deja
  const normalizedEntry = { ...entry };
  if (normalizedEntry.tip === 'incasare' && normalizedEntry.tip_cheltuiala === undefined) {
    normalizedEntry.tip_cheltuiala = null;
  }
  
  // Dacă anul s-a schimbat, trebuie să mutăm înregistrarea în alt an
  if (originalYear !== newYear) {
    // Citește și șterge din anul vechi
    let originalEntries: RegistruEntry[] = [];
    try {
      const redisData = await readJSONFile(originalRedisKey);
      if (Array.isArray(redisData)) {
        originalEntries = redisData;
      }
    } catch {
      // Fallback la fișier
      const originalFilePath = join(getDataPath(), `${usernameLower}_registru_${originalYear}.json`);
      if (existsSync(originalFilePath)) {
        const content = await readFile(originalFilePath, 'utf-8');
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          originalEntries = data;
        }
      }
    }
    
    // Găsește și șterge înregistrarea veche
    const originalIndex = originalEntries.findIndex((e: RegistruEntry) => 
      e.data === originalEntry.data &&
      e.tip === originalEntry.tip &&
      e.suma === originalEntry.suma &&
      e.document === originalEntry.document
    );
    
    if (originalIndex >= 0) {
      originalEntries.splice(originalIndex, 1);
      // Salvează anul vechi
      try {
        await writeJSONFile(originalRedisKey, originalEntries);
      } catch {
        const originalFilePath = join(getDataPath(), `${usernameLower}_registru_${originalYear}.json`);
        await writeFile(originalFilePath, JSON.stringify(originalEntries, null, 2), 'utf-8');
      }
    }
    
    // Adaugă în anul nou
    let newEntries: RegistruEntry[] = [];
    try {
      const redisData = await readJSONFile(newRedisKey);
      if (Array.isArray(redisData)) {
        newEntries = redisData;
      }
    } catch {
      // Fallback la fișier
      const newFilePath = join(getDataPath(), `${usernameLower}_registru_${newYear}.json`);
      if (existsSync(newFilePath)) {
        const content = await readFile(newFilePath, 'utf-8');
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          newEntries = data;
        }
      }
    }
    
    newEntries.push(normalizedEntry);
    // Salvează anul nou
    try {
      await writeJSONFile(newRedisKey, newEntries);
    } catch {
      const newFilePath = join(getDataPath(), `${usernameLower}_registru_${newYear}.json`);
      const dir = getDataPath();
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
      await writeFile(newFilePath, JSON.stringify(newEntries, null, 2), 'utf-8');
    }
  } else {
    // Același an - actualizează în același an
    let entries: RegistruEntry[] = [];
    try {
      const redisData = await readJSONFile(originalRedisKey);
      if (Array.isArray(redisData)) {
        entries = redisData;
      }
    } catch {
      // Fallback la fișier
      const originalFilePath = join(getDataPath(), `${usernameLower}_registru_${originalYear}.json`);
      if (existsSync(originalFilePath)) {
        const content = await readFile(originalFilePath, 'utf-8');
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          entries = data;
        }
      } else {
        throw new Error('Fișierul nu există');
      }
    }
    
    // Găsește și actualizează înregistrarea
    const fileIndex = entries.findIndex((e: RegistruEntry) => 
      e.data === originalEntry.data &&
      e.tip === originalEntry.tip &&
      e.suma === originalEntry.suma &&
      e.document === originalEntry.document
    );
    
    if (fileIndex >= 0) {
      entries[fileIndex] = normalizedEntry;
      // Salvează
      try {
        await writeJSONFile(originalRedisKey, entries);
      } catch {
        const originalFilePath = join(getDataPath(), `${usernameLower}_registru_${originalYear}.json`);
        await writeFile(originalFilePath, JSON.stringify(entries, null, 2), 'utf-8');
      }
    } else {
      throw new Error('Înregistrarea nu a fost găsită');
    }
  }
}

/**
 * Șterge o înregistrare din registru
 * Găsește fișierul corect bazat pe anul datei și șterge intrarea
 */
export async function deleteRegistruEntry(username: string, index: number): Promise<void> {
  // Citește toate înregistrările pentru a găsi cea cu index-ul dat
  const allEntries = await readRegistru(username);
  
  if (index < 0 || index >= allEntries.length) {
    throw new Error('Index invalid');
  }
  
  const entryToDelete = allEntries[index];
  const year = getYearFromDate(entryToDelete.data);
  const usernameLower = username.toLowerCase();
  const redisKey = `registru:${usernameLower}:${year}`;
  
  // Citește din Redis sau fișier
  let entries: RegistruEntry[] = [];
  try {
    const redisData = await readJSONFile(redisKey);
    if (Array.isArray(redisData)) {
      entries = redisData;
    }
  } catch {
    // Fallback la fișier
    const filePath = join(getDataPath(), `${usernameLower}_registru_${year}.json`);
    if (!existsSync(filePath)) {
      throw new Error('Fișierul nu există');
    }
    const content = await readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      throw new Error('Format invalid de date');
    }
    entries = data;
  }
  
  // Găsește index-ul în entries
  const fileIndex = entries.findIndex((e: RegistruEntry) => 
    e.data === entryToDelete.data &&
    e.tip === entryToDelete.tip &&
    e.suma === entryToDelete.suma &&
    e.document === entryToDelete.document
  );
  
  if (fileIndex < 0) {
    throw new Error('Înregistrarea nu a fost găsită');
  }
  
  entries.splice(fileIndex, 1);
  
  // Salvează în Redis sau fișier
  try {
    await writeJSONFile(redisKey, entries);
  } catch {
    // Fallback la fișier
    const filePath = join(getDataPath(), `${usernameLower}_registru_${year}.json`);
    await writeFile(filePath, JSON.stringify(entries, null, 2), 'utf-8');
  }
}

/**
 * Obține o înregistrare specifică după index
 */
export async function getRegistruEntry(username: string, index: number): Promise<RegistruEntry | null> {
  const entries = await readRegistru(username);
  
  if (index < 0 || index >= entries.length) {
    return null;
  }
  
  return entries[index];
}
