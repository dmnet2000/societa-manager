---
baseline_commit: a957215
---

# Story 18.11: Pagina pubblica "Contatti"

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Visitatore senza account,
I want trovare indirizzo, contatti e canali social della società,
so that possa mettermi in contatto o raggiungere la sede senza dover cercare altrove.

## Acceptance Criteria

1. **Given** un Admin o Dirigente **When** compila indirizzo/telefono/email pubblici su `/app/impostazioni` **Then** i valori vengono salvati sul singleton `ConfigurazioneApplicazione` esistente.
2. **Given** un Visitatore senza sessione **When** visita `/contatti` **Then** vede i soli campi effettivamente configurati (nessun campo vuoto mostrato come "non disponibile").
3. **And** se nessun campo è mai stato configurato, la pagina mostra un messaggio esplicito invece di una pagina completamente vuota.
4. **And** nessun dato riservato (email Segreteria interna, credenziali, ecc.) è esposto in questa vista — solo i nuovi campi pubblici introdotti da questa storia.

## Tasks / Subtasks

- [x] Task 1: Migrazione Prisma — 3 nuovi campi nullable su `ConfigurazioneApplicazione` (AC: #1)
  - [x] Nuova migrazione `prisma/migrations/<timestamp>_add_contatti_pubblici/migration.sql`:
    ```sql
    ALTER TABLE "configurazione_applicazione"
      ADD COLUMN "indirizzoSede" TEXT,
      ADD COLUMN "telefonoPubblico" TEXT,
      ADD COLUMN "emailPubblica" TEXT;
    ```
    Mirror esatto di `20260806000000_add_email_segreteria`/`20260813010000_add_url_pagina_facebook` (colonne nullable su tabella già strutturale/no-RLS, nessun `GRANT` da toccare) — le 3 colonne raggruppate in un'unica migrazione perché introdotte insieme da questa unica storia (a differenza di `emailSegreteria`/`urlPaginaFacebook`, arrivate in storie separate).
  - [x] Aggiungere i 3 campi a `model ConfigurazioneApplicazione` in `prisma/schema.prisma` (dopo `urlPaginaFacebook`, riga ~355), ciascuno con un commento che cita questa storia — mirror del commento già presente sopra `urlPaginaFacebook` per Story 18.5.
  - [x] Nomi campo esatti (confermati contro l'unica proposta dell'epica, nessuna divergenza trovata in analisi): `indirizzoSede`, `telefonoPubblico`, `emailPubblica`.

- [x] Task 2: Funzioni dati + Server Action Admin/Dirigente (AC: #1)
  - [x] `lib/configurazione-applicazione.ts`: nuove `leggiContattiPubblici()` e `salvaContattiPubblici(valori)` — vedi Dev Notes "Una funzione combinata, non 3 funzioni separate" per la firma esatta e la motivazione della singola scrittura raggruppata (diverso dal pattern granulare 1-funzione-per-campo di `nomeSettore`/`emailSegreteria`/`urlPaginaFacebook`, ma stesso upsert atomico sull'id fisso `ID_CONFIGURAZIONE_APPLICAZIONE`).
  - [x] `app/app/(configurazione)/impostazioni/actions.ts`: nuova `salvaContattiPubbliciAction(_prevState, formData)` — **un solo Server Action per i 3 campi insieme** (mirror del perimetro di autorizzazione di `salvaUrlPaginaFacebookAction`: `requireRuolo(["ADMIN", "DIRIGENTE"])`, **non** l'ADMIN-only di `salvaEmailSegreteriaAction` — l'epica dice esplicitamente "Editabili da Admin/Dirigente").
  - [x] Validazione per campo (ognuno indipendentemente opzionale — stringa vuota = rimuovi quel campo, esattamente come `emailSegreteria`/`urlPaginaFacebook`):
    - `indirizzoSede`: solo limite di lunghezza, **nessun formato imposto** (indirizzo è testo libero) — max 300 caratteri.
    - `telefonoPubblico`: max 30 caratteri, formato permissivo `/^[0-9+\-\s().\/]+$/` (cifre, spazi, `+ - ( ) . /`) — nessun precedente di validazione telefono esiste nel progetto, questo è il primo; stesso livello di rigore già accettato per `FORMATO_EMAIL` (scarta solo valori chiaramente non plausibili, non una validazione E.164 completa).
    - `emailPubblica`: mirror esatto di `FORMATO_EMAIL`/`LUNGHEZZA_MASSIMA_EMAIL` (254 caratteri, stesso regex) già in `actions.ts` per `emailSegreteria` — **campo distinto**, non riusare/sovrascrivere `emailSegreteria` (AC #4: l'email Segreteria interna non va mai esposta qui).
  - [x] Ogni campo validato **indipendentemente**: un errore su un solo campo (es. email malformata) blocca l'intero submit (nessun salvataggio parziale) e riporta il messaggio d'errore specifico — stesso principio fail-closed già in uso nelle action esistenti.
  - [x] `revalidatePath("/app/impostazioni")` dopo il salvataggio (mirror esatto).

- [x] Task 3: Sezione form "Contatti pubblici" su `/app/impostazioni` (AC: #1)
  - [x] Nuovo `app/app/(configurazione)/impostazioni/ContattiPubbliciForm.tsx` — un solo form con 3 campi (`indirizzoSede` testo, `telefonoPubblico` `type="tel"`, `emailPubblica` `type="email"`) e un solo pulsante "Salva", mirror strutturale di `EmailSegreteriaForm.tsx`/`PaginaFacebookForm.tsx` (`useActionState`, stessi blocchi errore/successo, stesse classi `impostazioni.module.css`).
  - [x] `app/app/(configurazione)/impostazioni/page.tsx`: aggiungere `leggiContattiPubblici()` al `Promise.all` esistente (stesso pattern fail-soft `.catch(() => null)` già usato per `emailSegreteria`/`urlPaginaFacebook`), nuova sezione `<h2>Contatti pubblici</h2>` + `<ContattiPubbliciForm />` sotto la sezione "Pagina Facebook" esistente. Nessun avviso soft "non configurato" per questi campi (a differenza di `emailSegreteria`/`urlPaginaFacebook`, che bloccano un comportamento a valle se assenti — qui l'assenza è semplicemente "quel campo non compare su `/contatti`", già comunicato dall'AC #2/#3, non serve un secondo avviso ridondante in Admin).

- [x] Task 4: Nuova pagina pubblica `/contatti` — **sostituire**, non estendere, il placeholder (AC: #2, #4)
  - [x] **Sostituire interamente** `app/contatti/page.tsx` (oggi 20 righe, monta solo `<HeaderPubblico />` + `<InSviluppoPubblico titolo="Contatti" />` + `<FooterPubblico />`). Il commento sorgente dice esplicitamente "sostituire con la pagina reale quando la Story 18.11 verrà implementata, non estendere questo file" — rimuovere completamente l'import e l'uso di `InSviluppoPubblico`.
  - [x] `export const dynamic = "force-dynamic"` (mantenuto identico al placeholder).
  - [x] Leggere `leggiContattiPubblici()` **e** `leggiUrlPaginaFacebook()` (funzione già esistente, Story 18.5 `done` — vedi Dev Notes "Il campo social esiste già: `urlPaginaFacebook`") in `Promise.all`, ciascuna con `.catch()` fail-soft che ritorna `null`/`{indirizzoSede:null,...}`.
  - [x] Markup: `<HeaderPubblico />`, `<main>` con `<h1>Contatti</h1>` + blocco `contact-block`, `<FooterPubblico />` — **nessun** `conSpazioCookieBanner`/`<CookieBanner>` (stessa scelta già fatta per `/squadre`/`/calendario`/`/staff`).
  - [x] Rendering **campo per campo, indipendentemente condizionale** (AC #2): ogni campo (`indirizzoSede`, `telefonoPubblico`, `emailPubblica`, link social se `urlPaginaFacebook` presente) compare **solo se valorizzato** — nessuna etichetta orfana, nessun testo "non disponibile"/"-" al posto del valore mancante. Vedi Dev Notes "La regola più facile da violare" per un esempio esplicito corretto/sbagliato.
  - [x] Campo email: se presente, reso anche come `<a href="mailto:...">`. Campo telefono: se presente, reso anche come `<a href="tel:...">` (normalizzare rimuovendo spazi per l'`href`, mostrare il valore così com'è salvato nel testo visibile). Campo indirizzo: solo testo (nessun link — nessuna integrazione mappa richiesta da questa storia, a differenza di `costruisciLinkNaviga` usato per le palestre in `/calendario`, dominio diverso).
  - [x] Link social: se `urlPaginaFacebook` è presente, un'icona/link verso la Pagina Facebook (`target="_blank" rel="noopener noreferrer"`) — **link diretto alla pagina**, non l'embed/widget della home (Story 18.5, dominio diverso: quello mostra gli ultimi post incorporati, questo è solo un collegamento in uscita).

- [x] Task 5: Stato vuoto esplicito (AC: #3)
  - [x] Quando **nessuno dei 4 campi** (`indirizzoSede`, `telefonoPubblico`, `emailPubblica`, `urlPaginaFacebook`) è configurato → messaggio esplicito al posto del blocco `contact-block`, testo proposto: **"Nessun contatto pubblico configurato al momento."** (coerente col tono diretto di `EXPERIENCE.md` → Voce e Tono). Vedi Dev Notes per la conferma che il campo social è incluso nel conteggio "nessun campo".
  - [x] Estrarre la condizione di stato vuoto in una funzione pura testabile (vedi Task 7 — soddisfa la richiesta di test sul "rendering condizionale" senza introdurre un test di rendering JSX, convenzione assente in questo progetto per le pagine pubbliche).

- [x] Task 6: Stile "Poster Sportivo" — componente `contact-block` (`DESIGN.md`/`EXPERIENCE.md`, 2026-08-13) applicato dall'inizio — nessun AC numerato dedicato, ma requisito esplicito di questa storia (stesso principio già applicato in Story 18.9/18.10, vedi Dev Notes "Perché questa pagina va stilizzata subito")
  - [x] Nuovo `app/contatti/contatti.module.css` (un modulo per pagina, convenzione consolidata).
  - [x] `<h1>Contatti</h1>`: `typography.display-section` (40px/900 desktop) con `typography.display-section-mobile` (22px/900 sotto i 900px) — citato esplicitamente come `heading-typography`/`heading-typography-mobile` in `DESIGN.md.components.contact-block`.
  - [x] Contenitore `contact-block`: `background: #F2F5F7` (`{colors.grigio-chiaro}`), `padding: 32px 24px` (`{spacing.8} {spacing.6}`).
  - [x] Per ogni campo configurato: etichetta sopra il valore — etichetta `font-family: Arial,sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 1.5px` (`{typography.label-tag}`), `color: #5B6472` (`{colors.grigio}`); valore `font-family: Arial,sans-serif; font-size: 14px; font-weight: 400; line-height: 1.8` (`{typography.body}`), `color: #0B0E14` (`{colors.nero}`).
  - [x] Link social (se presente): cerchio (`border-radius: 9999px`, `{rounded.full}`), area cliccabile reale minimo 44×44px anche se la resa visiva è più piccola (mirror esplicito di `components.footer.social-icon-hit-area`, citato testualmente da `DESIGN.md.components.contact-block.social-icon-hit-area`: "stesso vincolo 44px di `components.footer.social-icon-hit-area`") — vedi Dev Notes "Icona social: nessun token colore proprio in `contact-block`" per i colori esatti da riusare da `components.footer`. Contorno di focus `2px solid #FFFFFF` (`{colors.focus-ring-chiaro}`, stessa regola contestuale "scuro→bianco" già applicata a `header-nav`/`footer`).
  - [x] Link `mailto:`/`tel:` dentro il blocco: nessun contorno di focus dedicato diverso dal default del browser non è ammissibile — applicare `2px solid #0072A3` (`{colors.focus-ring}`, valore per sfondi chiari `{colors.bianco}`/`{colors.grigio-chiaro}`, citato in `DESIGN.md.components.button-primary.focus-outline` come regola contestuale generale del sistema) dato che questi link vivono su `{colors.grigio-chiaro}`.
  - [x] Nessun custom property CSS per la palette "Poster Sportivo" in `app/globals.css` — stessa decisione già presa in Story 18.9/18.10: valori hex letterali dentro `contatti.module.css`, ciascuno annotato con un commento che cita il nome esatto del token `DESIGN.md` (vedi Dev Notes "Convenzione hex-con-commento"). Nessuno dei colori usati qui (`#F2F5F7`, `#5B6472`, `#0B0E14`, `#FFFFFF`, `#0072A3`) ha un corrispondente identico in `globals.css` — tutti hex letterali commentati.

- [x] Task 7: Test Vitest (AC: tutti)
  - [x] `lib/configurazione-applicazione.test.ts`: nuovi `describe("leggiContattiPubblici")`/`describe("salvaContattiPubblici")` — mirror strutturale dei blocchi esistenti per `leggiUrlPaginaFacebook`/`salvaUrlPaginaFacebook` (stesso `findUniqueMock`/`upsertMock`, casi: valori presenti, riga assente, valori `null`, upsert con tutti e 3 i campi, upsert con un sottoinsieme `null`).
  - [x] `app/app/(configurazione)/impostazioni/actions.test.ts`: nuovo `describe("salvaContattiPubbliciAction (Server Action)")` — mirror dei casi già coperti per `salvaUrlPaginaFacebookAction`: FORBIDDEN (verificare `requireRuoloMock` chiamato con `["ADMIN", "DIRIGENTE"]`), salvataggio con trim, singolo campo lasciato vuoto → quel campo `null` (mentre gli altri due restano quelli forniti — **non** un test "tutti vuoti = tutti null" soltanto, serve anche il caso misto per verificare che i 3 campi sono indipendenti), VALIDATION per email malformata/oltre 254 caratteri, VALIDATION per telefono con caratteri non ammessi, VALIDATION per indirizzo oltre 300 caratteri, INTERNAL fail-closed quando `salvaContattiPubblici` lancia.
  - [x] Nuova funzione pura `nessunContattoPubblicoConfigurato(contatti: { indirizzoSede: string | null; telefonoPubblico: string | null; emailPubblica: string | null; urlPaginaFacebook: string | null }): boolean` in `lib/configurazione-applicazione.ts` (o file dedicato, a discrezione dello sviluppo — vedi Dev Notes), usata da `app/contatti/page.tsx` per il ramo Task 5 **e** testata direttamente: tutti e 4 null/vuoti → `true`; un solo campo valorizzato (a turno, tutti e 4 i casi) → `false`; tutti valorizzati → `false`. Questo soddisfa la richiesta di test sul "rendering condizionale" (vedi Dev Notes) restando coerente con la convenzione consolidata "nessun test diretto su un componente di rendering di pagina pubblica" (nessun test JSX su `app/contatti/page.tsx` stesso, stesso limite già accettato per `app/squadre/page.tsx`, `app/calendario/page.tsx`, `app/staff/page.tsx`).
  - [x] `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` puliti.

## Dev Notes

### Decisioni di analisi (vedi `epics.md#Epic 18`, Story 18.11)

- **Dipendente da Story 18.1** (done, home pubblica + `/app`) **e 18.7** (done — `/contatti` è già raggiungibile dal menu pubblico **e già in `PUBLIC_ROUTES`**, `lib/auth/route-guard.ts` righe 40-50). **Questa storia non deve toccare `lib/auth/route-guard.ts`** — verificato in analisi, la voce `"/contatti"` è già presente (riga 49). L'`/app/impostazioni` (lato Admin) è già una rotta protetta esistente — nessuna modifica di route-guard necessaria neanche lì.
- **Questa storia ha due metà distinte**, entrambe coperte dai 4 AC:
  1. **Lato Admin/Dirigente** (AC #1): 3 nuovi campi nullable su `ConfigurazioneApplicazione`, editabili da `/app/impostazioni` — stesso singleton no-RLS già esistente (AD-9), stesso posto dove vive già `emailSegreteria` (Story 9.31) e `urlPaginaFacebook` (Story 18.5).
  2. **Lato pubblico** (AC #2, #3, #4): nuova pagina `/contatti`, sola lettura, rendering condizionale campo-per-campo.
- **Nomi campo**: l'epica propone `indirizzoSede`, `telefonoPubblico`, `emailPubblica` — **confermati** in analisi (nessuna divergenza trovata, nessun campo con nome simile già esistente sul modello che avrebbe richiesto un nome diverso per evitare collisione).

### Story 18.5 è `done` — il campo social `urlPaginaFacebook` esiste già

Verificato direttamente (non assunto) in `prisma/schema.prisma` (riga 351-355) e in `sprint-status.yaml` (`18-5-post-social-home: done`): `ConfigurazioneApplicazione.urlPaginaFacebook` esiste già, con `leggiUrlPaginaFacebook()`/`salvaUrlPaginaFacebook()` già in `lib/configurazione-applicazione.ts` e un form dedicato (`PaginaFacebookForm.tsx`) già su `/app/impostazioni`. L'epica dice: *"più i link social già eventualmente configurati per la Story 18.5, se quella storia è già stata implementata"* — **è già implementata**, quindi `/contatti` **deve** riusare questo campo esistente (Task 4) invece di introdurne uno nuovo. **Nessuna nuova colonna social da aggiungere in questa storia** — solo lettura del campo esistente, nessuna modifica a `lib/embed-facebook.ts`/`PaginaFacebookForm.tsx`/alla Server Action Story 18.5 (`salvaUrlPaginaFacebookAction` resta invariata).

Distinzione importante: l'**embed** di Story 18.5 (`costruisciLinkPaginaFacebookIncorporata`, widget "ultimi post" mostrato in home) è un uso **diverso** dallo stesso campo `urlPaginaFacebook` su `/contatti` (qui serve solo come **link diretto in uscita** verso la pagina, non un widget incorporato) — non riusare `lib/embed-facebook.ts` su questa pagina, basta un `<a href={urlPaginaFacebook}>`.

### Una funzione combinata, non 3 funzioni separate — deviazione motivata dal pattern granulare esistente

Il pattern esistente (`nomeSettore`, `emailSegreteria`, `urlPaginaFacebook`) è 1 funzione `leggiX`/`salvaX` per campo, perché ogni campo è arrivato in una storia diversa con un proprio form/Server Action indipendente. Qui i 3 campi (`indirizzoSede`/`telefonoPubblico`/`emailPubblica`) arrivano **insieme**, in un'unica storia, e l'AC #1 li descrive come un'unica azione di compilazione ("compila indirizzo/telefono/email pubblici... i valori vengono salvati"). Scelta di design per questa storia: **una** `leggiContattiPubblici()`/**una** `salvaContattiPubblici(valori)` che operano sui 3 campi insieme in un solo upsert (invece di 3 upsert sequenziali), stesso principio "atomico sull'id fisso, no read-then-branch" già documentato per `salvaNomeSettore` — qui esteso a un oggetto con più chiavi:

```ts
export async function leggiContattiPubblici(): Promise<{
  indirizzoSede: string | null;
  telefonoPubblico: string | null;
  emailPubblica: string | null;
}> {
  const configurazione = await prisma.configurazioneApplicazione.findUnique({
    where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
    select: { indirizzoSede: true, telefonoPubblico: true, emailPubblica: true },
  });
  return {
    indirizzoSede: configurazione?.indirizzoSede ?? null,
    telefonoPubblico: configurazione?.telefonoPubblico ?? null,
    emailPubblica: configurazione?.emailPubblica ?? null,
  };
}

export async function salvaContattiPubblici(valori: {
  indirizzoSede: string | null;
  telefonoPubblico: string | null;
  emailPubblica: string | null;
}): Promise<void> {
  await prisma.configurazioneApplicazione.upsert({
    where: { id: ID_CONFIGURAZIONE_APPLICAZIONE },
    create: { id: ID_CONFIGURAZIONE_APPLICAZIONE, ...valori },
    update: valori,
  });
}
```

Un solo form su `/app/impostazioni` con un solo pulsante "Salva" (`ContattiPubbliciForm.tsx`) invece di 3 mini-form separati — più coerente con l'uso reale (un Admin compila indirizzo/telefono/email nella stessa sessione) ed evita 3 round-trip DB sequenziali con rischio di scrittura parziale se uno fallisce a metà.

### La regola più facile da violare — "nessun campo mai mostrato come non disponibile"

`EXPERIENCE.md` → Pattern dei Componenti lo dice esplicitamente: *"Ogni campo (indirizzo, telefono, email, social) è indipendentemente opzionale: un campo mai configurato **non renderizza nulla**, non un placeholder 'non disponibile'."* Questo significa:

- **Corretto**: `{telefonoPubblico && <div><span className={styles.label}>Telefono</span><a href={`tel:${telefonoPubblico}`}>{telefonoPubblico}</a></div>}` — l'intero blocco (etichetta + valore) sparisce se il campo è `null`.
- **Sbagliato**: renderizzare sempre l'etichetta "Telefono" e mostrare `telefonoPubblico ?? "Non disponibile"` (o una stringa vuota, o un trattino) al posto del valore — questo è esattamente il pattern che l'AC #2 e `EXPERIENCE.md` vietano. Un dev agent che applica meccanicamente un pattern "campo con fallback" (comune in altre form-rendering di questo progetto, es. badge di stato) violerebbe l'AC qui.

Un Allenatore/Admin che rimuove un valore già salvato (torna a stringa vuota nel form Admin) deve far **sparire** quel campo da `/contatti` alla successiva visita, non farlo comparire vuoto — comportamento già garantito per costruzione dal salvataggio `null` (Task 2) + rendering condizionale (Task 4).

### Stato vuoto: include il campo social nel conteggio "nessun campo"

`EXPERIENCE.md` → Pattern dei Componenti elenca esplicitamente **4** campi nella riga `contact-block` — "indirizzo, telefono, email, **social**" — come ugualmente opzionali sotto la stessa regola. La riga "Pattern di Stato" per Contatti dice: *"Messaggio esplicito, solo se letteralmente nessun campo esiste"* — "nessun campo" qui include il social, non solo i 3 campi introdotti direttamente da questa storia. **Decisione presa per questa storia**: la condizione di stato vuoto (Task 5) è `!indirizzoSede && !telefonoPubblico && !emailPubblica && !urlPaginaFacebook` — tutti e 4, non solo i 3 nuovi. Questo è coerente anche con l'esperienza del Visitatore descritta in `EXPERIENCE.md` → riga 168 ("se la sezione Contatti non ha ancora alcun campo configurato... vede un messaggio esplicito"): un sito con solo la Pagina Facebook configurata e nient'altro **non** deve mostrare "nessun contatto configurato" (ha comunque un modo di essere raggiunto), quindi il social conta come un campo a pieno titolo.

### Icona social: nessun token colore proprio in `contact-block` — riuso esplicito da `components.footer`

`DESIGN.md.components.contact-block` definisce solo `social-icon-shape` (`{rounded.full}`) e `social-icon-hit-area` ("stesso vincolo 44px di `components.footer.social-icon-hit-area`") — **non** definisce colori/hover/focus propri per l'icona social dentro `contact-block`. `components.footer`, però, **non ha ancora un'implementazione reale nel codice** (`app/FooterPubblico.tsx` oggi mostra solo il copyright, nessuna icona social montata — verificato in analisi) nonostante i suoi token esistano già in `DESIGN.md`. Per questa storia, che deve comunque rendere un'icona/link social su `/contatti` **oggi**, l'inferenza più diretta e meno rischiosa è riusare **letteralmente** i valori del token `components.footer` (`social-icon-background: {colors.placeholder-hatch-alt}` `#1C2433`, `social-icon-color: {colors.azzurro}` `#00A3E0`, `social-icon-hover-background: {colors.azzurro}`, `social-icon-hover-color: {colors.nero}`, `social-icon-visual-size: 38px`, `social-icon-focus-outline: 2px solid {colors.focus-ring-chiaro}, offset 2px`) — **segnalato come inferenza esplicita**, non un token citato letteralmente per `contact-block` in `DESIGN.md`. Nessuna libreria di icone: iniziale testuale "F" dentro il cerchio (stessa convenzione "nessun webfont/icon-library" già stabilita per `footer`).

### Convenzione hex-con-commento — nessun custom property nuovo in `app/globals.css`

Stessa decisione già presa in Story 18.9/18.10, da riapplicare identica qui: `app/globals.css` contiene solo i token del DESIGN.md 2026-07-22 del portale interno (`--color-text-primary: #101820`, diverso da `{colors.nero}` `#0B0E14` di questo documento) — nessuno dei colori usati da `contact-block` (`#F2F5F7`, `#5B6472`, `#0B0E14`, `#FFFFFF`, `#0072A3`, `#1C2433`, `#00A3E0`) coincide con un valore già presente in `globals.css`. Tutti vanno scritti come hex letterali dentro `contatti.module.css`, ciascuno annotato con un commento che cita il nome esatto del token `DESIGN.md` — **non** aggiungere nuovi custom property a `app/globals.css` (mescolerebbe due vocabolari di token nello stesso scope globale).

### Perché questa pagina va stilizzata "Poster Sportivo" subito, non rimandata a Story 18.12

Story 18.12 applica il registro visivo **solo** a `/` e `/squadre` — le uniche pagine pubbliche già `done` prima che `DESIGN.md`/`EXPERIENCE.md` (2026-08-13) fossero completati e marcati `status: final`. `/contatti` (questa storia) è ancora in backlog al momento in cui il registro esiste già: va costruita direttamente nello stile finale, come già fatto per `/calendario` (Story 18.9) e `/staff` (Story 18.10). `DESIGN.md.components.contact-block` è stato **aggiunto durante la rubric review** della sessione UX proprio perché `/contatti` non aveva ancora alcuna specifica visiva nonostante fosse nello scope.

### `app/contatti/page.tsx` va SOSTITUITO, non esteso

Il file esiste già (creato durante la code review di Story 18.7 come stopgap). Il suo stesso commento sorgente dice esplicitamente: *"sostituire con la pagina reale quando la Story 18.11 verrà implementata, non estendere questo file"*. Riscrivere interamente il file (nuovo `export default async function ContattiPage()`), rimuovere del tutto l'import e l'uso di `InSviluppoPubblico`.

### Nessun dato riservato esposto (AC #4)

`select` esplicito su `leggiContattiPubblici()` (Task 2) limitato a `indirizzoSede`/`telefonoPubblico`/`emailPubblica` — non tocca mai `emailSegreteria` (dato interno, Story 9.31) né alcun campo di `Utente`/credenziali. `leggiUrlPaginaFacebook()` riusata invariata non introduce nuovi rischi (già pubblica dalla Story 18.5, mostrata in home). Nessuna sessione/`createClient()` necessaria in `/contatti`: `ConfigurazioneApplicazione` non è protetta da RLS (AD-9), Prisma diretto.

### Pattern da riusare (non reinventare)

- **Singleton `ConfigurazioneApplicazione`, upsert atomico su id fisso**: `lib/configurazione-applicazione.ts` — `ID_CONFIGURAZIONE_APPLICAZIONE`, pattern `leggiX`/`salvaX`.
- **Server Action Admin/Dirigente con `requireRuolo(["ADMIN","DIRIGENTE"])`**: `salvaUrlPaginaFacebookAction` (`app/app/(configurazione)/impostazioni/actions.ts`) — perimetro esatto da mirrorare per `salvaContattiPubbliciAction` (non l'ADMIN-only di `salvaEmailSegreteriaAction`).
- **Form `useActionState` con blocchi errore/successo**: `EmailSegreteriaForm.tsx`/`PaginaFacebookForm.tsx` — mirror strutturale per `ContattiPubbliciForm.tsx`.
- **Validazione URL con `new URL()` + whitelist protocollo**: `urlPaginaFacebookValido` (`actions.ts`, righe 78-86) — non serve per questa storia (nessun nuovo campo URL), citato solo come precedente di rigore per un'eventuale validazione futura.
- **`HeaderPubblico`/`FooterPubblico` self-contained, nessun prop di dati**: `app/HeaderPubblico.tsx`/`app/FooterPubblico.tsx` — montare senza `conSpazioCookieBanner`.
- **Messaggio esplicito invece di area vuota per l'intera pagina**: `app/squadre/page.tsx`, `app/calendario/page.tsx`, `app/staff/page.tsx` — stesso principio applicato qui.
- **Un CSS module per pagina**: `app/contatti/contatti.module.css` segue la stessa convenzione di `app/calendario/calendario.module.css`/`app/staff/staff.module.css`.

### AGENTS.md — Next.js non standard

Questo progetto usa una versione di Next.js con differenze rispetto al training data (`AGENTS.md`, root del repo): prima di scrivere codice di routing/parametri, consultare `node_modules/next/dist/docs/`. **Non applicabile in modo sostanziale a questa storia**: né `app/contatti/page.tsx` né `app/app/(configurazione)/impostazioni/page.tsx` hanno segmenti dinamici (`[id]`) o `searchParams` — stessa conclusione già raggiunta per Story 18.9/18.10. Le Server Action seguono `useActionState` (già in uso identico in `EmailSegreteriaForm.tsx`/`PaginaFacebookForm.tsx`), nessun pattern nuovo da verificare nei doc vendored.

### Project Structure Notes

- Nuovi: `prisma/migrations/<timestamp>_add_contatti_pubblici/migration.sql`, `app/contatti/contatti.module.css`, `app/app/(configurazione)/impostazioni/ContattiPubbliciForm.tsx`.
- Modificati: `prisma/schema.prisma` (3 nuovi campi su `ConfigurazioneApplicazione`), `lib/configurazione-applicazione.ts` (nuove `leggiContattiPubblici`/`salvaContattiPubblici`/`nessunContattoPubblicoConfigurato`), `lib/configurazione-applicazione.test.ts`, `app/app/(configurazione)/impostazioni/actions.ts` (nuova Server Action), `app/app/(configurazione)/impostazioni/actions.test.ts`, `app/app/(configurazione)/impostazioni/page.tsx` (nuova sezione), `app/contatti/page.tsx` (sostituisce interamente il contenuto placeholder, stesso path).
- Nessuna modifica a `lib/auth/route-guard.ts` (rotte già pubblica/protetta rispettivamente), nessuna modifica a `lib/embed-facebook.ts`/`PaginaFacebookForm.tsx`/`salvaUrlPaginaFacebookAction` (Story 18.5, riusati invariati), nessuna modifica a `app/globals.css` (nessun nuovo custom property).
- Allineamento con la struttura di progetto: `app/contatti/` segue lo stesso pattern piatto già usato da `app/squadre/`/`app/calendario/`/`app/staff/` (nessun route group, pagina pubblica diretta sotto `app/`); `app/app/(configurazione)/impostazioni/` resta il route group autenticato esistente (Epic 9/17), nessuna nuova pagina di configurazione separata (l'epica lo scoraggia esplicitamente: "per non introdurre un'ennesima pagina di configurazione separata per pochi campi").

### References

- [Source: epics.md#Epic 18: Sito pubblico Settore Volley, Story 18.11] — testo originale di User Story e AC, proposta nomi campo, nota "editabili da Admin/Dirigente... `/app/impostazioni`, stesso posto dove vive già `emailSegreteria`".
- [Source: prisma/schema.prisma, righe 343-360] — `model ConfigurazioneApplicazione` esistente, campi `nomeSettore`/`emailSegreteria`/`urlPaginaFacebook` già presenti (conferma diretta che Story 18.5 è implementata), commento "Non protetta da RLS (AD-9)".
- [Source: lib/configurazione-applicazione.ts] — pattern `leggiX`/`salvaX` su `ID_CONFIGURAZIONE_APPLICAZIONE`, upsert atomico, da estendere con `leggiContattiPubblici`/`salvaContattiPubblici`.
- [Source: lib/configurazione-applicazione.test.ts] — mirror esatto dei blocchi di test da riprodurre per i nuovi campi.
- [Source: app/app/(configurazione)/impostazioni/actions.ts] — `salvaEmailSegreteriaAction` (ADMIN-only) vs `salvaUrlPaginaFacebookAction` (`["ADMIN","DIRIGENTE"]`, perimetro da mirrorare qui), `FORMATO_EMAIL`/`LUNGHEZZA_MASSIMA_EMAIL`, `urlPaginaFacebookValido`.
- [Source: app/app/(configurazione)/impostazioni/actions.test.ts] — mirror esatto dei casi di test (FORBIDDEN, trim, stringa vuota → null, VALIDATION, INTERNAL fail-closed, confini esatti di lunghezza).
- [Source: app/app/(configurazione)/impostazioni/EmailSegreteriaForm.tsx, PaginaFacebookForm.tsx, page.tsx, impostazioni.module.css] — mirror strutturale form/hub/CSS per `ContattiPubbliciForm.tsx` e la nuova sezione su `page.tsx`.
- [Source: app/contatti/page.tsx] — placeholder esistente da sostituire, commento sorgente "non estendere questo file".
- [Source: app/InSviluppoPubblico.tsx] — motivo del placeholder, elenco esplicito `/calendario`/`/staff`/`/contatti` come pagine ancora coperte al momento della sua scrittura.
- [Source: app/squadre/page.tsx, app/FooterPubblico.tsx] — composizione `HeaderPubblico`/`FooterPubblico` senza `conSpazioCookieBanner`, pattern `select` esplicito, messaggio esplicito per pagina interamente vuota; conferma diretta che `FooterPubblico.tsx` non monta ancora alcuna icona social nel codice reale (solo copyright).
- [Source: lib/embed-facebook.ts] — `costruisciLinkPaginaFacebookIncorporata`, uso per l'embed home (Story 18.5) — **non** da riusare su `/contatti` (qui serve solo un link diretto in uscita).
- [Source: prisma/migrations/20260806000000_add_email_segreteria/migration.sql, 20260813010000_add_url_pagina_facebook/migration.sql] — mirror esatto per la nuova migrazione (colonna nullable, nessun GRANT).
- [Source: ux-designs/ux-societa-manager-2026-08-13/DESIGN.md#components.contact-block, #components.footer (social-icon-*), #Colori, #Tipografia, righe 282-292, 397] — token esatti del componente `contact-block` (background, padding, label/value typography+color, social-icon-shape/hit-area, heading-typography/-mobile), nota di rubric review sull'aggiunta del componente, token icona social riusati da `footer` per inferenza esplicita.
- [Source: ux-designs/ux-societa-manager-2026-08-13/EXPERIENCE.md#Architettura dell'Informazione (riga 32), #Pattern dei Componenti (riga 71, "ogni campo indipendentemente opzionale... social incluso"), #Pattern di Stato (riga 97), #Soglia di Accessibilità (44px, focus-visible), riga 165-168 (percorso utente Davide)] — riga "Contatti" della tabella IA, regola di rendering condizionale campo-per-campo con social incluso, stato vuoto "solo se letteralmente nessun campo esiste", esempio narrativo del Visitatore che chiama la segreteria.
- [Source: epics.md#Epic 18, Story 18.12] — conferma esplicita che il restyling retroattivo copre solo Home e Squadre, non Calendario/Staff/Contatti (queste ultime vanno costruite già nello stile finale).
- [Source: AGENTS.md, root del repo] — nota su Next.js non standard rispetto al training data (non sostanzialmente applicabile, nessun segmento dinamico in questa storia).
- [Source: _bmad-output/planning-artifacts/architecture/architecture-societa-manager-2026-07-13/ARCHITECTURE-SPINE.md#AD-9] — `ConfigurazioneApplicazione` non protetta da RLS, Prisma diretto con connessione privilegiata; nessuna cartella `lib/` nuova richiesta da questa storia (estende `lib/configurazione-applicazione.ts` esistente).
- [Source: _bmad-output/implementation-artifacts/18-9-pagina-calendario.md, 18-10-pagina-staff.md, Dev Notes] — convenzione hex-con-commento senza nuovi custom property in `app/globals.css`, motivazione "stilizzare subito, non rimandare a 18.12", pattern "sostituire non estendere" il placeholder, convenzione "nessun test diretto su componenti di rendering di pagina pubblica".
- [Source: _bmad-output/implementation-artifacts/18-8-pagina-squadre.md] — pattern `select` vs `include`, `HeaderPubblico`/`FooterPubblico` self-contained.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

Nessuno — implementazione lineare. Verificato direttamente `prisma/schema.prisma` e `sprint-status.yaml` per confermare che Story 18.5 (`urlPaginaFacebook`) fosse davvero già `done` prima di riusarla (come richiesto dai Dev Notes), non assunto.

### Completion Notes List

- **Migrazione**: `prisma/migrations/20260814000000_add_contatti_pubblici/migration.sql` — 3 colonne nullable (`indirizzoSede`, `telefonoPubblico`, `emailPubblica`), mirror esatto di `20260813010000_add_url_pagina_facebook`. `prisma/schema.prisma` aggiornato, `npx prisma generate` eseguito per rigenerare i tipi. Nessuna migrazione applicata al DB in questo sandbox (nessun accesso Supabase) — da applicare in produzione come le precedenti.
- **Dati**: `leggiContattiPubblici`/`salvaContattiPubblici` (una funzione combinata sui 3 campi insieme, non 3 separate — decisione motivata nei Dev Notes) e `nessunContattoPubblicoConfigurato` (funzione pura, include il campo social nel conteggio) aggiunte a `lib/configurazione-applicazione.ts`.
- **Server Action**: `salvaContattiPubbliciAction` in `actions.ts`, perimetro `requireRuolo(["ADMIN", "DIRIGENTE"])` (non l'ADMIN-only di `salvaEmailSegreteriaAction`). Validazione indipendente per campo: indirizzo solo lunghezza (300), telefono formato permissivo + lunghezza (30), email mirror di `FORMATO_EMAIL`/254 caratteri già esistente. Un errore su un campo blocca l'intero submit.
- **Form Admin**: `ContattiPubbliciForm.tsx`, un solo form/pulsante per i 3 campi, montato su `/app/impostazioni` sotto la sezione Pagina Facebook esistente — nessun avviso soft (decisione esplicita nei Dev Notes, l'assenza è già comunicata dall'AC #2/#3 lato pubblico).
- **Pagina pubblica**: `app/contatti/page.tsx` riscritto interamente (rimosso `InSviluppoPubblico`). Rendering campo-per-campo indipendentemente condizionale (AC #2) — nessuna etichetta orfana, nessun "non disponibile". Email/telefono resi anche come `mailto:`/`tel:`. Link social riusa `leggiUrlPaginaFacebook()` esistente (Story 18.5, invariata) come link diretto in uscita, non l'embed della home.
- **Stato vuoto** (AC #3): condizione su tutti e 4 i campi (3 nuovi + social), non solo i 3 introdotti da questa storia — coerente con `EXPERIENCE.md`.
- **AC #4 verificato per ispezione**: `select` di `leggiContattiPubblici` limitato a `indirizzoSede`/`telefonoPubblico`/`emailPubblica`, non tocca mai `emailSegreteria` né alcun campo `Utente`.
- **Stile "Poster Sportivo"**: nuovo `app/contatti/contatti.module.css`, componente `contact-block` (etichetta/valore, icona social 44px hit-area, focus contestuale bianco su icona/blu su link chiari) — stessa convenzione hex-con-commento di `/calendario`/`/staff`.
- **Guida in-app** (regola permanente del progetto): contenuto di `/app/impostazioni` in `lib/guida/contenuti.ts` aggiornato per menzionare sia Pagina Facebook (gap pre-esistente da Story 18.5, colmato qui) sia i nuovi Contatti pubblici.
- **Test**: 22 nuovi test — `lib/configurazione-applicazione.test.ts` (`leggiContattiPubblici`/`salvaContattiPubblici`/`nessunContattoPubblicoConfigurato`), `actions.test.ts` (`salvaContattiPubbliciAction`: FORBIDDEN, salvataggio con trim, tutti vuoti, caso misto con un solo campo indipendente, VALIDATION per ciascun campo, formato telefono valido, INTERNAL fail-closed). Nessun test diretto su `app/contatti/page.tsx` (convenzione consolidata).
- Verifica: `npx tsc --noEmit` pulito, `npx vitest run` 1135/1135 passati (1113 + 22 nuovi, nessuna regressione), `npm run lint` 0 errori (11 warning pre-esistenti in file non toccati), `npm run build` riuscito (`/contatti` presente nell'output come rotta dinamica `ƒ`).

### File List

- `prisma/schema.prisma` (3 nuovi campi su `ConfigurazioneApplicazione`)
- `prisma/migrations/20260814000000_add_contatti_pubblici/migration.sql` (nuovo)
- `lib/configurazione-applicazione.ts` (nuove `leggiContattiPubblici`/`salvaContattiPubblici`/`nessunContattoPubblicoConfigurato`)
- `lib/configurazione-applicazione.test.ts` (nuovi test)
- `app/app/(configurazione)/impostazioni/actions.ts` (nuova `salvaContattiPubbliciAction`)
- `app/app/(configurazione)/impostazioni/actions.test.ts` (nuovi test)
- `app/app/(configurazione)/impostazioni/ContattiPubbliciForm.tsx` (nuovo)
- `app/app/(configurazione)/impostazioni/page.tsx` (nuova sezione)
- `app/contatti/page.tsx` (sostituito interamente)
- `app/contatti/contatti.module.css` (nuovo)
- `lib/guida/contenuti.ts` (contenuto `/app/impostazioni` aggiornato)

## Change Log

- 2026-08-14: Implementazione completa (Task 1-7), tutti gli AC soddisfatti, Status → review.
