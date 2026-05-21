#!/usr/bin/env node
/**
 * Migration runner for execution-commands.
 *
 * No config required by default: runs in "local" mode (tracks state in
 * .migrations-state.json, logs SQL without connecting to a database).
 *
 * Set DATABASE_URL to run migrations against PostgreSQL.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MIGRATIONS_DIR = path.join(ROOT, "migrations");
const LOCAL_STATE_FILE = path.join(ROOT, ".migrations-state.json");

const DATABASE_URL = process.env.DATABASE_URL?.trim() || "";
const MODE = DATABASE_URL ? "postgres" : "local";

function loadMigrations() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql") && !f.endsWith(".down.sql"))
    .sort();

  return files.map((file) => {
    const id = file.replace(/\.sql$/, "");
    const upPath = path.join(MIGRATIONS_DIR, file);
    const downPath = path.join(MIGRATIONS_DIR, `${id}.down.sql`);
    return {
      id,
      file,
      up: fs.readFileSync(upPath, "utf8"),
      down: fs.existsSync(downPath) ? fs.readFileSync(downPath, "utf8") : null,
    };
  });
}

function loadLocalState() {
  if (!fs.existsSync(LOCAL_STATE_FILE)) {
    return { applied: [] };
  }
  return JSON.parse(fs.readFileSync(LOCAL_STATE_FILE, "utf8"));
}

function saveLocalState(state) {
  fs.writeFileSync(LOCAL_STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
}

async function withClient(fn) {
  const client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function ensureSchemaTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedPostgres(client) {
  await ensureSchemaTable(client);
  const { rows } = await client.query(
    "SELECT id FROM schema_migrations ORDER BY id"
  );
  return rows.map((r) => r.id);
}

async function getApplied() {
  if (MODE === "local") {
    return loadLocalState().applied;
  }
  return withClient(getAppliedPostgres);
}

async function applyMigration(migration) {
  if (MODE === "local") {
    console.log(`[local] apply ${migration.file}`);
    console.log(migration.up.trim() || "(empty up migration)");
    const state = loadLocalState();
    if (!state.applied.includes(migration.id)) {
      state.applied.push(migration.id);
      saveLocalState(state);
    }
    return;
  }

  await withClient(async (client) => {
    await ensureSchemaTable(client);
    await client.query("BEGIN");
    try {
      await client.query(migration.up);
      await client.query(
        "INSERT INTO schema_migrations (id) VALUES ($1) ON CONFLICT DO NOTHING",
        [migration.id]
      );
      await client.query("COMMIT");
      console.log(`[postgres] applied ${migration.file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  });
}

async function revertMigration(migration) {
  if (!migration.down?.trim()) {
    throw new Error(`No down migration for ${migration.id}`);
  }

  if (MODE === "local") {
    console.log(`[local] revert ${migration.id}.down.sql`);
    console.log(migration.down.trim());
    const state = loadLocalState();
    state.applied = state.applied.filter((id) => id !== migration.id);
    saveLocalState(state);
    return;
  }

  await withClient(async (client) => {
    await ensureSchemaTable(client);
    await client.query("BEGIN");
    try {
      await client.query(migration.down);
      await client.query("DELETE FROM schema_migrations WHERE id = $1", [
        migration.id,
      ]);
      await client.query("COMMIT");
      console.log(`[postgres] reverted ${migration.id}`);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  });
}

async function cmdUp() {
  const migrations = loadMigrations();
  const applied = await getApplied();
  const pending = migrations.filter((m) => !applied.includes(m.id));

  if (pending.length === 0) {
    console.log("No pending migrations.");
    return;
  }

  console.log(`Mode: ${MODE}`);
  for (const migration of pending) {
    await applyMigration(migration);
  }
  console.log(`Done. Applied ${pending.length} migration(s).`);
}

async function cmdDown() {
  const migrations = loadMigrations();
  const applied = await getApplied();
  const lastId = applied[applied.length - 1];

  if (!lastId) {
    console.log("No migrations to roll back.");
    return;
  }

  const migration = migrations.find((m) => m.id === lastId);
  if (!migration) {
    throw new Error(`Applied migration not found on disk: ${lastId}`);
  }

  console.log(`Mode: ${MODE}`);
  await revertMigration(migration);
  console.log(`Done. Reverted ${lastId}.`);
}

async function cmdStatus() {
  const migrations = loadMigrations();
  const applied = await getApplied();

  console.log(`Mode: ${MODE}`);
  console.log("Migrations:");
  for (const migration of migrations) {
    const mark = applied.includes(migration.id) ? "applied" : "pending";
    console.log(`  [${mark}] ${migration.file}`);
  }
}

function printHelp() {
  console.log(`Usage: node scripts/migrate.js <command>

Commands:
  up       Apply pending migrations
  down     Roll back the last applied migration
  status   Show migration status

Environment:
  DATABASE_URL   Optional. If unset, runs in local mode (no DB connection).

Examples:
  npm run migrate:status
  npm run migrate:up
  npm run migrate:down
`);
}

const command = process.argv[2] || "help";

console.log("=== BOLTIC EXECUTION COMMAND: migrate ===");
console.log("command:", command);

try {
  if (command === "up") {
    await cmdUp();
  } else if (command === "down") {
    await cmdDown();
  } else if (command === "status") {
    await cmdStatus();
  } else {
    printHelp();
    process.exit(command === "help" ? 0 : 1);
  }
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
}
