// Shim in JS (non .ts, non type-checked): forza il caricamento del motore
// WASM di Prisma tramite require() verso il subpath "/wasm", che il
// generator "prisma-client-js" espone in modo incondizionato (a differenza
// di "@prisma/client" semplice, la cui condizione di export "." risolve al
// motore nativo o WASM a seconda della fase di bundling che la risolve -
// vedi commento in lib/prisma.ts). Un file .ts con lo stesso require()
// rompeva l'inferenza dei tipi generati da Prisma in file non correlati
// (import type in lib/prisma-engine-wasm.d.ts evita il problema).
// eslint-disable-next-line @typescript-eslint/no-require-imports
module.exports = require("@prisma/client/wasm");
