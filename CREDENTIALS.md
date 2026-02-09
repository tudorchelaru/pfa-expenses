# Credențiale de acces

## Utilizator default

La prima rulare a aplicației, se creează automat un utilizator default:

- **Username:** `tudor`
- **Parolă:** `demo123`

⚠️ **IMPORTANT:** Schimbă parola imediat după prima autentificare în producție!

## Adăugare utilizatori noi

Utilizatorii noi pot fi adăugați doar de către utilizatorul `tudor` (admin) prin pagina `/user-nou`.

## Stocare

Utilizatorii sunt stocați în `data/users.json` (dezvoltare) sau în baza de date (producție).

Parolele sunt hash-uite folosind bcrypt.
