import bcrypt from 'bcryptjs';
import { readJSONFile, writeJSONFile, fileExists } from './storage';

export interface User {
  id: number;
  username: string;
  password: string; // hash-uit
  created_at?: string;
  updated_at?: string;
}

// Storage key pentru utilizatori
const USERS_KEY = 'users';

// Inițializează utilizatorii dacă nu există
async function ensureUsersFile() {
  const exists = await fileExists(USERS_KEY);
  
  if (!exists) {
    // Încearcă să migreze din data/users.json dacă există (pentru development)
    try {
      const { readFile } = await import('fs/promises');
      const { existsSync } = await import('fs');
      const { join } = await import('path');
      
      const localUsersPath = join(process.cwd(), 'data', 'users.json');
      if (existsSync(localUsersPath)) {
        const content = await readFile(localUsersPath, 'utf-8');
        const users = JSON.parse(content);
        if (Array.isArray(users) && users.length > 0) {
          console.log(`Migrare automată: ${users.length} utilizatori din data/users.json`);
          await writeJSONFile(USERS_KEY, users);
          return;
        }
      }
    } catch (error) {
      console.warn('Nu s-au putut migra utilizatori din data/users.json:', error);
    }
    
    // Creează un utilizator default (tudor) pentru prima dată
    const defaultUser: User = {
      id: 1,
      username: 'tudor',
      password: await bcrypt.hash('demo123', 10), // Parolă default: demo123
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('Creare utilizator default: tudor');
    await writeJSONFile(USERS_KEY, [defaultUser]);
  }
}

// Obține toți utilizatorii
export async function getUsers(): Promise<User[]> {
  await ensureUsersFile();
  
  const users = await readJSONFile(USERS_KEY);
  return users || [];
}

// Găsește un utilizator după username
export async function findUserByUsername(username: string): Promise<User | null> {
  const users = await getUsers();
  return users.find(u => u.username === username) || null;
}

// Găsește un utilizator după ID
export async function findUserById(id: number): Promise<User | null> {
  const users = await getUsers();
  return users.find(u => u.id === id) || null;
}

// Verifică parola
export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return await bcrypt.compare(password, user.password);
}

// Creează un utilizator nou
export async function createUser(username: string, password: string): Promise<User> {
  const users = await getUsers();
  
  // Verifică dacă utilizatorul există deja
  if (users.find(u => u.username === username)) {
    throw new Error('Utilizatorul există deja');
  }
  
  const newUser: User = {
    id: Math.max(...users.map(u => u.id), 0) + 1,
    username,
    password: await bcrypt.hash(password, 10),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  users.push(newUser);
  await writeJSONFile(USERS_KEY, users);
  
  return newUser;
}

// Autentifică un utilizator
export async function authenticateUser(username: string, password: string): Promise<User | null> {
  const user = await findUserByUsername(username);
  
  if (!user) {
    return null;
  }
  
  const isValid = await verifyPassword(user, password);
  return isValid ? user : null;
}
