import { defineMiddleware } from 'astro:middleware';
import { findSession, updateSessionActivity } from './lib/sessions';

export const onRequest = defineMiddleware(async (context, next) => {
  // Verifică dacă utilizatorul este autentificat
  const sessionId = context.cookies.get('session')?.value;
  
  if (sessionId) {
    try {
      const session = await findSession(sessionId);
      if (session) {
        // Actualizează ultima activitate pentru sesiune
        // Doar dacă sesiunea există și este validă
        try {
          await updateSessionActivity(sessionId);
        } catch (updateError) {
          console.error('Eroare la actualizare activitate:', updateError);
          // Continuă chiar dacă actualizarea eșuează
        }
        
        context.locals.user = {
          id: session.userId,
          username: session.username
        };
      } else {
        // Sesiunea nu există sau a expirat - șterge cookie-ul
        context.cookies.delete('session', { path: '/' });
      }
    } catch (error) {
      console.error('Eroare la verificare sesiune:', error);
      // Șterge cookie-ul dacă există o eroare
      context.cookies.delete('session', { path: '/' });
    }
  }
  
  // Protejează rutele care necesită autentificare (exclude API routes)
  const protectedRoutes = ['/dashboard', '/registru', '/reports', '/editare-registru', '/registre', '/genereaza-registre', '/user-nou'];
  const isProtectedRoute = protectedRoutes.some(route => context.url.pathname.startsWith(route));
  const isApiRoute = context.url.pathname.startsWith('/api/');
  
  if (isProtectedRoute && !isApiRoute && !context.locals.user) {
    return context.redirect('/login');
  }
  
  return next();
});
