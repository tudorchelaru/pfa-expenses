# Conectare Redis la Proiectul Vercel

## Problema

Variabilele de mediu pentru Redis nu sunt setate, deși baza de date există. Trebuie să conectăm manual Redis la proiect.

## Pași pentru conectare

### Opțiunea 1: Conectare prin Vercel Dashboard (Recomandat)

1. **Mergi la Vercel Dashboard**
   - [https://vercel.com/dashboard](https://vercel.com/dashboard)
   - Selectează proiectul `pfa-expenses`

2. **Mergi la Storage**
   - Click pe tab-ul **Storage** în proiect
   - Ar trebui să vezi baza de date `pfa-expenses-kv` (Upstash Redis)

3. **Conectează la proiect**
   - Click pe baza de date `pfa-expenses-kv`
   - Caută butonul **"Connect to Project"** sau **"Link Project"**
   - Selectează proiectul `pfa-expenses`
   - Click **Connect**

4. **Verifică variabilele de mediu**
   - Mergi la **Settings** → **Environment Variables**
   - Ar trebui să vezi acum:
     - `UPSTASH_REDIS_REST_URL`
     - `UPSTASH_REDIS_REST_TOKEN`

### Opțiunea 2: Setare manuală variabile de mediu

Dacă Opțiunea 1 nu funcționează:

1. **Obține credențialele Redis**
   - Mergi la [Upstash Console](https://console.upstash.com/)
   - Selectează baza de date `pfa-expenses-kv`
   - Mergi la **Details** sau **REST API**
   - Copiază:
     - **UPSTASH_REDIS_REST_URL**
     - **UPSTASH_REDIS_REST_TOKEN**

2. **Adaugă în Vercel**
   - Mergi la Vercel Dashboard → proiectul `pfa-expenses`
   - **Settings** → **Environment Variables**
   - Click **Add New**
   - Adaugă:
     - Key: `UPSTASH_REDIS_REST_URL`
     - Value: (URL-ul copiat)
     - Environment: Production, Preview, Development (bifează toate)
   - Click **Save**
   - Repetă pentru `UPSTASH_REDIS_REST_TOKEN`

3. **Redeploy**
   - După adăugarea variabilelor, fă un redeploy
   - Vercel va folosi automat noile variabile

## Verificare

După conectare și redeploy:

1. Accesează: `https://pfa-expenses.vercel.app/api/debug/storage`
2. Ar trebui să vezi:
   ```json
   {
     "storageType": "KVStorage",
     "hasUsers": false,
     "usersCount": 0,
     "envVars": {
       "UPSTASH_REDIS_REST_URL": true,
       "UPSTASH_REDIS_REST_TOKEN": true
     }
   }
   ```

## Dacă tot nu funcționează

Verifică că:
- Baza de date Redis este în același account Vercel
- Variabilele sunt setate pentru toate environment-urile (Production, Preview, Development)
- Ai făcut redeploy după adăugarea variabilelor
