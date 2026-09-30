#!/usr/bin/env bash
# Applica le migrazioni Prisma al database di PRODUZIONE.
# Legge DIRECT_URL da .env.production (Session pooler Supabase, porta 5432 -
# vedi docs/deploy-produzione.md), aggiunge sslmode=require se manca, mostra
# lo stato delle migrazioni e chiede conferma prima di applicarle.
# DIRECT_URL impostata qui ha la precedenza su quella di .env (dotenv in
# prisma.config.ts non sovrascrive variabili gia' presenti).
# Uso: ./scripts/migrate-produzione.sh   (dalla root o da qualunque cartella)
set -euo pipefail

cd "$(dirname "$0")/.."

FILE_ENV=".env.production"
if [ ! -f "$FILE_ENV" ]; then
  echo "ERRORE: $FILE_ENV non trovato nella root del progetto." >&2
  exit 1
fi

# Ultima riga DIRECT_URL=..., senza virgolette esterne ne' \r (file Windows).
DIRECT_URL="$(grep -E '^DIRECT_URL=' "$FILE_ENV" | tail -n 1 | cut -d= -f2- | tr -d '\r')"
DIRECT_URL="${DIRECT_URL#\"}"; DIRECT_URL="${DIRECT_URL%\"}"
DIRECT_URL="${DIRECT_URL#\'}"; DIRECT_URL="${DIRECT_URL%\'}"

if [ -z "$DIRECT_URL" ]; then
  echo "ERRORE: DIRECT_URL mancante o vuota in $FILE_ENV." >&2
  exit 1
fi

case "$DIRECT_URL" in
  *sslmode=*) ;;
  *\?*) DIRECT_URL="${DIRECT_URL}&sslmode=require" ;;
  *) DIRECT_URL="${DIRECT_URL}?sslmode=require" ;;
esac

export DIRECT_URL

# Mostra solo l'host, mai la password.
HOST="$(printf '%s' "$DIRECT_URL" | sed -E 's#^[^@]*@([^/?]*).*#\1#')"
echo "Database di PRODUZIONE: $HOST"
echo

echo "=== Stato delle migrazioni ==="
# migrate status esce con codice != 0 quando ci sono migrazioni da applicare:
# non e' un errore per questo script.
npx prisma migrate status || true
echo

read -r -p "Applicare le migrazioni in PRODUZIONE? [s/N] " RISPOSTA
case "$RISPOSTA" in
  s|S|si|SI|Si) ;;
  *) echo "Annullato, nessuna modifica."; exit 0 ;;
esac

npx prisma migrate deploy
echo
echo "Migrazioni applicate."
