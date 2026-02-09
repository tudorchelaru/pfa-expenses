# PFA Expenses

Aplicație modernă pentru gestionarea cheltuielilor PFA, migrată din PHP/CodeIgniter în Astro + Vercel.

## Funcționalități

- ✅ **Autentificare** - Login/logout cu sesiuni
- ✅ **Registru încasări/plăți** - Adăugare, editare, ștergere înregistrări
- ✅ **Calcul deductibilitate** - 50% + max 1500 RON/lună pentru leasing auto
- ✅ **Generare PDF** - Registre PDF pentru fiecare an (în dezvoltare)
- 🔄 **Rapoarte** - Grafice și statistici (în dezvoltare)
- 🔄 **Upload imagini** - Pentru plăți cu compresie automată (în dezvoltare)
- 🔄 **Gestionare utilizatori** - Admin only (în dezvoltare)

## Tehnologii

- [Astro](https://astro.build) - Framework modern pentru site-uri statice și SSR
- [Vercel](https://vercel.com) - Platformă de deployment
- [Tailwind CSS](https://tailwindcss.com) - Framework CSS
- [Bootstrap 5](https://getbootstrap.com) - Componente UI
- TypeScript - Type safety

## Structura Proiectului

```
src/
├── layouts/
│   └── Layout.astro          # Layout principal
├── pages/
│   ├── api/                   # API routes
│   │   ├── auth/             # Autentificare
│   │   └── registru/         # CRUD registru
│   ├── dashboard.astro        # Dashboard principal
│   ├── login.astro            # Pagină login
│   ├── registru.astro         # Adăugare înregistrare
│   └── editare-registru.astro # Editare registru
├── middleware.ts              # Middleware pentru autentificare
└── env.d.ts                   # Type definitions
```

## Instalare

```bash
npm install
```

## Dezvoltare

```bash
npm run dev
```

Aplicația va rula pe `http://localhost:4321`

## Build

```bash
npm run build
```

## Deployment

Proiectul este configurat pentru deployment pe Vercel. Conectează repository-ul GitHub la Vercel pentru deployment automat.

## Configurare

### Variabile de mediu

Creează un fișier `.env` pentru variabile de mediu:

```env
WRITEPATH=./data
DATABASE_URL=postgresql://... # Pentru Vercel Postgres (opțional)
```

### Stocare date

În mod implicit, datele sunt stocate în fișiere JSON în directorul `data/`. Pentru producție, recomandăm:
- Vercel Postgres pentru utilizatori și plăți
- Vercel KV sau S3 pentru fișiere JSON și PDF-uri

## Migrare din PHP

Această aplicație este o migrare completă din aplicația PHP/CodeIgniter originală. Toate funcționalitățile principale au fost transpuse în Astro cu îmbunătățiri moderne.

## Status

- ✅ Structură de bază
- ✅ Autentificare
- ✅ CRUD registru
- 🔄 Generare PDF
- 🔄 Rapoarte cu grafice
- 🔄 Upload imagini
- 🔄 Gestionare utilizatori

## Contribuții

Proiect în dezvoltare activă. Vezi TODO-urile pentru funcționalități în curs de implementare.
