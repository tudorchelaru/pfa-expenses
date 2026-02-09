# Configurare Vercel KV pentru Stocare Persistentă

## Problema

Pe Vercel, filesystem-ul este **read-only** în funcțiile serverless. `/tmp` este temporar și datele se pierd la fiecare deploy sau când funcția se închide.

## Soluția: Vercel KV

Vercel KV este un serviciu Redis oferit de Vercel care persistă datele între deploiuri.

## Pași de configurare

### 1. Creează KV Store prin Marketplace

Din pagina Storage pe care o vezi:

**Opțiunea 1: Upstash Redis (Recomandat)**
1. În secțiunea **Marketplace Database Providers**, găsește **Upstash**
2. Click pe **Create** sau săgeata lângă Upstash
3. Selectează **Redis** (nu Vector/Queue/Search)
4. Alege un nume pentru store (ex: `pfa-expenses-kv`)
5. Selectează planul **Free** (suficient pentru început)
6. Click **Create** sau **Add to Project**

**Opțiunea 2: Redis (direct)**
1. În secțiunea **Marketplace Database Providers**, găsește **Redis**
2. Click pe **Create**
3. Urmează pașii de configurare

### 2. Conectează KV la proiect

După crearea store-ului:
1. Vercel va seta automat variabilele de mediu necesare
2. Mergi la **Settings** → **Environment Variables** pentru a verifica
3. Variabilele ar trebui să fie:
   - `KV_URL` sau `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN` (opțional)

**Notă**: Dacă folosești Upstash, variabilele pot fi:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 3. Verifică instalarea

După deploy, aplicația va detecta automat Vercel KV și va folosi stocare persistentă în loc de `/tmp`.

## Cum funcționează

Codul detectează automat dacă Vercel KV este disponibil:

- **Pe Vercel cu KV configurat**: Folosește Vercel KV (Redis) - date persistente ✅
- **Pe Vercel fără KV**: Folosește `/tmp` - date temporare ⚠️
- **În development local**: Folosește `./data/` - fișiere JSON locale ✅

## Verificare

După configurarea KV și deploy:

1. Adaugă o înregistrare în aplicație
2. Fă un redeploy
3. Verifică că înregistrarea încă există ✅

## Costuri

Vercel KV are un plan gratuit generos:
- **Free tier**: 256 MB storage, 30,000 requests/zi
- **Pro**: $0.20/GB storage, $0.20/milion requests

Pentru o aplicație mică, planul gratuit este suficient.

## Migrare date existente

Dacă ai date în `data/` local, poți migra manual:

1. Exportă datele din `data/users.json` și `data/sessions.json`
2. După configurarea KV, datele vor fi migrate automat la primul acces
3. Pentru registru entries, vor fi migrate automat când utilizatorii le accesează

## Troubleshooting

### KV nu este detectat

Verifică că variabilele de mediu sunt setate:
```bash
vercel env pull .env.local
```

Verifică că `KV_URL` sau `KV_REST_API_URL` este setat.

### Erori la deploy

Asigură-te că `@vercel/kv` este instalat:
```bash
npm install @vercel/kv
```

## Note importante

- **Sesiunile** sunt stocate în KV cu key `sessions`
- **Utilizatorii** sunt stocați în KV cu key `users`
- **Registru entries** vor fi migrate să folosească KV în versiunea următoare
