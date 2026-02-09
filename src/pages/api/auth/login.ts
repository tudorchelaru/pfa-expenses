import type { APIRoute } from 'astro';
import { authenticateUser } from '../../../lib/users';
import { createSession } from '../../../lib/sessions';

export const POST: APIRoute = async ({ request, cookies }) => {
  let username: string | undefined;
  let password: string | undefined;

  try {
    const contentType = request.headers.get('content-type') || '';
    
    // Verifică dacă este JSON
    if (contentType.includes('application/json')) {
      const body = await request.text();
      if (body) {
        const json = JSON.parse(body);
        username = json.username;
        password = json.password;
      }
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      // Citește ca FormData
      const formData = await request.formData();
      username = formData.get('username')?.toString();
      password = formData.get('password')?.toString();
    } else {
      // Fallback: încearcă FormData oricum (browser-ul poate să nu seteze Content-Type corect pentru FormData)
      try {
        const formData = await request.formData();
        username = formData.get('username')?.toString();
        password = formData.get('password')?.toString();
      } catch (formError) {
        // Dacă FormData eșuează, încearcă JSON
        try {
          const body = await request.text();
          if (body) {
            const json = JSON.parse(body);
            username = json.username;
            password = json.password;
          }
        } catch (jsonError) {
          throw new Error('Nu s-a putut parsa request-ul');
        }
      }
    }
  } catch (error: any) {
    console.error('Eroare la parsarea datelor:', error);
    return new Response(JSON.stringify({ 
      error: 'Format invalid de date',
      details: error?.message 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!username || !password) {
    return new Response(JSON.stringify({ error: 'Username și parola sunt obligatorii' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Verifică utilizatorul și parola
    const user = await authenticateUser(username, password);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Username sau parolă incorectă' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Creează sesiune
    const sessionId = await createSession(user.id, user.username);
    
    // Session cookie - expiră când se închide browserul (nu setăm maxAge)
    cookies.set('session', sessionId, {
      path: '/',
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax'
      // Nu setăm maxAge pentru ca cookie-ul să fie session cookie (expiră la închiderea browserului)
    });
    
    // Returnează success pentru ca frontend-ul să facă redirect
    return new Response(JSON.stringify({ success: true, message: 'Autentificare reușită' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Eroare la autentificare:', error);
    return new Response(JSON.stringify({ error: 'Eroare la autentificare' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
