// Loads .env into process.env before any other module reads it. Must be the
// first import in main/index.ts — CommonJS `require()` runs synchronously in
// source order, so this executes before `infrastructure/config/env.ts` does.
// Uses Node's built-in loader (available Node 20.12+) instead of adding a
// `dotenv` dependency.
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file present — fine in environments (CI, Railway, etc.) where
    // env vars are injected directly instead of read from a file.
  }
}
