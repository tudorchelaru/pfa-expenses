# Gestionare Utilizatori

## Fișier de utilizatori

Utilizatorii sunt stocați în `data/users.json` - **acest fișier NU este inclus în git** pentru securitate.

## Adăugare utilizator nou

### Metoda 1: Script Node.js (Recomandat)

```bash
npm run user:add <username> <password>
```

Exemplu:
```bash
npm run user:add andreea parola123
npm run user:add razvan parola456
```

### Metoda 2: Manual

Editează direct `data/users.json` și adaugă un utilizator nou:

```json
{
  "id": 2,
  "username": "andreea",
  "password": "$2a$10$...",  // Hash generat cu bcrypt
  "created_at": "2025-01-01T00:00:00.000Z",
  "updated_at": "2025-01-01T00:00:00.000Z"
}
```

**⚠️ IMPORTANT:** Parola trebuie să fie hash-uită cu bcrypt. Folosește scriptul pentru a genera hash-ul corect.

## Listare utilizatori

```bash
npm run user:list
```

## Actualizare parolă

```bash
npm run user:password <username> <new_password>
```

Exemplu:
```bash
npm run user:password tudor parola_noua123
npm run user:password andreea parola_securizata456
```

## Generare hash parolă

Dacă vrei să generezi manual un hash pentru parolă, poți folosi:

```javascript
import bcrypt from 'bcryptjs';
const hash = await bcrypt.hash('parola', 10);
console.log(hash);
```

## Securitate

- ✅ `data/users.json` este în `.gitignore` - nu va fi commit-at în git
- ✅ Parolele sunt hash-uite cu bcrypt (10 rounds)
- ✅ Fișierul este accesibil doar pe server (nu prin web)
- ⚠️ **Pentru producție**, recomandăm migrarea la Vercel Postgres

## Utilizatori default

La prima rulare, se creează automat:
- Username: `tudor`
- Parolă: `demo123`

**⚠️ Schimbă parola imediat în producție!**
