import { readJSONFile, writeJSONFile, fileExists } from './storage';

export interface Session {
  sessionId: string;
  userId: number;
  username: string;
  createdAt: string;
  expiresAt: string;
  lastActivity: string; // Timestamp pentru ultima activitate
}

// Storage key pentru sesiuni
const SESSIONS_KEY = 'sessions';

// Inițializează sesiunile dacă nu există
async function ensureSessionsFile() {
  const exists = await fileExists(SESSIONS_KEY);
  
  if (!exists) {
    await writeJSONFile(SESSIONS_KEY, []);
  }
}

// Obține toate sesiunile
async function getSessions(): Promise<Session[]> {
  await ensureSessionsFile();
  
  const sessions = await readJSONFile(SESSIONS_KEY);
  if (!sessions || !Array.isArray(sessions)) {
    return [];
  }
  
  const now = new Date();
  const inactivityTimeout = 10 * 60 * 1000; // 10 minute în milisecunde
  
  // Elimină sesiunile expirate sau inactive
  const activeSessions = sessions.filter((s: Session) => {
    // Verifică dacă sesiunea a expirat (maxim 24 ore)
    if (new Date(s.expiresAt) < now) {
      return false;
    }
    
    // Verifică dacă utilizatorul a fost inactiv mai mult de 10 minute
    const lastActivity = new Date(s.lastActivity || s.createdAt); // Fallback la createdAt pentru sesiuni vechi
    if (now.getTime() - lastActivity.getTime() > inactivityTimeout) {
      return false;
    }
    
    return true;
  });
  
  if (activeSessions.length !== sessions.length) {
    await writeJSONFile(SESSIONS_KEY, activeSessions);
  }
  
  return activeSessions;
}

// Creează o sesiune nouă
export async function createSession(userId: number, username: string): Promise<string> {
  const sessions = await getSessions();
  const sessionId = crypto.randomUUID();
  
  const now = new Date();
  // Sesiunea expiră după 10 minute de inactivitate sau 24 de ore maxim
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 ore maxim
  
  const session: Session = {
    sessionId,
    userId,
    username,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    lastActivity: now.toISOString()
  };
  
  sessions.push(session);
  await writeJSONFile(SESSIONS_KEY, sessions);
  
  return sessionId;
}

// Găsește o sesiune după ID
export async function findSession(sessionId: string): Promise<Session | null> {
  const sessions = await getSessions();
  const session = sessions.find(s => s.sessionId === sessionId);
  
  if (!session) {
    return null;
  }
  
  // Verifică dacă sesiunea a expirat (maxim 24 ore)
  if (new Date(session.expiresAt) < new Date()) {
    await deleteSession(sessionId);
    return null;
  }
  
  // Verifică dacă utilizatorul a fost inactiv mai mult de 10 minute
  const lastActivity = new Date(session.lastActivity);
  const now = new Date();
  const inactivityTimeout = 10 * 60 * 1000; // 10 minute în milisecunde
  
  if (now.getTime() - lastActivity.getTime() > inactivityTimeout) {
    await deleteSession(sessionId);
    return null;
  }
  
  return session;
}

// Actualizează ultima activitate pentru o sesiune
export async function updateSessionActivity(sessionId: string): Promise<void> {
  try {
    const sessions = await getSessions();
    const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
    
  if (sessionIndex !== -1) {
    sessions[sessionIndex].lastActivity = new Date().toISOString();
    await writeJSONFile(SESSIONS_KEY, sessions);
  }
} catch (error) {
    console.error('Eroare la actualizare activitate sesiune:', error);
    throw error;
  }
}

// Șterge o sesiune
export async function deleteSession(sessionId: string): Promise<void> {
  const sessions = await getSessions();
  const filtered = sessions.filter(s => s.sessionId !== sessionId);
  await writeJSONFile(SESSIONS_KEY, filtered);
}
