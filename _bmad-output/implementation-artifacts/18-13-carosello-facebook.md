---
baseline_commit: fb02b62d7cd166072d99928adae14ebc46b79bd1
---

# Story 18.13: Carosello automatico dei post Facebook in home (sostituisce l'embed statico)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Visitatore senza account,
I want vedere gli ultimi post della Pagina Facebook della società con il testo completo, che si susseguono automaticamente ogni 10 secondi,
so that possa leggere le novità della società senza dover scorrere manualmente dentro un widget esterno.

## Acceptance Criteria

1. **Given** un Visitatore senza sessione **When** visita la home pubblica e la Pagina Facebook è configurata con un token valido **Then** vede un carosello che mostra un post alla volta con il testo completo (non troncato, nessuno scroll interno necessario)
2. **And** il carosello avanza automaticamente ogni 10 secondi, con un controllo esplicito di pausa/ripresa (WCAG 2.2.2) e navigazione manuale precedente/successivo — stesso livello di accessibilità già garantito dal carosello Sponsor (Story 16.3)
3. **And** se il token non è configurato, non è (più) valido, o la chiamata alle API di Facebook fallisce, la sezione non compare e non rompe il resto della pagina (fail-soft, stesso principio già stabilito per l'embed precedente, Story 18.5 AC #3)
4. **And** il token di accesso Facebook non è mai esposto al browser — nessun valore del token raggiunge un Client Component o il markup renderizzato, stesso principio già stabilito per la password SMTP
5. **And** la sezione resta dietro lo stesso consenso cookie non essenziale già richiesto per l'embed precedente (Story 18.6) — nessuna immagine di Facebook viene caricata prima del consenso esplicito del Visitatore
6. **And** un Admin/Dirigente può configurare il token da `/app/impostazioni`, con un avviso esplicito se il token non è configurato o se l'ultima lettura è fallita
7. **And** lo stile del carosello segue il registro "Poster Sportivo" già applicato al resto della home (Story 18.9-18.12) — a piena larghezza, integrato visivamente, non un widget incorporato a parte

## Tasks / Subtasks

- [x] Task 1: Migrazione Prisma — nuova tabella `configurazione_social_facebook` (AC: #4, #6)
  - [x] Aggiungere a `prisma/schema.prisma`:
    ```prisma
    model ConfigurazioneSocialFacebook {
      id              String   @id @default(uuid())
      accessToken     String
      ultimaLetturaOk Boolean  @default(true)
      ultimoErrore    String?
      createdAt       DateTime @default(now())
      updatedAt       DateTime @updatedAt

      @@map("configurazione_social_facebook")
    }
    ```
  - [x] Nuova migrazione `prisma/migrations/20260814020000_add_configurazione_social_facebook/migration.sql` — mirror **esatto** di `20260718060000_add_configurazione_smtp/migration.sql`, ma con **due** Ruoli ammessi invece di uno solo (vedi Dev Notes "Perché ADMIN+DIRIGENTE, non ADMIN-only come SMTP"):
    ```sql
    CREATE TABLE "configurazione_social_facebook" (
        "id" TEXT NOT NULL,
        "accessToken" TEXT NOT NULL,
        "ultimaLetturaOk" BOOLEAN NOT NULL DEFAULT true,
        "ultimoErrore" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "configurazione_social_facebook_pkey" PRIMARY KEY ("id")
    );

    ALTER TABLE "configurazione_social_facebook" ENABLE ROW LEVEL SECURITY;

    GRANT SELECT, INSERT, UPDATE ON "configurazione_social_facebook" TO authenticated;

    CREATE POLICY "admin_dirigente_configurazione_social_facebook_select" ON "configurazione_social_facebook"
      FOR SELECT
      USING (
        (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
        OR (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'DIRIGENTE'
      );

    CREATE POLICY "admin_dirigente_configurazione_social_facebook_insert" ON "configurazione_social_facebook"
      FOR INSERT
      WITH CHECK (
        (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
        OR (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'DIRIGENTE'
      );

    CREATE POLICY "admin_dirigente_configurazione_social_facebook_update" ON "configurazione_social_facebook"
      FOR UPDATE
      USING (
        (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
        OR (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'DIRIGENTE'
      )
      WITH CHECK (
        (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'ADMIN'
        OR (auth.jwt() -> 'app_metadata' -> 'ruoli') ? 'DIRIGENTE'
      );
    ```
  - [x] Rigenerare il client Prisma dopo la modifica a `schema.prisma` (`npx prisma generate` — resta su 6.19.3, mai 7.x, stessa nota di ogni story precedente). Nessuna migrazione applicabile nel sandbox (nessun accesso Supabase) — da applicare in produzione come tutte le precedenti.

- [x] Task 2: `lib/db-rls/configurazione-social-facebook.ts` — lettura/scrittura RLS-protetta (AC: #4, #6)
  - [x] Mirror **1:1** di `lib/db-rls/configurazione-smtp.ts` (leggi struttura completa in Dev Notes prima di scrivere): costante `ID_CONFIGURAZIONE_SOCIAL_FACEBOOK` fissa, stesso valore letterale `"00000000-0000-0000-0000-000000000001"` già riusato identico da `ID_CONFIGURAZIONE_SMTP` (`lib/db-rls/configurazione-smtp.ts`) e dal singleton id di `configurazione-applicazione.ts` — nessuna collisione possibile, ogni tabella ha il proprio spazio di chiavi primarie indipendente, stessa convenzione già consolidata nel progetto (non inventare un id diverso). Stesso principio di upsert atomico su id fisso (nessun read-then-branch).
  - [x] `leggiConfigurazioneSocialFacebook(supabase: SupabaseClient): Promise<ConfigurazioneSocialFacebookDati | null>` — `select("*").maybeSingle()`, throw su `error` (mirror esatto).
  - [x] `salvaTokenFacebook(supabase: SupabaseClient, accessToken: string): Promise<void>` — upsert su id fisso; resetta esplicitamente `ultimaLetturaOk` a `true`/`ultimoErrore` a `null` (un salvataggio manuale del token da parte dell'Admin non deve lasciare visibile l'avviso di errore del token precedente).
  - [x] `aggiornaStatoLetturaFacebook(supabase: SupabaseClient, esito: { ultimaLetturaOk: boolean; ultimoErrore: string | null }): Promise<void>` — funzione aggiuntiva non elencata nell'inventario originale, necessaria per soddisfare il side-effect del Task 3 punto 8 (scrivere l'esito di ogni tentativo di lettura post separatamente dal salvataggio del token): upsert sugli stessi due campi, mai chiamata da `salvaTokenFacebook`.
  - [x] `rimuoviToken(configurazione): ConfigurazioneSocialFacebookSenzaToken` — mirror esatto di `rimuoviPassword`, destructuring per omettere `accessToken`. **Nessuna pagina deve mai ricevere `accessToken` in chiaro** (AC #4) — la pagina `/app/impostazioni` (Task 8) riceve solo il risultato di questa funzione (booleano "configurato", `ultimaLetturaOk`, `ultimoErrore`), mai il token.
  - [x] Test `lib/db-rls/configurazione-social-facebook.test.ts` — mirror strutturale di `configurazione-smtp.test.ts` (stesso mock `from`/`select`/`maybeSingle`/`upsert`), copre: lettura riga esistente, lettura nessuna riga, throw su errore RLS, upsert su id fisso, `rimuoviToken` non espone `accessToken`.

- [x] Task 3: `lib/facebook-graph.ts` — chiamata server-only alle API Graph di Facebook (AC: #3, #4)
  - [x] `export function estraiSlugPaginaFacebook(url: string): string | null` — funzione pura, testabile isolatamente: parsa `url` (già validato da `urlPaginaFacebookValido`, Story 18.5), estrae il primo segmento di path (es. `https://www.facebook.com/miasocieta` → `"miasocieta"`; `https://www.facebook.com/miasocieta/` → `"miasocieta"`); restituisce `null` se il path è vuoto o l'URL non è parsabile. **Limite noto, non risolto qui**: un URL nella forma `facebook.com/pages/Nome/12345` restituirebbe `"pages"` (segmento sbagliato) — nessun AC copre questo formato di URL, Facebook lo usa raramente per Pagine con username personalizzato (il caso atteso qui); non aggiungere logica speciale per questo formato senza una richiesta esplicita.
  - [x] `export type PostFacebook = { id: string; messaggio: string; immagineUrl: string | null; permalink: string; dataPubblicazione: string }` — nota: `messaggio` è **obbligatorio** (non nullable) perché i post senza testo vengono scartati, vedi sotto.
  - [x] `export async function leggiUltimiPostFacebook(urlPaginaFacebook: string): Promise<PostFacebook[]>` — **questa funzione non lancia mai** (deviazione deliberata dalla convenzione generale del progetto "la query può lanciare, il chiamante fa `.catch()`", necessaria perché questa funzione fa anche side-effect di scrittura dello stato token, vedi sotto — spiegato in Dev Notes "Perché `leggiUltimiPostFacebook` non segue la convenzione `.catch()` del chiamante"):
    1. Legge la configurazione con `leggiConfigurazioneSocialFacebook(createAdminClient())` (mirror **esatto** di `inviaEmail`, `lib/email/invia-email.ts` righe 40-51 — client service-role, non la sessione del Visitatore anonimo che non ne ha una; leggi il file per intero prima di scrivere).
    2. Se nessuna configurazione o `accessToken` assente → ritorna `[]` immediatamente, nessuna chiamata di rete.
    3. Calcola lo slug con `estraiSlugPaginaFacebook(urlPaginaFacebook)`; se `null` → ritorna `[]`.
    4. Chiama `GET https://graph.facebook.com/v21.0/{slug}/posts?fields=message,full_picture,permalink_url,created_time&limit=10&access_token={token}` (**verificare in sviluppo la versione stabile corrente delle Graph API** — `v21.0` è un placeholder di questa storia, nessun precedente in questo progetto per una versione già "pinnata"; Facebook deprecha le versioni vecchie a rotazione).
    5. **Timeout esplicito** sulla `fetch` via `AbortController` (mirror del principio già stabilito per Nodemailer in `lib/email/invia-email.ts` — "un host irraggiungibile non deve far attendere il chiamante per l'intera durata di un timeout di default"), es. 8000ms.
    6. Filtra i post **senza** `message` (post di sola foto/video senza testo) — l'obiettivo esplicito di questa storia è "che si legga tutto il testo del post" (epics.md), un post senza testo non ha nulla da mostrare in un carosello pensato per il testo. **Se questo filtro azzera l'intero elenco** (pagina che pubblica solo foto senza didascalia), la sezione sparisce come da AC #3 (fail-soft) — comportamento intenzionale, non un bug.
    7. Mappa la risposta a `PostFacebook[]` (`message`→`messaggio`, `full_picture`→`immagineUrl` opzionale, `permalink_url`→`permalink`, `created_time`→`dataPubblicazione`).
    8. **Side-effect best-effort**: dopo il tentativo (successo o fallimento), aggiorna `ultimaLetturaOk`/`ultimoErrore` su `configurazione_social_facebook` tramite lo stesso client service-role, **dentro un try/catch separato** che non deve mai propagare — un fallimento nello scrivere lo stato non deve mai rompere la lettura dei post né la pagina (fail-soft su fail-soft).
    9. Qualunque eccezione lungo il percorso (rete, JSON malformato, risposta di errore Graph API) → cattura, aggiorna lo stato come fallito (step 8), ritorna `[]`. **Nessuna eccezione esce mai da questa funzione.**
  - [x] Test `lib/facebook-graph.test.ts`: `estraiSlugPaginaFacebook` (casi puri, nessun mock necessario) con copertura piena; `leggiUltimiPostFacebook` con `fetch` mockato (successo con post misti con/senza `message`, nessuna configurazione, token assente, fetch che rigetta, risposta HTTP non-ok, timeout) — verificare che non lanci **mai**, anche nei casi di errore.

- [x] Task 4: Promuovere `lib/sponsor/carosello-indice.ts` a posizione condivisa (AC: #2)
  - [x] Spostare `lib/sponsor/carosello-indice.ts` → `lib/carosello-indice.ts` (secondo consumer reale, stesso principio di estrazione già applicato più volte in questo progetto — vedi `icone-azione-riga.tsx`, Story 9.30, e l'estrazione di `HeaderPubblico`/`FooterPubblico` in Story 18.8). Contenuto invariato (`avanti`/`indietro`/`indiceEntroLimiti`, pure, nessuna dipendenza React/DOM).
  - [x] Spostare il test `lib/sponsor/carosello-indice.test.ts` → `lib/carosello-indice.test.ts`, invariato.
  - [x] Aggiornare l'import in `app/app/SponsorCarosello.tsx` da `@/lib/sponsor/carosello-indice` a `@/lib/carosello-indice` — **nessun'altra modifica** a `SponsorCarosello.tsx` (comportamento Sponsor invariato).
  - [x] Verificare (grep) che nessun altro file importi ancora `@/lib/sponsor/carosello-indice` prima di eliminare il vecchio percorso.

- [x] Task 5: Nuovo componente `app/PostFacebookCarosello.tsx` (AC: #1, #2)
  - [x] Mirror **strutturale** di `app/app/SponsorCarosello.tsx` (leggi il file per intero prima di scrivere — pausa/ripresa WCAG 2.2.2, indicatori, frecce prev/next, `indiceEntroLimiti` per resilienza a un elenco che cambia, `useEffect` con dipendenza su `indice` per non "risucchiare" una navigazione manuale) con queste differenze:
    - `INTERVALLO_MS = 10000` (non 5000, AC #2).
    - Import di `avanti`/`indietro`/`indiceEntroLimiti` da `@/lib/carosello-indice` (Task 4), non da `@/lib/sponsor/carosello-indice`.
    - Props: `{ post: PostFacebook[] }` (tipo da `@/lib/facebook-graph`, Task 3).
    - Contenuto per post: testo completo di `post.messaggio` (mai troncato, AC #1 — nessun `line-clamp`/`max-height` con overflow nascosto), immagine `post.immagineUrl` se presente (altrimenti nessun placeholder — un post di solo testo è un caso normale, non un dato mancante), data (`post.dataPubblicazione`, un ISO 8601 completo con ora/fuso restituito da Graph API — **non** riusabile con l'helper `formattaData` già triplicato in `app/page.tsx`/`app/calendario/page.tsx` perché quello parsa solo date-piatte `"YYYY-MM-DD"` via `parseDataUtc`, formato diverso; scrivere un piccolo formattatore locale dedicato con `new Date(iso).toLocaleDateString("it-IT", ...)`, stesso principio "nessuna libreria nuova" ma non lo stesso codice, deviazione minima dal piano originale documentata qui), link "Vedi su Facebook" verso `post.permalink` (`target="_blank" rel="noopener noreferrer"`).
    - Radice `<div>`, non `<section>` come `SponsorCarosello` — sulla home pubblica ogni blocco di contenuto è già un singolo `<section aria-labelledby>`/`<h2>` (Sponsor/Partite/Foto squadra, Story 18.2/18.3/18.4): il chiamante (`app/page.tsx`, Task 9) fornisce quel `<section>`/`<h2>` ("Ultimi post", stesso testo già usato come `title` dell'iframe sostituito), annidarne un secondo qui duplicherebbe il landmark ARIA senza motivo — deviazione dal mirror 1:1 di `SponsorCarosello`, documentata perché quel componente **è** invece la radice `<section>` nel suo contesto (dashboard interna, nessun heading esterno).
  - [x] **`prefers-reduced-motion` fin da subito** (Dev Notes epics.md — gap noto di `SponsorCarosello` esistente, **non va corretto retroattivamente lì**, ma questo nuovo componente deve rispettarlo dall'inizio): il timer di avanzamento automatico non deve avviarsi se `window.matchMedia("(prefers-reduced-motion: reduce)").matches` — i controlli manuali (frecce/indicatori) restano comunque disponibili.
  - [x] Nessun test diretto sul componente (stessa convenzione già accettata per `SponsorCarosello.tsx` — richiederebbe React Testing Library, mai introdotta in questo progetto).

- [x] Task 6: Nuovo CSS module `app/post-facebook-carosello.module.css` (AC: #7)
  - [x] Registro "Poster Sportivo", sfondo `{colors.grigio-chiaro}` `#F2F5F7` **invariato** da `DESIGN.md.components.social-embed` (nessuna nuova sessione UX per questa storia — lo sfondo chiaro esistente resta corretto, cambia solo il contenuto interno da iframe a carosello a piena larghezza; vedi Dev Notes "Nessuna spec DESIGN.md dedicata al carosello — estensione per inferenza, non un nuovo componente UX").
  - [x] Intestazione: **nessuna nuova classe qui** — la sezione `<h2>` "Ultimi post" in `app/page.tsx` (Task 9) riusa `styles.titoloSezione`, già esistente in `home-pubblica.module.css` (`{typography.display-section}`), esattamente come per Sponsor/Partite/Foto squadra — nessuna duplicazione.
  - [x] Testo del post in `{typography.body}`, leggibile per intero (nessun troncamento CSS).
  - [x] Pulsanti pausa/frecce/indicatori: stesso trattamento di area cliccabile 44×44px e contorno di focus visibile già stabilito in `sponsor-carosello.module.css` (leggerlo per il pattern esatto, non reinventarlo).
  - [x] `@media (prefers-reduced-motion: reduce)`: non necessaria — nessuna `transition` CSS definita sui controlli di questo componente (a differenza di `.accedi`/`.bottone` altrove nel registro); l'unica animazione reale è il timer JS di avanzamento automatico, già condizionato su `prefers-reduced-motion` in `PostFacebookCarosello.tsx` (Task 5).

- [x] Task 7: Server Action `salvaTokenFacebookAction` (AC: #4, #6)
  - [x] In `app/app/(configurazione)/impostazioni/actions.ts` (stesso file di `salvaUrlPaginaFacebookAction`/`salvaContattiPubbliciAction` — nessun nuovo file di action): `requireRuolo(["ADMIN", "DIRIGENTE"])` (AC #6 lo richiede esplicitamente — vedi Dev Notes "Perché ADMIN+DIRIGENTE, non ADMIN-only come SMTP" per la tensione apparente con l'inventario tecnico di epics.md, già risolta qui).
  - [x] Valore vuoto = **non modificare** il token esistente (mirror esatto della password SMTP, Prerequisito già consolidato in questo progetto) — **non** "rimuovi configurazione" come per `urlPaginaFacebook`/Contatti pubblici (quei campi sono innocui da svuotare, un token è un segreto: svuotarlo per errore in un submit senza intenzione esplicita sarebbe distruttivo). Se l'Admin/Dirigente vuole davvero rimuovere il token, non è un caso d'uso richiesto da alcun AC — non implementarlo.
  - [x] Validazione: lunghezza massima ragionevole (es. 512 caratteri, i Page Access Token di Facebook sono lunghi ma entro questo limite), nessun altro formato imposto (stringa opaca).
  - [x] Su salvataggio riuscito: chiama `salvaTokenFacebook` (Task 2) — che azzera `ultimaLetturaOk`/`ultimoErrore` per costruzione (Task 2), poi `revalidatePath("/app/impostazioni")`.
  - [x] Test in `app/app/(configurazione)/impostazioni/actions.test.ts` (file esistente, aggiungere `describe` dedicato) — mirror dei test già presenti per `salvaUrlPaginaFacebookAction`: rifiuto per Ruolo non ammesso, valore vuoto non tocca il token esistente, validazione lunghezza, errore interno gestito.

- [x] Task 8: Form Admin `TokenFacebookForm.tsx` su `/app/impostazioni` (AC: #6)
  - [x] Nuovo file `app/app/(configurazione)/impostazioni/TokenFacebookForm.tsx` — mirror **strutturale** di `ConfigurazioneSmtpForm.tsx` per il solo campo password: input `type="password"` `autoComplete="off"`, **mai precompilato** col token reale, etichetta condizionale, più `required={!configurato}` (mirror esatto del `required={!configurazioneEsistente}` della password SMTP — impedisce a livello di browser un primo salvataggio vuoto, che la Server Action tratterebbe come no-op "non modificare" senza nulla da non modificare).
  - [x] Props: `{ configurato: boolean; ultimaLetturaOk: boolean }` (mai il token).
  - [x] Stato visibile: `"Token configurato"` / `"Token non configurato"` (nessun valore, solo lo stato), più `" — ultima lettura fallita"` se `configurato && !ultimaLetturaOk`.
  - [x] In `app/app/(configurazione)/impostazioni/page.tsx`: nuova sezione `"Token Facebook"` sotto "Contatti pubblici" — legge `leggiConfigurazioneSocialFacebook(supabase)` (client con sessione utente), fail-soft con `.catch()`, poi applica **subito** `rimuoviToken()` (nuova variabile `tokenFacebook`, mai la lettura grezza usata oltre quel punto — difesa in profondità anche se in questa pagina nessun oggetto intero attraversa il confine verso `TokenFacebookForm`, solo 2 booleani derivati). Avviso esplicito se non configurato **o** se `ultimaLetturaOk === false` (AC #6, con `ultimoErrore` incluso nel testo se presente).

- [x] Task 9: Sostituire l'embed in `app/page.tsx` (AC: #1, #3, #5, #7)
  - [x] Rimosso l'import di `costruisciLinkPaginaFacebookIncorporata` da `@/lib/embed-facebook` e l'intero blocco `<iframe>`, sostituiti da `leggiUltimiPostFacebook` (`@/lib/facebook-graph`) e `<PostFacebookCarosello>`.
  - [x] Nuova lettura: `urlPaginaFacebook` era già risolto **dentro** il `Promise.all` esistente insieme a Sponsor/Partite/Foto squadra — `leggiUltimiPostFacebook(urlPaginaFacebook)` dipende dal suo valore, quindi eseguita **dopo** quel `Promise.all` (non poteva starci dentro), condizionata su `urlPaginaFacebook && consentitoSocial`.
  - [x] Condizione di rendering finale: **solo** `postFacebook.length > 0` (non `postFacebook.length > 0 && consentitoSocial` come originariamente ipotizzato) — `consentitoSocial` è già incorporato a monte nel calcolo di `postFacebook` stesso (se falso, `leggiUltimiPostFacebook` non viene nemmeno chiamata, `postFacebook` resta `[]`); ripeterlo anche nella condizione di rendering sarebbe stato ridondante, non sbagliato ma un doppio controllo dello stesso fatto.
  - [x] Sostituito il blocco `<iframe>` con `<PostFacebookCarosello post={postFacebook} />` dentro la stessa `<section className={styles.sezioneSocial} aria-labelledby="titolo-social"><h2 id="titolo-social">Ultimi post</h2>...</section>` già esistente (riusata invariata, non ricreata).
  - [x] Rimossa da `home-pubblica.module.css` solo `.iframeSocial` (verificato via grep: nessun altro file la referenziava) — `.sezioneSocial` **resta**, è ancora il contenitore della sezione (non era morta, l'inventario originale del Task era impreciso su questo punto).
  - [x] Nessun'altra riga di `app/page.tsx` toccata: `mostraSponsor`/`mostraPartite`/`mostraFotoSquadra` verificate testualmente identiche via `git diff` (nessuna occorrenza nel diff).

- [x] Task 10: Rimuovere `lib/embed-facebook.ts` se diventato codice morto (AC: #7)
  - [x] Grep dell'intero repo per `embed-facebook`/`costruisciLinkPaginaFacebookIncorporata` — l'unico consumer reale era `app/page.tsx` (rimosso al Task 9); trovate solo 2 menzioni residue in **commenti** (non import) in `impostazioni/actions.ts` e `app/contatti/page.tsx`, aggiornate per non citare più un file eliminato. `lib/embed-facebook.ts` e `lib/embed-facebook.test.ts` eliminati.

- [x] Task 11: Guida in-app (regola permanente del progetto dall'Epic 17)
  - [x] Aggiornato il contenuto guida di `/app/impostazioni` (`lib/guida/contenuti.ts`) con un nuovo bullet sul Token Facebook (comportamento "vuoto = non modificare", avviso su token mancante/lettura fallita). Nota scoperta preparando questo task, **non introdotta da questa storia**: `PROTECTED_ROUTES["/app/impostazioni"].ruoliAmmessi` è `["ADMIN"]` (route-level, `lib/auth/route-guard.ts:198`), ma le Server Action di quella pagina (Pagina Facebook/Contatti pubblici/Token Facebook) ammettono `["ADMIN","DIRIGENTE"]` — un Dirigente non può nemmeno raggiungere `/app/impostazioni` (redirect prima del form), rendendo il permesso Dirigente di quelle 3 action di fatto irraggiungibile. Gap pre-esistente (già presente dalla Story 18.5), fuori scope qui (toccherebbe l'autorizzazione dell'intera pagina, non solo la sezione Token Facebook) — segnalato nei Completion Notes per la code review.

- [x] Task 12: Verifica finale (tutti gli AC)
  - [x] `npx vitest run` — 1164/1164 test Vitest passati (era 1135, +29: 10 in `configurazione-social-facebook.test.ts`, 15 in `facebook-graph.test.ts`, 12 in `carosello-indice.test.ts` spostato invariato, 8 nuovi in `impostazioni/actions.test.ts` per `salvaTokenFacebookAction`), nessuna regressione.
  - [x] `npx tsc --noEmit` (0 errori), `npm run lint` (0 errori, solo gli 11 warning `<img>`/`no-unused-vars` preesistenti, nessuno nuovo — l'`<img>` di `PostFacebookCarosello.tsx` ha il proprio `eslint-disable-next-line` mirror di `SponsorCarosello.tsx`), `npm run build` (✓ Compiled successfully, tutte le rotte incluse `/` e `/app/impostazioni` nell'output; i soliti errori Prisma WASM/"Dynamic server usage" sono il quirk noto dell'ambiente locale, non causati da questa storia).

### Review Findings

- [x] [Review][Patch] `createAdminClient()` non protetta da try/catch in `leggiUltimiPostFacebook` — può lanciare e rompere l'intera home pubblica [lib/facebook-graph.ts:69] — risolto: spostata dentro il try/catch esistente insieme alla lettura della configurazione.
- [x] [Review][Patch] AC #6 non soddisfatto per Dirigente: `/app/impostazioni` è ADMIN-only a livello di rotta, il Dirigente non raggiunge mai il form [lib/auth/route-guard.ts:198] — risolto: `ruoliAmmessi` allargato a `["ADMIN","DIRIGENTE"]` (corregge anche il gap gemello già preesistente per Pagina Facebook/Contatti pubblici). Aggiornati il test di `route-decision.test.ts` e la voce guida in `lib/guida/contenuti.ts` (il test di coerenza CONTENUTI_GUIDA/PROTECTED_ROUTES lo richiedeva).
- [x] [Review][Patch] Token Facebook passato come query string invece che header Authorization, rischio di leak in `ultimoErrore` mostrato in UI [lib/facebook-graph.ts:91-96] — risolto: `access_token` rimosso dalla query string, spostato in `Authorization: Bearer`.
- [x] [Review][Patch] `estraiSlugPaginaFacebook` non gestisce il formato URL comune `facebook.com/profile.php?id=...` [lib/facebook-graph.ts:15-24] — risolto: gestito esplicitamente il caso `/profile.php` con parametro `id`.
- [x] [Review][Patch] `referrerPolicy` non impostato sull'`<img>` del post (regressione rispetto all'iframe rimosso, che aveva `no-referrer`) [app/PostFacebookCarosello.tsx:81-85] — risolto: aggiunto `referrerPolicy="no-referrer"`.
- [x] [Review][Patch] Submit vuoto del token restituisce sempre successo anche se nessun token è mai stato configurato (bypassabile senza JS) [app/app/(configurazione)/impostazioni/actions.ts:263] — risolto: verifica server-side dell'esistenza di una configurazione (mirror di `salvaConfigurazione` SMTP), `VALIDATION` se nessuna esiste ancora.
- [x] [Review][Patch] Nessun aggiornamento di `ultimaLetturaOk`/`ultimoErrore` quando `estraiSlugPaginaFacebook` restituisce `null` — nessun avviso diagnostico per un URL configurato malformato [lib/facebook-graph.ts:83-85] — risolto: chiamato `aggiornaStatoSicuro` anche in questo ramo.
- [x] [Review][Patch] `alt=""` sempre vuoto sull'immagine del post, penalizza i post dove l'immagine è il contenuto primario [app/PostFacebookCarosello.tsx:83] — risolto: `alt="Immagine allegata al post"`.
- [x] [Review][Defer] Nessun `aria-live` sul contenuto del carosello — deferred, pre-esistente (stesso gap identico già presente in `SponsorCarosello.tsx`, Story 16.3, non introdotto qui) [app/PostFacebookCarosello.tsx]
- [x] [Review][Defer] Policy RLS INSERT/UPDATE senza verifica esplicita dell'id singleton, nessun REVOKE esplicito da anon/public — deferred, mirror esatto del pattern già esistente e accettato in `configurazione_smtp` [prisma/migrations/20260814020000_add_configurazione_social_facebook/migration.sql]
- [x] [Review][Defer] `leggiConfigurazioneSocialFacebook` usa `.maybeSingle()` senza filtro esplicito sull'id — deferred, mirror esatto di `leggiConfigurazioneSmtp` [lib/db-rls/configurazione-social-facebook.ts:20-24]
- [x] [Review][Defer] `salvaTokenFacebook` resetta lo stato a "ok" senza validare sincronamente il token — deferred, stessa convenzione UX già stabilita per la password SMTP (salva-poi-verifica-con-uso-reale) [lib/db-rls/configurazione-social-facebook.ts]
- [x] [Review][Defer] Nessun vincolo CHECK a livello DB per la lunghezza massima (512) — deferred, coerente con ogni altra tabella di configurazione del progetto, nessuna ha vincoli di lunghezza a livello DB
- [x] [Review][Defer] Nessuna strategia di cache/revalidate sulla fetch Graph API, scrittura DB ad ogni visita pubblica con consenso — deferred, la pagina è già `force-dynamic`, volume coerente con la scala del progetto (NFR6)
- [x] [Review][Defer] Upsert parziale in `aggiornaStatoLetturaFacebook` potrebbe violare `accessToken NOT NULL` se la riga singleton fosse cancellata fuori banda — deferred, probabilità trascurabile, nessun percorso applicativo cancella quella riga
- [x] [Review][Defer] Messaggi di errore poco dettagliati per risposte non-JSON o timeout — deferred, rifinitura minore, nessun AC richiede maggiore precisione diagnostica
  - [x] Grep mirato per `accessToken` in `app/**/*.{ts,tsx}` (esclusi i test): solo in `impostazioni/actions.ts` (Server Action, mai un Client Component), il commento/nome-campo in `impostazioni/page.tsx`/`TokenFacebookForm.tsx` (il `name="accessToken"` è l'attributo HTML del campo del form, non un valore esposto — l'input non ha mai `defaultValue`). Nessuna occorrenza in `PostFacebookCarosello.tsx` (riceve solo `PostFacebook[]`, mai la configurazione).
  - [x] Verifica manuale (impossibile nel sandbox, demandata all'utente): con un token reale configurato, il carosello mostra i post con testo completo, avanza ogni 10s, pausa/frecce/indicatori funzionano, l'avviso su `/app/impostazioni` appare se il token è mancante o l'ultima lettura è fallita.

## Dev Notes

### Perché ADMIN+DIRIGENTE, non ADMIN-only come SMTP — tensione apparente in epics.md, risolta qui

`epics.md` (note tecniche preliminari di questa storia) dice che il token "è un segreto reale... nuova tabella singleton dedicata con la **stessa protezione** [di `ConfigurazioneSmtp`]" — che è RLS **ADMIN-only**. Ma l'AC #6 della stessa storia dice esplicitamente "un **Admin/Dirigente** può configurare il token". Questi due testi, letti alla lettera, si contraddicono sul perimetro di Ruoli. Questa storia risolve la tensione a favore dell'AC (testabile, vincolante) sulla nota tecnica preliminare (descrittiva, scritta prima dell'AC): "stessa protezione" va inteso come *stesso meccanismo* (RLS + tabella singleton dedicata, mai `ConfigurazioneApplicazione` che non ha RLS), non *stesso identico set di Ruoli* — coerente con il fatto che ogni altro contenuto pubblico gestibile di questo Epic (Sponsor, Contatti pubblici, Pagina Facebook, foto hero Story 18.14) è già Admin/Dirigente, mai Admin-only. Le policy RLS del Task 1 riflettono questa decisione (`ADMIN` OR `DIRIGENTE`, non solo `ADMIN`).

### Perché `leggiUltimiPostFacebook` non segue la convenzione `.catch()` del chiamante

Ogni altra query pubblica di questo progetto (`trovaAnnoAgonisticoCorrente`, `leggiUrlPaginaFacebook`, ecc.) può lanciare, e il chiamante (`page.tsx`) aggiunge `.catch(() => valoreFallback)`. Questa funzione **non** segue quel pattern: oltre a leggere, scrive anche lo stato `ultimaLetturaOk`/`ultimoErrore` come side-effect (necessario per l'avviso Admin dell'AC #6) — se lanciasse e il chiamante la wrappasse con `.catch()`, quel side-effect non avrebbe mai la garanzia di essere eseguito prima della propagazione dell'eccezione, e ogni futuro chiamante dovrebbe ricordarsi di intercettarla correttamente per non rompere la home. Centralizzare il fail-soft **dentro** la funzione (mai lanciare) è più sicuro per una funzione con due responsabilità (lettura dati pubblici + telemetria interna) — deviazione deliberata dalla convenzione generale, documentata qui perché un futuro sviluppatore che legge le altre query pubbliche del progetto potrebbe aspettarsi lo stesso pattern e non trovarlo.

### Nessuna spec DESIGN.md dedicata al carosello — estensione per inferenza, non un nuovo componente UX

A differenza delle Story 18.9-18.12/18.15/18.16 (che hanno avuto una sessione UX dedicata con Sally prima o durante lo sviluppo), questa storia **non** ha una sessione UX propria — `epics.md` la descrive come "stesso principio già stabilito per lo Sponsor carousel, Story 16.3" e si aspetta di riusare `DESIGN.md.components.social-embed` (sfondo, tipografia) già esistente, cambiando solo il contenuto interno (da iframe a carosello). Questa storia **non introduce** un nuovo token/componente in `DESIGN.md` — se in fase di sviluppo emerge che il risultato visivo non è soddisfacente, la strada è una story di restyling dedicata successiva (stesso percorso già seguito per Story 18.15/18.16), non una sessione UX improvvisata dentro questa storia.

### File da leggere per intero PRIMA di scrivere (mirror esatti, non indovinare la struttura)

- `app/app/SponsorCarosello.tsx` + `app/app/sponsor-carosello.module.css` — mirror del componente carosello (Task 5/6).
- `lib/sponsor/carosello-indice.ts` + test — da spostare invariato (Task 4).
- `lib/db-rls/configurazione-smtp.ts` + `lib/db-rls/configurazione-smtp.test.ts` — mirror del modulo RLS a id fisso (Task 2).
- `lib/email/invia-email.ts` (righe 1-56) — mirror **esatto** del pattern `createAdminClient()` per leggere un segreto RLS da un contesto senza sessione utente (Task 3, punto più critico di questa storia: senza questo pattern la lettura dalla home pubblica anonima non funzionerebbe mai).
- `lib/auth-admin/client.ts` — il client service-role da riusare invariato (mai crearne uno nuovo).
- `app/app/(configurazione)/smtp/ConfigurazioneSmtpForm.tsx` — mirror del campo "segreto mai precompilato" (Task 8).
- `app/app/(configurazione)/impostazioni/page.tsx` + `PaginaFacebookForm.tsx` + `actions.ts` — mirror delle 3 sezioni esistenti, pattern `.catch()` fail-soft nel `Promise.all` (Task 7/8/9).
- `app/page.tsx` (sezione post social, cercare `costruisciLinkPaginaFacebookIncorporata`) — cosa va rimosso/sostituito (Task 9).
- `prisma/migrations/20260718060000_add_configurazione_smtp/migration.sql` — mirror esatto della migrazione RLS (Task 1).

### Cosa NON cambia in questa storia

`app/CookieBanner.tsx`, la logica di consenso (`lib/cookie-consenso.ts`), le condizioni di visibilità delle altre sezioni della home (Sponsor/Partite/Foto squadra), `urlPaginaFacebook`/`ConfigurazioneApplicazione` (riusati invariati, nessun nuovo campo "Page ID" — vedi epics.md), `PaginaFacebookForm.tsx`/`salvaUrlPaginaFacebookAction` (restano per l'URL pubblico, distinti dal nuovo token privato).

### Project Structure Notes

- File nuovi: `lib/db-rls/configurazione-social-facebook.ts` (+ test), `lib/facebook-graph.ts` (+ test), `lib/carosello-indice.ts` (+ test, spostato da `lib/sponsor/`), `app/PostFacebookCarosello.tsx`, `app/post-facebook-carosello.module.css`, `app/app/(configurazione)/impostazioni/TokenFacebookForm.tsx`, nuova migrazione Prisma.
- File modificati: `prisma/schema.prisma`, `app/app/SponsorCarosello.tsx` (solo import), `app/app/(configurazione)/impostazioni/actions.ts`, `app/app/(configurazione)/impostazioni/page.tsx`, `app/app/(configurazione)/impostazioni/impostazioni.module.css` (eventuale classe nuova se serve), `app/page.tsx`, `home-pubblica.module.css` (rimozione classi morte), `lib/guida/contenuti.ts`.
- File probabilmente eliminati: `lib/embed-facebook.ts` (+ test se esiste), `lib/sponsor/carosello-indice.ts` (+ test, spostato).
- Stessa convenzione "un modulo CSS per componente condiviso" già stabilita (mirror di `sponsor-carosello.module.css`).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 18, Story 18.13] — testo originale di User Story, AC, studio di usabilità e note tecniche preliminari (verbatim in questo file).
- [Source: app/app/SponsorCarosello.tsx, lib/sponsor/carosello-indice.ts] — mirror diretto del pattern carosello (Story 16.3).
- [Source: lib/db-rls/configurazione-smtp.ts, prisma/migrations/20260718060000_add_configurazione_smtp/migration.sql] — mirror diretto del pattern "segreto RLS-protetto, singleton a id fisso" (Story 7.1, AD-12).
- [Source: lib/email/invia-email.ts, lib/auth-admin/client.ts] — mirror diretto del pattern "lettura di un segreto RLS da un contesto senza sessione utente" (Story 4.3, AD-11).
- [Source: app/app/(configurazione)/impostazioni/page.tsx, PaginaFacebookForm.tsx, actions.ts] — mirror diretto delle 3 sezioni esistenti della pagina hub (Story 9.31/18.5/18.11).
- [Source: app/page.tsx, lib/embed-facebook.ts, _bmad-output/implementation-artifacts/18-5-post-social-home.md] — cosa questa storia sostituisce.
- [Source: ux-designs/ux-societa-manager-2026-08-13/DESIGN.md, sezione "Componenti" → social-embed, sezione "Cose da fare e da evitare"] — vincoli di palette da rispettare (nessun nuovo blocco `{colors.blu-carbone}`/`{colors.azzurro-partite}` per questo componente).
- [Source: AGENTS.md, root del repo] — nota su Next.js non standard: nessuna modifica a routing/parametri dinamici in questa storia, non sostanzialmente applicabile.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (dev-story workflow)

### Debug Log References

Nessuno - implementazione lineare, nessun blocco/HALT incontrato.

### Completion Notes List

- Tutti e 12 i Task completati esattamente come pianificato, con 3 deviazioni minori documentate inline nel file di story al momento in cui sono emerse (non silenziose): (1) aggiunta la funzione `aggiornaStatoLetturaFacebook` in `lib/db-rls/configurazione-social-facebook.ts`, non elencata nell'inventario originale ma necessaria per il side-effect del Task 3; (2) `formattaData` in `PostFacebookCarosello.tsx` è un piccolo formattatore dedicato (non un riuso dell'omonimo helper di `app/page.tsx`, che parsa solo date-piatte `"YYYY-MM-DD"` — il `created_time` di Graph API è un ISO 8601 completo con ora/fuso, formato diverso); (3) `PostFacebookCarosello` ha come radice un `<div>` invece di un `<section>` come `SponsorCarosello` — sulla home pubblica ogni blocco di contenuto è già un singolo `<section aria-labelledby>`/`<h2>` fornito dal chiamante, annidarne un secondo avrebbe duplicato il landmark ARIA.
- Punto architetturale centrale: la home pubblica (Visitatore anonimo) legge il token Facebook RLS-protetto tramite `createAdminClient()` (client service-role), mirror esatto del pattern già stabilito da `lib/email/invia-email.ts` per leggere la password SMTP da un contesto senza sessione utente. La pagina Admin `/app/impostazioni` invece usa il client con sessione utente (RLS ADMIN+DIRIGENTE la autorizza direttamente) — due percorsi di lettura diversi per due contesti diversi, entrambi corretti, nessuna scorciatoia.
- Risolta la tensione tra l'inventario tecnico di `epics.md` ("stessa protezione [ADMIN-only] di ConfigurazioneSmtp") e l'AC #6 ("Admin/Dirigente può configurare il token"): RLS scritta per `ADMIN` OR `DIRIGENTE`, motivazione completa nei Dev Notes della storia.
- `leggiUltimiPostFacebook` (lib/facebook-graph.ts) è l'unica funzione del progetto che devia deliberatamente dalla convenzione "la query può lanciare, il chiamante fa `.catch()`": non lancia mai, perché scrive anche lo stato `ultimaLetturaOk`/`ultimoErrore` come side-effect (AC #6) e centralizzare il fail-soft al suo interno è più sicuro che delegarlo a ogni futuro chiamante.
- `lib/sponsor/carosello-indice.ts` promosso a `lib/carosello-indice.ts` (secondo consumer reale), `lib/embed-facebook.ts` eliminato (diventato codice morto dopo la sostituzione dell'iframe).
- Nessuna migrazione applicata al DB nel sandbox (nessun accesso Supabase) — da applicare in produzione come tutte le precedenti.
- Verifica manuale con un token Facebook reale (carosello dal vivo, avviso token scaduto) NON eseguibile in questo sandbox — demandata all'utente, che dovrà anche generare il Page Access Token su developers.facebook.com prima di poter configurare la sezione.

**Code review** (Blind Hunter + Edge Case Hunter + Acceptance Auditor in parallelo) - 8 patch applicati, 8 defer, 4 scartati come rumore (falsi positivi dovuti ai diff parziali passati ai subagent per motivi di budget — codice/test in realtà già presenti, verificato). I due finding più seri:
  - `createAdminClient()` non era protetta da try/catch in `leggiUltimiPostFacebook` — poteva lanciare e rompere l'intera home pubblica, contraddicendo il commento "non lancia mai" nello stesso file. Risolto spostandola dentro il try/catch esistente.
  - **AC #6 non soddisfatto per Dirigente** — `PROTECTED_ROUTES["/app/impostazioni"]` era `ruoliAmmessi: ["ADMIN"]` (route-level), quindi un Dirigente veniva reindirizzato prima di raggiungere il form, nonostante le Server Action della pagina (Pagina Facebook, Contatti pubblici, Token Facebook) ammettessero già `["ADMIN","DIRIGENTE"]`. Gap presente dalla Story 18.5, questa volta **corretto** (non solo segnalato/deferred) su spinta dell'Acceptance Auditor: allargato `ruoliAmmessi` a `["ADMIN","DIRIGENTE"]` in `route-guard.ts` — fix che corregge anche il gap gemello già preesistente per Pagina Facebook/Contatti pubblici, non solo la sezione nuova di questa storia. Aggiornati il test di regressione in `route-decision.test.ts` e la voce guida in `lib/guida/contenuti.ts` (richiesto dal test di coerenza CONTENUTI_GUIDA/PROTECTED_ROUTES).
  - Altri 6 patch: token spostato da query string a header `Authorization: Bearer` (riduce il rischio che finisca in `ultimoErrore` mostrato in UI); `estraiSlugPaginaFacebook` ora gestisce anche `facebook.com/profile.php?id=...`; `referrerPolicy="no-referrer"` sull'`<img>` del post (regressione rispetto all'iframe rimosso); submit vuoto del token ora verificato server-side contro l'esistenza di una configurazione (mirror del pattern SMTP) invece di restituire sempre successo; nessun aggiornamento di stato quando lo slug non è ricavabile da un URL malformato, corretto; `alt=""` sostituito con un fallback descrittivo minimo.
  - 8 defer (pre-esistenti o coerenti con convenzioni già stabilite nel progetto, non introdotti da questa storia): nessun `aria-live` sul carosello (stesso gap di `SponsorCarosello`), policy RLS/lettura senza verifica esplicita dell'id singleton e nessun REVOKE esplicito (mirror di `configurazione_smtp`), nessuna validazione sincrona del token al salvataggio (stessa UX di SMTP), nessun vincolo CHECK a livello DB, nessuna cache/revalidate sulla fetch Graph API, upsert parziale nel raro caso di riga cancellata fuori banda, messaggi di errore poco dettagliati per risposte non-JSON/timeout.
- 1167/1167 test Vitest passati (+32 rispetto ai 1135 di partenza: +29 dall'implementazione, +3 dai fix di review — 2 nuovi test per il submit vuoto senza configurazione esistente, 1 test di route-decision aggiornato), 0 errori tsc/eslint, build produzione riuscita (tutte le rotte pubbliche + `/app/impostazioni` presenti nell'output).

### File List

**Nuovi:**
- `prisma/migrations/20260814020000_add_configurazione_social_facebook/migration.sql`
- `lib/db-rls/configurazione-social-facebook.ts`
- `lib/db-rls/configurazione-social-facebook.test.ts`
- `lib/facebook-graph.ts`
- `lib/facebook-graph.test.ts`
- `lib/carosello-indice.ts` (contenuto spostato da `lib/sponsor/carosello-indice.ts`)
- `lib/carosello-indice.test.ts` (contenuto spostato da `lib/sponsor/carosello-indice.test.ts`)
- `app/PostFacebookCarosello.tsx`
- `app/post-facebook-carosello.module.css`
- `app/app/(configurazione)/impostazioni/TokenFacebookForm.tsx`

**Modificati:**
- `prisma/schema.prisma`
- `app/app/SponsorCarosello.tsx` (solo import)
- `app/app/(configurazione)/impostazioni/actions.ts`
- `app/app/(configurazione)/impostazioni/actions.test.ts`
- `app/app/(configurazione)/impostazioni/page.tsx`
- `app/app/(configurazione)/impostazioni/impostazioni.module.css`
- `app/page.tsx`
- `app/home-pubblica.module.css`
- `app/contatti/page.tsx` (solo commento)
- `lib/guida/contenuti.ts` (+ fix code review: `ruoliAmmessi` di `/app/impostazioni`)

**Modificati in code review:**
- `lib/facebook-graph.ts` (try/catch su `createAdminClient()`, token in header invece di query string, gestione `profile.php?id=`, aggiornamento stato su slug non valido)
- `app/PostFacebookCarosello.tsx` (`referrerPolicy`, `alt` descrittivo)
- `app/app/(configurazione)/impostazioni/actions.ts` (verifica server-side su submit vuoto)
- `app/app/(configurazione)/impostazioni/actions.test.ts` (nuovi test)
- `lib/auth/route-guard.ts` (`/app/impostazioni` allargata a `["ADMIN","DIRIGENTE"]`)
- `lib/auth/route-decision.test.ts` (test aggiornato/aggiunto per il nuovo perimetro di Ruoli)

**Eliminati:**
- `lib/sponsor/carosello-indice.ts` (spostato)
- `lib/sponsor/carosello-indice.test.ts` (spostato)
- `lib/embed-facebook.ts` (codice morto)
- `lib/embed-facebook.test.ts` (codice morto)

### Change Log

- 2026-08-14: Implementata Story 18.13 (dev-story workflow) - sostituito l'embed statico Facebook con un carosello attivo basato sulle API Graph. Status: ready-for-dev → review.
- 2026-08-14: Code review completata (bmad-code-review, 3 layer paralleli) - 8 patch applicati (incluso un bug reale che poteva rompere la home pubblica e la correzione dell'AC #6 per il Dirigente), 8 defer (pre-esistenti/coerenti con convenzioni già stabilite), 4 scartati come rumore. Status: review → done.
