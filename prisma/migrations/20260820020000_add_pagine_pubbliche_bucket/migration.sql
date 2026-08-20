-- Story 19.10 (Task 2): bucket Storage PUBBLICO con path PER-FILE (nome
-- casuale, vedi lib/storage/pagine-pubbliche.ts) - mirror esatto di
-- 20260809010000_add_sponsor_banner_bucket (Story 16.1), stesso limite di
-- dimensione/formati (DIMENSIONE_MASSIMA_IMMAGINE_BYTE/MIME_AMMESSI_IMMAGINE,
-- lib/storage/validazione-immagine.ts), ma le policy sono scoped
-- ADMIN/SITE_MANAGER invece di ADMIN/DIRIGENTE - solo chi gestisce
-- /app/pagine-pubbliche (Story 19.10 AC #5) puo' scrivere qui. Un bucket
-- public = true bypassa RLS per la lettura pubblica (nessuna policy SELECT
-- necessaria per il rendering di app/[...slug]/page.tsx) - RLS resta
-- necessaria solo per INSERT/UPDATE e, per lo stesso motivo gia' scoperto in
-- Story 7.2 (20260718080000_logo_bucket_fix_select_policy) e riapplicato fin
-- da subito in Story 16.1, anche per SELECT: Supabase Storage verifica
-- l'esistenza dell'oggetto per decidere insert/update quando upload() e'
-- chiamato con upsert. Nessuna policy DELETE (mirror esatto, nessun AC
-- richiede la rimozione di una singola immagine dallo storage - eliminare
-- una PaginaPubblica non rimuove le immagini gia' incorporate nel suo
-- contenuto, stessa scelta gia' accettata per Sponsor).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contenuti-pagine-pubbliche', 'contenuti-pagine-pubbliche', true, 2097152, ARRAY['image/png', 'image/jpeg'])
ON CONFLICT (id) DO NOTHING;

-- Path per-file (nome casuale, mai l'id di un'entita') - nessuna funzione di
-- possesso da verificare, stesso motivo di sponsor-banner: solo
-- ADMIN/SITE_MANAGER gestiscono le Pagine pubbliche (Story 19.10 AC #5),
-- nessuna dimensione di appartenenza per-utente.
CREATE POLICY "admin_site_manager_contenuti_pagine_pubbliche_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'contenuti-pagine-pubbliche'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'SITE_MANAGER']
  );

CREATE POLICY "admin_site_manager_contenuti_pagine_pubbliche_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'contenuti-pagine-pubbliche'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'SITE_MANAGER']
  );

CREATE POLICY "admin_site_manager_contenuti_pagine_pubbliche_update" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'contenuti-pagine-pubbliche'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'SITE_MANAGER']
  )
  WITH CHECK (
    bucket_id = 'contenuti-pagine-pubbliche'
    AND (auth.jwt() -> 'app_metadata' -> 'ruoli') ?| array['ADMIN', 'SITE_MANAGER']
  );
