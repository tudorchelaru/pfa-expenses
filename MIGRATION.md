# Migrare date din OLD_PHP

## Fișiere JSON existente

Aplicația poate citi și procesa automat fișierele JSON din `OLD_PHP/writable/`:

- `andreea_registru.json`
- `razvan_registru.json`
- `roxana_registru.json`
- `tudor_registru.json`

## Cum funcționează

1. **Citire**: Când un utilizator se autentifică, aplicația caută fișierul de registru:
   - Mai întâi în `data/{username}_registru.json` (folderul nou)
   - Dacă nu există, caută în `OLD_PHP/writable/{username}_registru.json` (folderul vechi)

2. **Scriere**: La prima scriere/modificare:
   - Dacă fișierul vine din `OLD_PHP/writable/`, este automat migrat în `data/`
   - Toate modificările ulterioare se fac în `data/`

## Structura datelor

Fișierele JSON conțin array-uri de obiecte cu următoarea structură:

```json
{
  "data": "2025-01-01",
  "tip": "plata" | "incasare",
  "metoda": "numerar" | "banca",
  "suma": 100.0,
  "valuta": "RON",
  "document": "Factura X",
  "deductibilitate": 50,
  "tip_cheltuiala": "diverse" | "cincizeci_la_suta" | "rata_leasing" | "combustibil" | null
}
```

## Utilizatori disponibili

Pentru a testa aplicația cu datele existente, autentifică-te cu unul dintre utilizatorii:
- `tudor` (are 4 înregistrări)
- `andreea` (are multe înregistrări)
- `razvan` (are multe înregistrări)
- `roxana` (are multe înregistrări)

## Migrare manuală (opțional)

Dacă vrei să migrezi toate fișierele dintr-o dată, poți folosi scriptul:

```bash
# Migrează toate fișierele registru
npm run migrate:registru

# Migrează doar pentru un utilizator specific
npm run migrate:registru tudor
```

## Notă

Datele din `OLD_PHP/writable/` sunt read-only. La prima modificare, fișierul este copiat în `data/` și toate modificările ulterioare se fac acolo.

**Locația finală:** `data/{username}_registru.json`
