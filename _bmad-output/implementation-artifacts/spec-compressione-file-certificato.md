---
title: 'Compressione nel browser dei file Certificato prima dell''upload'
type: 'feature'
created: '2026-10-28'
status: 'done'
baseline_commit: '0fe526afd5196e194a6e3a5a321c405b43412834'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** i Certificati Medici caricati sono spesso PDF scansionati o foto da telefono di diversi MB, che occupano spazio nel bucket privato `certificati-medici` (richiesta utente 2026-10-28).

**Approach:** prima dell'invio, il browser ottimizza il file: PDF pesanti rasterizzati pagina per pagina in JPEG (~150 dpi) e ricostruiti come PDF, foto JPG/PNG ridimensionate e convertite in JPEG. Vale per tutti e tre i form di upload Certificato. Fail-soft: in caso di errore si carica l'originale.

## Boundaries & Constraints

**Always:** compressione solo lato client (Cloudflare Workers: niente Ghostscript, CPU limitata). PDF compresso solo se > 1MB; immagine solo se > 1MB o lato lungo > 2000px. Si usa il risultato solo se strettamente più piccolo dell'originale, altrimenti l'originale. Ogni errore (PDF protetto/corrotto, canvas non disponibile, browser vecchio) → originale, nessun messaggio d'errore all'utente. Pagine PDF: dimensione pagina originale preservata, rendering a scala 150/72 con lato lungo del canvas ≤ 2500px, JPEG qualità 0,7. Immagini: lato lungo ≤ 2000px, sfondo bianco (trasparenza PNG), JPEG qualità 0,8, nome file con estensione `.jpg` e MIME `image/jpeg`. Librerie (`pdfjs-dist`, `pdf-lib`) caricate con `import()` dinamico solo quando serve. Durante l'ottimizzazione il bottone resta disabilitato (stato `pending` di `useActionState`). Controlli server (MIME, magic byte, 10MB, `bodySizeLimit`) invariati: un file > 10MB che dopo la compressione scende sotto il limite viene accettato. Guida in-app aggiornata.

**Ask First:** compressione lato server; soglie/qualità diverse da quelle sopra; estensione ad altri upload (logo, foto, sponsor).

**Never:** servizi esterni di compressione (dato sanitario, AD-6); modifiche a `lib/storage/certificati.ts` o alle Server Action; ricompressione dei file già nel bucket.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| PDF scansione pesante | PDF 6MB, 2 pagine | PDF di 2 pagine JPEG, stesso nome, `application/pdf`, più piccolo | — |
| PDF leggero | PDF 400KB | originale invariato | — |
| PDF già ottimizzato | PDF 2MB vettoriale, risultato 2,5MB | originale | — |
| PDF illeggibile | PDF protetto da password / corrotto | originale | catch, `console.warn` |
| Foto grande | JPG 4MB 4000×3000 | JPEG 2000×1500, `.jpg` | — |
| PNG piccolo | PNG 300KB 800×600 | originale | — |
| PNG grande | `scan.png` 3MB | `scan.jpg`, `image/jpeg` | — |
| Nessun file | campo file vuoto (form Segreteria, opzionale) | FormData invariato | — |
| Altro formato | `.docx` | invariato (lo rifiuta il server) | — |

</frozen-after-approval>

## Code Map

- `app/app/(certificati-medici)/certificato-medico/CaricaCertificatoForm.tsx` -- form Genitore/Atleta, `useActionState(caricaCertificato)`; label "max 10MB".
- `app/app/(certificati-medici)/conferma-certificati/ConfermaCertificatoRow.tsx` -- form Segreteria `useActionState(confermaCertificato)`, file opzionale (riga ~98).
- `app/app/(certificati-medici)/conferma-certificati/CertificatoConfermatoRow.tsx` -- modifica confermato `useActionState(aggiornaCertificatoConfermato)`, file opzionale (riga ~184).
- `lib/storage/certificati.ts` -- READ-ONLY: `MIME_AMMESSI`, magic byte (`%PDF`, `FF D8 FF`) - l'output di pdf-lib e canvas li rispetta.
- `next.config.ts` -- READ-ONLY: `bodySizeLimit: "11mb"`.
- `lib/guida/contenuti.ts` -- voci `/app/certificato-medico` (~riga 340) e `/app/conferma-certificati` (~riga 92).
- `vitest.config.ts` -- ambiente `node`: testabile solo la logica pura, non canvas/pdf.js.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- aggiungere `pdfjs-dist` e `pdf-lib` -- rasterizzazione e ricostruzione PDF.
- [x] `lib/comprimi-file-certificato.ts` -- logica pura esportata (`deveComprimere`, `dimensioniRidotte`, `nomeFileJpeg`, `scegliPiuPiccolo`) + `comprimiFileCertificato(file): Promise<File>` (dispatcher PDF/immagine, try/catch fail-soft) + `comprimiFormDataCertificato(formData)` che sostituisce il campo `file` se presente e non vuoto -- unico punto riusato dai tre form.
- [x] `lib/comprimi-file-certificato.test.ts` -- test della logica pura sulla matrice I/O (soglie, dimensioni, nome/estensione, scelta del più piccolo, FormData senza file).
- [x] i tre form sopra -- avvolgere la Server Action passata a `useActionState`: `async (prev, fd) => { await comprimiFormDataCertificato(fd); return action(prev, fd); }` -- pending copre compressione + upload.
- [x] `CaricaCertificatoForm.tsx` -- testo d'aiuto breve: i file pesanti vengono ottimizzati automaticamente prima dell'invio.
- [x] `lib/guida/contenuti.ts` -- una frase in entrambe le voci.

