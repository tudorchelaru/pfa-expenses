import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';
import { readJSONFile, writeJSONFile } from '../../../lib/storage';

const USERS_KEY = 'users';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Parola este obligatorie' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Citește utilizatorii
    const users = await readJSONFile(USERS_KEY);
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Nu există utilizatori în storage' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generează hash-ul pentru noua parolă
    const hashedPassword = await bcrypt.hash(password, 10);

    // Actualizează parola pentru fiecare utilizator
    const updatedUsers = users.map(user => ({
      ...user,
      password: hashedPassword,
      updated_at: new Date().toISOString()
    }));

    // Salvează utilizatorii actualizați
    await writeJSONFile(USERS_KEY, updatedUsers);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Parolele au fost actualizate pentru ${updatedUsers.length} utilizatori`,
        usersCount: updatedUsers.length,
        users: updatedUsers.map(u => ({ username: u.username, updated_at: u.updated_at }))
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Eroare la actualizarea parolelor:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Eroare necunoscută' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
