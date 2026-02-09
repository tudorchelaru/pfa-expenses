/**
 * Storage abstraction layer
 * Folosește Vercel KV în producție și fișiere JSON în development
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

// Verifică dacă rulează pe Vercel și dacă KV este disponibil
function isVercelKVAvailable(): boolean {
  try {
    // Vercel setează automat variabila de mediu VERCEL
    if (typeof process !== 'undefined' && process.env.VERCEL) {
      // Verifică dacă există variabile KV (Vercel KV sau Upstash Redis)
      // Verifică atât URL-urile cât și token-urile
      const hasVercelKV = !!(
        (process.env.KV_URL || process.env.KV_REST_API_URL) &&
        (process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_READ_ONLY_TOKEN)
      );
      
      const hasUpstash = !!(
        (process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL) &&
        (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN)
      );
      
      const result = hasVercelKV || hasUpstash;
      
      // Log pentru debugging
      if (!result) {
        console.warn('Redis/KV nu este disponibil. Variabile de mediu:', {
          VERCEL: !!process.env.VERCEL,
          KV_URL: !!process.env.KV_URL,
          KV_REST_API_URL: !!process.env.KV_REST_API_URL,
          KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
          UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
          UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
          REDIS_URL: !!process.env.REDIS_URL,
        });
      }
      
      return result;
    }
    return false;
  } catch {
    return false;
  }
}

// Obține path-ul pentru stocare locală
function getLocalPath(): string {
  if (typeof process !== 'undefined' && process.env.VERCEL) {
    return '/tmp'; // Pe Vercel fără KV, folosim /tmp (temporar)
  }
  return process.env.WRITEPATH || './data';
}

/**
 * Storage interface pentru abstractizare
 */
export interface Storage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

/**
 * Implementare cu Vercel KV (Redis)
 */
class KVStorage implements Storage {
  private kv: any;

  constructor(kvInstance: any) {
    this.kv = kvInstance;
  }

  static async create(): Promise<KVStorage> {
    try {
      // Verifică ce variabile de mediu sunt disponibile
      const hasVercelKV = !!(process.env.KV_URL || process.env.KV_REST_API_URL);
      const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL);
      
      // Încearcă mai întâi @vercel/kv (Vercel KV nativ)
      if (hasVercelKV) {
        try {
          const { kv } = await import('@vercel/kv');
          return new KVStorage(kv);
        } catch (error) {
          console.warn('Eroare la import @vercel/kv, încerc Upstash:', error);
        }
      }
      
      // Dacă nu există Vercel KV, încearcă Upstash Redis
      if (hasUpstash) {
        try {
          const { Redis } = await import('@upstash/redis');
          const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL || process.env.KV_REST_API_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.REDIS_TOKEN || process.env.KV_REST_API_TOKEN,
          });
          return new KVStorage(redis);
        } catch (error) {
          console.warn('Eroare la import @upstash/redis:', error);
        }
      }
      
      throw new Error('Niciun KV/Redis nu este configurat');
    } catch (error) {
      console.error('KV/Redis nu este disponibil:', error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      const value = await this.kv.get(key);
      return value ? JSON.stringify(value) : null;
    } catch (error) {
      console.error(`Eroare la citire KV key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      const parsed = JSON.parse(value);
      await this.kv.set(key, parsed);
    } catch (error) {
      console.error(`Eroare la scriere KV key ${key}:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.kv.del(key);
    } catch (error) {
      console.error(`Eroare la ștergere KV key ${key}:`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const value = await this.kv.get(key);
      return value !== null;
    } catch {
      return false;
    }
  }
}

/**
 * Implementare cu fișiere locale
 */
class FileStorage implements Storage {
  private basePath: string;

  constructor() {
    this.basePath = getLocalPath();
  }

  private getFilePath(key: string): string {
    return join(this.basePath, `${key}.json`);
  }

  async get(key: string): Promise<string | null> {
    const filePath = this.getFilePath(key);
    
    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error(`Eroare la citire fișier ${filePath}:`, error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    const filePath = this.getFilePath(key);
    const dir = this.basePath;

    try {
      // Asigură-te că directorul există
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      await writeFile(filePath, value, 'utf-8');
    } catch (error) {
      console.error(`Eroare la scriere fișier ${filePath}:`, error);
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    
    if (existsSync(filePath)) {
      try {
        const { unlink } = await import('fs/promises');
        await unlink(filePath);
      } catch (error) {
        console.error(`Eroare la ștergere fișier ${filePath}:`, error);
        throw error;
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    return existsSync(this.getFilePath(key));
  }
}

// Creează instanța de storage corectă
let storageInstance: Storage | null = null;
let storagePromise: Promise<Storage> | null = null;

export async function getStorage(): Promise<Storage> {
  if (storageInstance) {
    return storageInstance;
  }

  if (storagePromise) {
    return storagePromise;
  }

  storagePromise = (async () => {
    if (isVercelKVAvailable()) {
      try {
        storageInstance = await KVStorage.create();
        console.log('Folosind Vercel KV pentru stocare persistentă');
        return storageInstance;
      } catch (error) {
        console.warn('Vercel KV nu este disponibil, folosind stocare locală:', error);
      }
    }

    storageInstance = new FileStorage();
    console.log('Folosind stocare locală (fișiere JSON)');
    return storageInstance;
  })();

  return storagePromise;
}

// Helper functions pentru compatibilitate cu codul existent
export async function readJSONFile(key: string): Promise<any> {
  const storage = await getStorage();
  const content = await storage.get(key);
  
  if (!content) {
    return null;
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    console.error(`Eroare la parsare JSON pentru ${key}:`, error);
    return null;
  }
}

export async function writeJSONFile(key: string, data: any): Promise<void> {
  const storage = await getStorage();
  const content = JSON.stringify(data, null, 2);
  await storage.set(key, content);
}

export async function fileExists(key: string): Promise<boolean> {
  const storage = await getStorage();
  return storage.exists(key);
}
