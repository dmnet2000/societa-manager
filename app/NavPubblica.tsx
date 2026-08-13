"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./NavPubblica.module.css";

// Story 18.7: componente riusabile, montato da ogni pagina pubblica
// (app/page.tsx oggi; app/squadre/page.tsx, app/calendario/page.tsx,
// app/staff/page.tsx, app/contatti/page.tsx quando le Story 18.8-18.11
// esisteranno) - ciascuna ottiene lo stato attivo corretto in modo
// indipendente al proprio caricamento, nessun problema di staleness da
// layout condiviso (a differenza di app/NavBarClient.tsx, montato una sola
// volta nel root layout autenticato).
//
// Elenco voci hard-coded (non derivato da PUBLIC_ROUTES, che e' un array
// di stringhe senza label - lib/auth/route-guard.ts) - "Squadre"/
// "Calendario"/"Staff"/"Contatti" puntano a rotte non ancora esistenti
// finche' le Story 18.8-18.11 non le implementano (atteso, non un difetto
// di questa storia).
const VOCI = [
  { href: "/", label: "Home" },
  { href: "/squadre", label: "Squadre" },
  { href: "/calendario", label: "Calendario" },
  { href: "/staff", label: "Staff" },
  { href: "/contatti", label: "Contatti" },
] as const;

// usePathname() (non un valore calcolato server-side): app/page.tsx e' un
// Server Component (force-dynamic) e non puo' chiamarlo direttamente -
// stesso principio gia' stabilito da app/NavBarClient.tsx (Story 9.10) per
// il motivo opposto (layout radice che non si ri-esegue), qui riusato per
// poter restare un componente indipendente dalle pagine che lo montano.
// Confronto di uguaglianza esatta (non isVoceAttiva/prefissi di
// NavBarClient.tsx): 5 rotte piatte e mutuamente esclusive, nessuna
// annidata sotto un'altra.
export function NavPubblica() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sezioni del sito" className={styles.nav}>
      <ul className={styles.lista}>
        {VOCI.map((voce) => {
          const attiva = pathname === voce.href;
          return (
            <li key={voce.href}>
              <Link
                href={voce.href}
                className={attiva ? `${styles.voce} ${styles.voceAttiva}` : styles.voce}
                aria-current={attiva ? "page" : undefined}
              >
                {voce.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
