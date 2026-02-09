# Cum să migrezi registrele în Redis pe Vercel

## Problema

Pe Vercel, directorul `data/` nu există în build-ul final, deci nu poți migra automat din fișiere.

## Soluție: Upload manual prin POST

### Opțiunea 1: Folosind cURL

```bash
curl -X POST https://pfa-expenses.vercel.app/api/migrate/registru \
  -H "Content-Type: application/json" \
  -d '{
    "username": "tudor",
    "year": "2026",
    "entries": [
      {
        "data": "2026-02-09",
        "tip": "plata",
        "metoda": "banca",
        "suma": 86,
        "valuta": "RON",
        "document": "INVOICE YH5RFDWQ-0003 - CURSOR PRO",
        "deductibilitate": 100,
        "tip_cheltuiala": "diverse"
      },
      {
        "data": "2026-02-02",
        "tip": "plata",
        "metoda": "banca",
        "suma": 399,
        "valuta": "RON",
        "document": "factura do 831 - DOSARIO ONLINE S.R.L.",
        "deductibilitate": 100,
        "tip_cheltuiala": "diverse"
      }
    ]
  }'
```

### Opțiunea 2: Folosind JavaScript/Fetch

```javascript
const registruData = [
  {
    "data": "2026-02-09",
    "tip": "plata",
    "metoda": "banca",
    "suma": 86,
    "valuta": "RON",
    "document": "INVOICE YH5RFDWQ-0003 - CURSOR PRO",
    "deductibilitate": 100,
    "tip_cheltuiala": "diverse"
  },
  // ... alte înregistrări
];

const response = await fetch('https://pfa-expenses.vercel.app/api/migrate/registru', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'tudor',
    year: '2026',
    entries: registruData
  })
});

const result = await response.json();
console.log(result);
```

### Opțiunea 3: Script Node.js local

Creează un script `scripts/migrate-to-redis.js`:

```javascript
import { readFile } from 'fs/promises';
import { readdir } from 'fs/promises';
import { join } from 'path';

const VERCEL_URL = 'https://pfa-expenses.vercel.app';

async function migrateFile(fileName) {
  const match = fileName.match(/^(.+)_registru_(\d{4})\.json$/);
  if (!match) return;
  
  const [, username, year] = match;
  const filePath = join('data', fileName);
  
  const content = await readFile(filePath, 'utf-8');
  const entries = JSON.parse(content);
  
  const response = await fetch(`${VERCEL_URL}/api/migrate/registru`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, year, entries })
  });
  
  const result = await response.json();
  console.log(`${fileName}:`, result);
}

// Migrează toate fișierele
const files = await readdir('data');
const registruFiles = files.filter(f => f.includes('_registru_') && f.endsWith('.json'));

for (const file of registruFiles) {
  await migrateFile(file);
  await new Promise(resolve => setTimeout(resolve, 500)); // Delay între request-uri
}
```

## Formatul datelor

Fiecare entry trebuie să aibă:
- `data`: string (format "YYYY-MM-DD")
- `tip`: "plata" sau "incasare"
- `metoda`: "numerar" sau "banca"
- `suma`: number
- `valuta`: string (ex: "RON")
- `document`: string
- `deductibilitate`: number (ex: 100)
- `tip_cheltuiala`: string | null (opțional, doar pentru "plata")

## Verificare

După migrare, verifică:
```
https://pfa-expenses.vercel.app/api/debug/storage
```

Sau accesează aplicația și verifică că registrele apar corect.
