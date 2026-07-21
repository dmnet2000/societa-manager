import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const ATLETA_EMAIL = "verifica44-atleta@example.com";
const ATLETA_PASSWORD = "verifica44pass";
const ADMIN_EMAIL = "admin@societa-manager.local";
const ADMIN_PASSWORD = "password";

async function login(page, email, password) {
  await page.goto(`${BASE}/accedi`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");
}

async function uploadCertificato(page, filePath) {
  await page.goto(`${BASE}/certificato-medico`);
  const form = page.locator('form:has(input[name="file"])');
  await form.locator('input[name="file"]').setInputFiles(filePath);
  await form.locator('button[type="submit"]').click();
  await page.waitForLoadState("networkidle");
}

// Il textContent("body") grezzo include anche il payload RSC serializzato
// (self.__next_f/self.__next_r) per l'hydration, non solo il testo visibile
// - tagliarlo via prima di qualunque asserzione sul testo, altrimenti
// stringhe come "Confermati (" possono comparire anche nel payload serio in
// un ordine diverso da quello del DOM visibile, producendo falsi negativi.
async function testoVisibile(page) {
  const raw = await page.textContent("body");
  const idx = raw.indexOf("self.__next_r");
  return idx === -1 ? raw : raw.slice(0, idx);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const risultati = [];
  function ok(label, cond) {
    risultati.push(`${cond ? "OK" : "FAIL"} - ${label}`);
  }

  // --- Atleta carica il primo certificato ---
  await login(page, ATLETA_EMAIL, ATLETA_PASSWORD);
  await uploadCertificato(page, "scratch-certificato-v1.pdf");
  ok("upload iniziale come Atleta riesce", !(await testoVisibile(page)).includes("Impossibile caricare"));

  // AC #4: Atleta non autorizzata sulla pagina di conferma
  await page.goto(`${BASE}/conferma-certificati`);
  await page.waitForLoadState("networkidle");
  ok("AC#4: Atleta reindirizzata a /non-autorizzato su /conferma-certificati", page.url().includes("/non-autorizzato"));

  await page.context().clearCookies();

  // --- Admin: pagina di conferma prima di agire (AC #5) ---
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto(`${BASE}/conferma-certificati`);
  await page.waitForLoadState("networkidle");
  let testo = await testoVisibile(page);
  let sezioneDaConfermare = testo.split("Confermati (")[0];
  ok("AC#5: 'Verifica Storia 44' e 'Test Rls Admin' (mai caricato) sono entrambe in 'Da confermare'",
    sezioneDaConfermare.includes("Verifica Storia 44") && sezioneDaConfermare.includes("Test Rls Admin"));

  // AC #1: conferma il Certificato caricato da Verifica Storia 44
  let riga = page.locator("li", { hasText: "Verifica Storia 44" }).first();
  await riga.locator('input[name="dataFineValidita"]').fill("2027-06-30");
  await riga.locator('input[name="dataInizioValidita"]').fill("2026-07-01");
  await riga.locator('input[name="mesiValidita"]').fill("12");
  await riga.locator('button[type="submit"]', { hasText: "Conferma" }).click();
  await page.waitForLoadState("networkidle");

  testo = await testoVisibile(page);
  sezioneDaConfermare = testo.split("Confermati (")[0];
  const sezioneConfermati = testo.split("Confermati (")[1] ?? "";
  ok("AC#1: dopo la conferma, 'Verifica Storia 44' non e' piu' in 'Da confermare'", !sezioneDaConfermare.includes("Verifica Storia 44"));
  ok("AC#1: ora e' in 'Confermati' con la data inserita (30/06/2027)", sezioneConfermati.includes("Verifica Storia 44") && sezioneConfermati.includes("30/06/2027"));

  // AC #2: inserimento manuale per un'Atleta senza alcun Certificato mai caricato
  riga = page.locator("li", { hasText: "Test Rls Admin" }).first();
  await riga.locator('input[name="dataFineValidita"]').fill("2027-12-31");
  await riga.locator('input[name="file"]').setInputFiles("scratch-certificato-v1.pdf");
  await riga.locator('button[type="submit"]', { hasText: "Conferma" }).click();
  await page.waitForLoadState("networkidle");

  testo = await testoVisibile(page);
  sezioneDaConfermare = testo.split("Confermati (")[0];
  ok("AC#2: 'Test Rls Admin' (mai caricata) e' ora confermata via inserimento manuale", !sezioneDaConfermare.includes("Test Rls Admin"));
  ok("AC#5: 'Da confermare' e' ora vuota (nessun rumore residuo)", sezioneDaConfermare.includes("Nessun Certificato in attesa di conferma."));

  await page.context().clearCookies();

  // --- Atleta ri-carica un nuovo file: deve tornare IN_ATTESA (AC #3) ---
  await login(page, ATLETA_EMAIL, ATLETA_PASSWORD);
  await uploadCertificato(page, "scratch-certificato-v2.pdf");
  await page.context().clearCookies();

  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto(`${BASE}/conferma-certificati`);
  await page.waitForLoadState("networkidle");
  testo = await testoVisibile(page);
  sezioneDaConfermare = testo.split("Confermati (")[0];
  ok("AC#3: dopo il ri-caricamento di un file diverso, 'Verifica Storia 44' e' tornata in 'Da confermare'", sezioneDaConfermare.includes("Verifica Storia 44"));

  await browser.close();
  console.log(risultati.join("\n"));
  if (risultati.some((r) => r.startsWith("FAIL"))) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
