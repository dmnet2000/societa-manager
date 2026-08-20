import { notFound } from "next/navigation";
import {
  contenutoSanitizzatoPaginaPubblica,
  trovaPaginaPubblicaPerSlug,
} from "@/lib/pagine-pubbliche";
import { HeaderPubblico } from "../HeaderPubblico";
import { FooterPubblico } from "../FooterPubblico";
import styles from "./pagina-pubblica.module.css";

// Story 19.9 (Epic 19, Ruolo Site Manager): rotta catch-all a livello radice
// (sibling di app/page.tsx) - risolve a runtime un URL configurato da un
// Site Manager (VoceMenuPubblico, Story 19.6-19.8) verso una PaginaPubblica
// reale, invece di richiedere una nuova rotta scritta a mano per ogni
// pagina. Le 5 pagine pubbliche esistenti (app/page.tsx, app/squadre,
// app/calendario, app/staff, app/contatti) restano rotte letterali distinte
// - Next.js le fa sempre vincere su questo catch-all a parita' di path
// (nessuna migrazione di quelle 5 in questo sistema, deciso esplicitamente
// in party mode). Dati possono cambiare in qualunque momento dalla console
// di gestione (Story 19.10) - stesso motivo di dynamic = "force-dynamic"
// gia' in uso su ogni altra pagina pubblica del progetto.
export const dynamic = "force-dynamic";

export default async function PaginaPubblicaPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const pathname = "/" + slug.join("/");

  const pagina = await trovaPaginaPubblicaPerSlug(pathname);

  // AC #2: nessuna Pagina corrispondente -> comportamento 404 di oggi,
  // invariato (notFound() di Next.js, nessuna pagina not-found.tsx
  // personalizzata nel progetto).
  if (!pagina) {
    notFound();
  }

  // AC #3 (difesa in profondita', decisione esplicita di Winston in party
  // mode): il contenuto e' gia' sanitizzato prima di essere scritto su
  // database (Server Action della Story 19.10, non ancora collegata) - ma
  // questo secondo passaggio al render e' quello che DAVVERO protegge un
  // Visitatore, mai fidarsi del solo passaggio al salvataggio. Prima
  // occorrenza di dangerouslySetInnerHTML in questo progetto - ammissibile
  // solo perche' il contenuto passa sempre da qui, mai un valore grezzo.
  const contenutoSicuro = contenutoSanitizzatoPaginaPubblica(pagina);

  return (
    <>
      <HeaderPubblico />
      <main className={styles.main}>
        <h1 className={styles.titolo}>{pagina.titolo}</h1>
        <div
          className={styles.contenuto}
          dangerouslySetInnerHTML={{ __html: contenutoSicuro }}
        />
      </main>
      <FooterPubblico />
    </>
  );
}
