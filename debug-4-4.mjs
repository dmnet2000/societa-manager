import { chromium } from "playwright";
const BASE = "http://localhost:3000";

async function login(page, email, password) {
  await page.goto(`${BASE}/accedi`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState("networkidle");
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await login(page, "verifica44-atleta@example.com", "verifica44pass");
  await page.goto(`${BASE}/certificato-medico`);
  const form = page.locator('form:has(input[name="file"])');
  await form.locator('input[name="file"]').setInputFiles("scratch-certificato-v1.pdf");
  await form.locator('button[type="submit"]').click();
  await page.waitForLoadState("networkidle");
  await page.context().clearCookies();

  await login(page, "admin@societa-manager.local", "password");
  await page.goto(`${BASE}/conferma-certificati`);
  await page.waitForLoadState("networkidle");
  console.log("=== PRIMA DELLA CONFERMA ===");
  console.log(await page.textContent("body"));

  const riga = page.locator("li", { hasText: "Verifica Storia 44" }).first();
  await riga.locator('input[name="dataFineValidita"]').fill("2027-06-30");
  await riga.locator('input[name="dataInizioValidita"]').fill("2026-07-01");
  await riga.locator('input[name="mesiValidita"]').fill("12");
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/conferma-certificati")),
    riga.locator('button[type="submit"]', { hasText: "Conferma" }).click(),
  ]);
  await page.waitForTimeout(1500);
  console.log("=== DOPO LA CONFERMA (stessa pagina, nessuna nuova navigazione) ===");
  console.log(await page.textContent("body"));

  await page.goto(`${BASE}/conferma-certificati`);
  await page.waitForLoadState("networkidle");
  console.log("=== DOPO RICARICAMENTO ESPLICITO DELLA PAGINA ===");
  console.log(await page.textContent("body"));

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
