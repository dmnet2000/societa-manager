-- Story 20.5 (Epic 20, Torneo Memorial): bucket Storage PUBBLICO per il
-- volantino/immagine di sfondo di un'Edizione del Torneo - nessuna nuova
-- colonna Prisma su "EdizioneTorneo": esistenza + updated_at derivati da
-- Storage list(), stesso principio gia' stabilito per "foto-hero"
-- (20260815000000) e "foto-squadra-gruppo" (20260813000000). Path PIATTO
-- PER-ENTITA' (il nome oggetto e' direttamente l'edizioneTorneoId, nessuna
-- sottocartella) - mirror esatto di "foto-squadra-gruppo" per la forma del
-- path, ma qui nessuna funzione di "possesso" e' necessaria: a differenza di
-- foto-squadra-gruppo (dove anche l'Allenatore assegnato puo' caricare), il
-- perimetro Torneo e' sempre e solo ADMIN/DIRIGENTE (stesso perimetro di ogni
-- altra Server Action in app/(torneo)/torneo/actions.ts) - mirror
-- "sponsor-banner" (20260809010000) per questa parte.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('volantino-torneo', 'volantino-torneo', true, 2097152, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- Policy SELECT PUBBLICA (nessuna condizione di Ruolo) fin da questa prima
-- migrazione - non opzionale nemmeno per un bucket pubblico: list() (usato
-- sia dal form di upload lato Admin/Dirigente sia dalla futura sezione
-- pubblica di Story 20.6, sito anonimo) passa da RLS, a differenza del GET
-- diretto sull'endpoint pubblico dell'oggetto che la bypassa - stessa lezione
-- gia' applicata fin da subito per "foto-squadra-gruppo"/"foto-hero" (il
-- bucket "logo-applicazione" ha invece impiegato due migrazioni correttive
-- per arrivarci, Story 7.2), non ripetuta qui.
CREATE POLICY "volantino_torneo_select" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'volantino-torneo');

-- Sia INSERT sia UPDATE: caricaVolantinoTorneo usa upsert:true (sostituzione
-- fisica, non accumulo di versioni) - dimenticare la policy UPDATE ha gia'
-- causato un bug reale nel bucket logo (20260718090000_logo_bucket_restrict_path),
-- non ripeterlo qui. Nessun controllo su "name" (a differenza di "foto-hero",
-- path fisso): qui il path e' un edizioneTorneoId diverso per ogni riga,
-- nessun valore singolo da confrontare - stesso principio di
-- "sponsor-banner" (ogni Sponsor ha il proprio id come path, gestito solo da
-- ADMIN/DIRIGENTE, nessuna dimensione di appartenenza per-utente).
CREATE POLICY "volantino_torneo_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'volantino-torneo'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']
  );

CREATE POLICY "volantino_torneo_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'volantino-torneo'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']
  )
  WITH CHECK (
    bucket_id = 'volantino-torneo'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'DIRIGENTE']
  );

-- Nessuna policy DELETE (nessun AC la richiede - sostituzione via
-- upsert:true sullo stesso path per-entita', mai una cancellazione esplicita,
-- mirror logo/sponsor-banner/foto-squadra-gruppo/foto-hero). Nessun GRANT
-- esplicito su storage.objects: l'estensione Storage di Supabase concede gia'
-- le basi ad "authenticated", solo POLICY - stesso principio gia' verificato
-- per tutti i bucket precedenti.
