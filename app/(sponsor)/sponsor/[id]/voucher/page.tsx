import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { leggiNomeSettore } from "@/lib/configurazione-applicazione";
import { risolviNomeVoucher } from "@/lib/sponsor/risolvi-nome-voucher";
import { convenzioneVoucherValida } from "@/lib/sponsor/convenzione-voucher-valida";
import styles from "./voucher.module.css";

// Dati potenzialmente diversi ad ogni visita (data corrente, Sponsor
// disattivato nel frattempo) - stesso motivo di /logo, /impostazioni.
export const dynamic = "force-dynamic";

export default async function VoucherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // AC #2/#3: il voucher esiste solo per uno Sponsor tipo CONVENZIONE
  // attivo - un Banner, uno Sponsor disattivato o un id inesistente (link
  // manomesso/obsoleto) non hanno un voucher generabile. Sponsor non e'
  // protetto da RLS (AD-9) - Prisma diretto, come Palestra.
  const sponsor = await prisma.sponsor.findUnique({ where: { id } });

  if (!sponsor || !convenzioneVoucherValida(sponsor)) {
    return (
      <main>
        <h1>Voucher</h1>
        <p role="alert" className={styles.errore}>
          Convenzione non trovata o non più disponibile.
        </p>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) {
    console.error(error);
  }

  // Stesso identico pattern di risoluzione identita' gia' stabilito in
  // app/il-mio-profilo/page.tsx (Story 9.12), esteso qui con un terzo ramo
  // (Genitore non auto-agganciato) per il fallback "Genitore di <nome
  // Atleta>" deciso con l'utente in apertura di questa storia - Utente non
  // ha un proprio Nome/Cognome (solo email), Genitore/Admin/Dirigente/
  // Segreteria non hanno una fonte diretta. Nessun dato sanitario/riservato
  // letto (AC #5): solo Allenatore.nome/cognome e Atleta.nome (gia'
  // pubblico all'interno della societa'), mai CertificatoMedico.
  // Review fix (2026-08-09, Blind Hunter + Edge Case Hunter, trovato
  // indipendentemente da entrambi): leggiNomeSettore() non dipende
  // dall'identita' dell'Utente (dato indipendente, sempre leggibile) -
  // prima era dentro il ternario `user ?`, quindi spariva silenziosamente
  // se getUser() falliva, pur non avendo nulla a che fare con quel fallimento.
  const [allenatore, atletaPropria, genitoreDiAtleta] = user
    ? await Promise.all([
        prisma.allenatore.findFirst({
          where: { utente: { supabaseAuthId: user.id } },
          select: { nome: true, cognome: true },
        }),
        prisma.genitoreAtleta.findFirst({
          where: { utente: { supabaseAuthId: user.id }, autoAggancio: true },
          select: { atleta: { select: { nome: true } } },
          orderBy: { atletaId: "asc" },
        }),
        prisma.genitoreAtleta.findFirst({
          where: { utente: { supabaseAuthId: user.id }, autoAggancio: false },
          select: { atleta: { select: { nome: true } } },
          orderBy: { atletaId: "asc" },
        }),
      ])
    : [null, null, null];
  const nomeSettore = await leggiNomeSettore();

  const nomeUtente = risolviNomeVoucher({
    allenatore,
    atletaPropria: atletaPropria?.atleta ?? null,
    genitoreDiAtleta: genitoreDiAtleta?.atleta ?? null,
    email: user?.email ?? "",
  });

  const dataCorrente = new Date().toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <main>
      <h1>Voucher</h1>
      <div className={styles.voucher}>
        <p className={styles.nomeUtente}>{nomeUtente}</p>
        {nomeSettore && <p className={styles.nomeSocieta}>{nomeSettore}</p>}
        <p className={styles.data}>{dataCorrente}</p>
        <p className={styles.convenzione}>
          Convenzione: <strong>{sponsor.nome}</strong>
        </p>
        <p>{sponsor.descrizione}</p>
      </div>
    </main>
  );
}