**Acceptance Criteria:**
- Given un PDF scansionato da 6MB, when il Genitore lo carica, then nel bucket finisce un PDF valido più piccolo, apribile da "Visualizza certificato", e la mail alla Segreteria allega il file compresso.
- Given la compressione lancia un'eccezione, when si invia il form, then l'upload procede con l'originale e il comportamento è identico a oggi.
- Given nessun file è selezionato nel form Segreteria, when si conferma, then la conferma funziona come oggi.

## Design Notes

Worker pdf.js istanziato in modo compatibile con Turbopack: `GlobalWorkerOptions.workerPort = new Worker(new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url), { type: "module" })`, una volta sola. Canvas liberato (`width = 0`) dopo ogni pagina per limitare la memoria su mobile. Il testo del PDF rasterizzato non resta selezionabile: accettato dall'utente (certificati = scansioni).

## Verification

**Commands:**
- `npx vitest run lib/comprimi-file-certificato.test.ts` -- expected: verdi
- `npx tsc --noEmit` / `npm run lint` / `npm run build` -- expected: puliti

**Manual checks (if no CLI):**
- dev locale non avviabile su questa macchina: verifica dal vivo dopo il deploy (PDF scansione pesante, foto da telefono, PDF piccolo).

## Suggested Review Order

**Punto d'ingresso e fail-soft**

- Dispatcher PDF/immagine con timeout e ritorno all'originale su qualunque errore.
  [`comprimi-file-certificato.ts:283`](../../lib/comprimi-file-certificato.ts#L283)

- Wrapper unico usato dai tre form: comprime e poi chiama la Server Action.
  [`comprimi-file-certificato.ts:320`](../../lib/comprimi-file-certificato.ts#L320)

**Pipeline PDF**

- Rasterizzazione pagina per pagina, salta PDF firmati e oltre 30 pagine.
  [`comprimi-file-certificato.ts:201`](../../lib/comprimi-file-certificato.ts#L201)

- Worker pdf.js ricreabile dopo errore o timeout.
  [`comprimi-file-certificato.ts:170`](../../lib/comprimi-file-certificato.ts#L170)

- Coda: due righe Segreteria non condividono il worker in contemporanea.
  [`comprimi-file-certificato.ts:193`](../../lib/comprimi-file-certificato.ts#L193)

- Euristica firma digitale (/ByteRange + /Sig), protegge la validità PAdES.
  [`comprimi-file-certificato.ts:104`](../../lib/comprimi-file-certificato.ts#L104)

- Timeout 30s con annullamento del lavoro abbandonato.
  [`comprimi-file-certificato.ts:263`](../../lib/comprimi-file-certificato.ts#L263)

**Pipeline immagini**

- Ridimensionamento a 2000px, sfondo bianco, JPEG 0,8, orientamento EXIF.
  [`comprimi-file-certificato.ts:127`](../../lib/comprimi-file-certificato.ts#L127)

- Regole pure: soglie, dimensioni, nome .jpg, scelta del più piccolo.
  [`comprimi-file-certificato.ts:52`](../../lib/comprimi-file-certificato.ts#L52)

**Collegamento ai form**

- Genitore/Atleta, più testo d'aiuto sotto il campo file.
  [`CaricaCertificatoForm.tsx:11`](../../app/app/(certificati-medici)/certificato-medico/CaricaCertificatoForm.tsx#L11)

- Conferma Segreteria (file opzionale).
  [`ConfermaCertificatoRow.tsx:16`](../../app/app/(certificati-medici)/conferma-certificati/ConfermaCertificatoRow.tsx#L16)

- Modifica certificato confermato.
  [`CertificatoConfermatoRow.tsx:50`](../../app/app/(certificati-medici)/conferma-certificati/CertificatoConfermatoRow.tsx#L50)

**Periferici**

- Guida in-app, voci Conferma certificati e Certificato medico.
  [`contenuti.ts:100`](../../lib/guida/contenuti.ts#L100)

- Test: logica pura, percorso di successo immagini con stub, firma, wrapper.
  [`comprimi-file-certificato.test.ts:69`](../../lib/comprimi-file-certificato.test.ts#L69)

- Nuove dipendenze pdfjs-dist e pdf-lib.
  [`package.json:34`](../../package.json#L34)
