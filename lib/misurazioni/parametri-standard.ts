export type ParametroStandard = {
  tipo: string;
  unitaMisura: string;
  tentativi: 1 | 3;
};

// Story 9.16 (AC #1, #3): catalogo dei parametri richiesti dall'utente -
// precompila "tipo"/"unitaMisura" nel form (MisurazioneForm.tsx) invece di
// scriverli a mano ogni volta. "tentativi: 3" per i due test di elevazione
// (salto con rincorsa/salto a muro) - il form mostra tre campi valore invece
// di uno, un solo invio salva tre righe MisurazioneAtleta (Task 3).
export const PARAMETRI_STANDARD: ParametroStandard[] = [
  { tipo: "Peso", unitaMisura: "kg", tentativi: 1 },
  { tipo: "Altezza", unitaMisura: "cm", tentativi: 1 },
  { tipo: "Reach a una mano", unitaMisura: "cm", tentativi: 1 },
  { tipo: "Reach a due mani", unitaMisura: "cm", tentativi: 1 },
  { tipo: "Salto con rincorsa", unitaMisura: "cm", tentativi: 3 },
  { tipo: "Salto a muro", unitaMisura: "cm", tentativi: 3 },
];
