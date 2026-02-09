import type { APIRoute } from 'astro';
import { getStorage } from '../../../lib/storage';
import { readJSONFile } from '../../../lib/storage';

// Endpoint pentru debugging - verifică ce storage este folosit
export const GET: APIRoute = async () => {
  try {
    const storage = await getStorage();
    const storageType = storage.constructor.name;
    
    // Verifică dacă există users în storage
    const users = await readJSONFile('users');
    
    // Verifică variabilele de mediu
    const envVars = {
      VERCEL: !!process.env.VERCEL,
      KV_URL: !!process.env.KV_URL,
      KV_REST_API_URL: !!process.env.KV_REST_API_URL,
      KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
      UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      REDIS_URL: !!process.env.REDIS_URL,
    };
    
    return new Response(JSON.stringify({
      storageType,
      hasUsers: !!users,
      usersCount: users?.length || 0,
      envVars,
      users: users || []
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
