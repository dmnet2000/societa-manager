---
title: 'Story 18.29: Link Instagram configurabile'
type: 'feature'
created: '2026-09-09'
status: 'done'
review_loop_iteration: 0
context: []
baseline_commit: '8f93123cb9b5d85376734147d2ac8a1aed3fc065'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** il footer pubblico e la pagina `/contatti` mostrano un'icona Facebook (link semplice, `urlPaginaFacebook`) ma nessun equivalente per Instagram - richiesta esplicita dell'utente: aggiungere il link a Instagram, con la relativa configurazione.

**Approach:** mirror esatto del meccanismo già esistente per `urlPaginaFacebook` (campo su `ConfigurazioneApplicazione`, funzioni `leggi`/`salva`, form Admin, Server Action, icona condizionale in footer e `/contatti`) - un nuovo campo `urlPaginaInstagram`, stessa validazione (`urlEsternoValido`, già generica e riusata), stesso perimetro di Ruoli (`ADMIN`, `DIRIGENTE`, `SITE_MANAGER`, come la sola URL di Facebook - non il suo Token).

**Scope esplicitamente confermato con l'utente:** solo un link semplice (icona cliccabile), NON un feed embed - Instagram non ha un equivalente ufficiale gratuito del Facebook Page Plugin senza Token API, decisione già presa con l'utente in Story 18.5 e non riaperta qui. Il link Instagram compare footer + `/contatti` (confermato con l'utente), MAI nella home pubblica (che mostra solo il carosello "ultimi post" di Facebook, Story 18.5/18.13, fuori scope).

## Boundaries & Constraints

**Always:** riusare `urlEsternoValido` (`app/app/(configurazione)/impostazioni/actions.ts`) invariata, nessuna nuova funzione di validazione. Stesso `requireRuolo(["ADMIN", "DIRIGENTE", "SITE_MANAGER"])` di `salvaUrlPaginaFacebookAction` (URL semplice, non un token/embed - nessuna restrizione aggiuntiva rispetto a Facebook). Icona con lo stesso trattamento visivo di `.iconaSocial` (footer e `/contatti`), glifo testuale "IG" (nessuna libreria di icone in questo progetto, stesso principio già in uso per "F" di Facebook). Stringa vuota al salvataggio rimuove la configurazione (stesso principio di ogni altro campo di `ConfigurazioneApplicazione`).

**Ask First:** nessuna prevista (scope già confermato: footer + `/contatti`, non l'home).

**Never:** nessuna modifica alla home pubblica (`app/page.tsx`) né al carosello "ultimi post" Facebook/Token Facebook (Story 18.5/18.13/18.20) - Instagram resta un semplice link cliccabile, mai un feed embed. Nessuna nuova libreria/dipendenza (icona SVG, SDK Instagram, ecc.) - stesso principio "testo come icona" già in uso per Facebook.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Instagram configurato, Facebook non configurato | `urlPaginaInstagram` valorizzato, `urlPaginaFacebook` null | Solo l'icona Instagram compare (footer e `/contatti`) | N/A |
| Entrambi configurati | entrambi valorizzati | Le due icone compaiono affiancate (Facebook poi Instagram, stesso ordine in footer e `/contatti`) | N/A |
| Nessuno dei due configurato | entrambi null | Nessuna icona social compare (comportamento Facebook invariato, esteso a Instagram) | N/A |
| URL Instagram non valido (no http/https, o oltre 500 caratteri) | es. `"instagram.com/x"` senza schema | Errore di validazione al salvataggio, stesso messaggio di Facebook | Messaggio esplicito, nessun salvataggio parziale |
| Campo svuotato e salvato | stringa vuota inviata | Configurazione rimossa (`null`), icona sparisce ovunque | N/A |
| `/contatti`: solo Instagram configurato, nessun altro contatto (indirizzo/telefono/email/Facebook) | tutti gli altri null | La pagina NON mostra "Nessun contatto pubblico configurato" - Instagram conta come campo a pieno titolo (mirror esatto del trattamento già riservato a Facebook, AC #3 di Story 18.11) | N/A |

</frozen-after-approval>

## Code Map

- `prisma/schema.prisma` -- model `ConfigurazioneApplicazione`: nuovo campo `urlPaginaInstagram String?` (mirror `urlPaginaFacebook`, riga ~415), con commento che referenzia questa storia e Story 18.5 (spiega perché non è un feed embed).
- `prisma/migrations/` -- nuova migrazione `ALTER TABLE "configurazioni_applicazione" ADD COLUMN "urlPaginaInstagram" TEXT`.
- `lib/configurazione-applicazione.ts` -- nuove `leggiUrlPaginaInstagram`/`salvaUrlPaginaInstagram` (mirror esatto di `leggiUrlPaginaFacebook`/`salvaUrlPaginaFacebook`); `nessunContattoPubblicoConfigurato` estesa con `urlPaginaInstagram` nella firma e nel check.
- `lib/configurazione-applicazione.test.ts` -- nuovi `describe` mirror per `leggiUrlPaginaInstagram`/`salvaUrlPaginaInstagram`; test di `nessunContattoPubblicoConfigurato` aggiornati per il nuovo campo (5 campi invece di 4).
- `app/app/(configurazione)/impostazioni/actions.ts` -- nuova `salvaUrlPaginaInstagramAction` (mirror `salvaUrlPaginaFacebookAction`, riusa `urlEsternoValido`).
- `app/app/(configurazione)/impostazioni/actions.test.ts` -- nuovi test mirror.
- `app/app/(configurazione)/impostazioni/PaginaInstagramForm.tsx` (nuovo) -- mirror `PaginaFacebookForm.tsx`, SENZA l'avviso "Token potrebbe non corrispondere" (Instagram non ha alcun Token/embed).
- `app/app/(configurazione)/impostazioni/page.tsx` -- nuova sezione "Pagina Instagram" dopo "Pagina Facebook", nessun avviso soft (mirror del trattamento di "Contatti pubblici": l'assenza semplicemente non mostra l'icona, nessun comportamento a valle bloccato).
- `app/FooterPubblico.tsx` -- icona Instagram ("IG") accanto a quella Facebook, stesso trattamento condizionale (`href`, `target="_blank"`, `rel="noopener noreferrer"`, `aria-label` dedicato).
- `app/contatti/page.tsx` -- leggere anche `leggiUrlPaginaInstagram`, icona Instagram nello stesso campo "Social" (Facebook + Instagram affiancate sotto un'unica etichetta).
- `app/contatti/contatti.module.css` -- eventuale wrapper per affiancare le due icone dentro lo stesso `.campo` (oggi ne contiene una sola).

## Tasks & Acceptance

**Execution:**
- [ ] `prisma/schema.prisma` + migrazione -- nuovo campo `urlPaginaInstagram`
- [ ] `lib/configurazione-applicazione.ts` + test -- `leggiUrlPaginaInstagram`/`salvaUrlPaginaInstagram`, `nessunContattoPubblicoConfigurato` esteso
- [ ] `app/app/(configurazione)/impostazioni/actions.ts` + test -- `salvaUrlPaginaInstagramAction`
- [ ] `app/app/(configurazione)/impostazioni/PaginaInstagramForm.tsx` + `page.tsx` -- nuova sezione Admin
- [ ] `app/FooterPubblico.tsx` -- icona Instagram
- [ ] `app/contatti/page.tsx` + CSS -- icona Instagram

**Acceptance Criteria:**
- Given un Admin/Dirigente/Site Manager su `/app/impostazioni`, when imposta un URL Instagram valido, then l'icona Instagram compare nel footer di ogni pagina pubblica e in `/contatti`
- Given un URL Instagram non valido, when viene inviato il form, then il salvataggio è rifiutato con un messaggio esplicito, nessuna configurazione modificata
- Given sia Facebook sia Instagram configurati, when si visita una pagina pubblica, then entrambe le icone compaiono affiancate
- Given solo Instagram configurato e nessun altro contatto, when si apre `/contatti`, then la pagina mostra il campo Social con l'icona Instagram, NON il messaggio "Nessun contatto pubblico configurato"

## Verification

**Commands:**
- `npx prisma validate` -- pulito
- `npx tsc --noEmit` -- pulito
- `npm run lint` -- 0 errori
- `npx vitest run` -- 2067/2067 verdi (+15 rispetto alla baseline)
- `npm run build` -- riuscito (exit 0, "Compiled successfully")

**Review a 3 livelli:** Verification Gap Reviewer non ha trovato gap (test mirror verificati riga per riga contro l'originale Facebook, nessun altro punto del repo avrebbe dovuto essere esteso a Instagram - unica eccezione `app/page.tsx`/carosello Facebook, esplicitamente fuori scope per decisione già presa). Edge Case Hunter ha trovato solo gap preesistenti nel meccanismo Facebook condiviso (`urlEsternoValido` non valida il dominio, nessun `IF NOT EXISTS` nella migrazione) - non introdotti da questa story, ereditati invariati per esplicita richiesta della spec. Blind Hunter ha trovato un falso positivo (il commento di `PaginaInstagramForm.tsx` cita già `SitoPolisportivaForm.tsx` come mirror, contrariamente a quanto affermato) e diversi finding preesistenti/coerenti con convenzioni già accettate (icone testuali invece di loghi ufficiali, nessun test di rendering). 3 finding genuini corretti: `.gruppoSocial` in `/contatti` aveva un `flex-direction: row` ridondante (rimosso); il commento su `urlSitoPolisportiva` poteva far pensare "niente social per l'intera tabella" invece che "solo per la Polisportiva" (chiarito); le icone social nel footer non avevano un raggruppamento semantico per screen reader a differenza di `/contatti` (aggiunto `role="group" aria-label="Social"`, `display:contents` per non alterare il layout).

**Manual checks (dev locale rotto su questa macchina - verificare al primo deploy utile):**
- Applicare la migrazione, impostare un URL Instagram da `/app/impostazioni`, verificare la comparsa dell'icona in footer e `/contatti`.
- Svuotare il campo e verificare che l'icona sparisca.
- Verificare che la home pubblica sia invariata (nessun riferimento a Instagram nella sezione "ultimi post" Facebook).
