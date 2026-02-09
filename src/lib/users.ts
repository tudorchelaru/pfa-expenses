import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  username: string;
  password: string; // hash-uit
  created_at?: string;
  updated_at?: string;
}

// Fișierul de utilizatori - NU este accesibil public, doar pe server
// Este exclus din git (.gitignore) pentru securitate
const USERS_FILE = join(import.meta.env.WRITEPATH || './data', 'users.json');

// Inițializează fișierul de utilizatori dacă nu există
async function ensureUsersFile() {
  const dir = import.meta.env.WRITEPATH || './data';
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  
  if (!existsSync(USERS_FILE)) {
    // Creează un utilizator default (tudor) pentru prima dată
    const defaultUser: User = {
      id: 1,
      username: 'tudor',
      password: await bcrypt.hash('demo123', 10), // Parolă default: demo123
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await writeFile(USERS_FILE, JSON.stringify([defaultUser], null, 2), 'utf-8');
  }
}

// Obține toți utilizatorii
export async function getUsers(): Promise<User[]> {
  await ensureUsersFile();
  
  if (!existsSync(USERS_FILE)) {
    return [];
  }
  
  const content = await readFile(USERS_FILE, 'utf-8');
  return JSON.parse(content);
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
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  
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
