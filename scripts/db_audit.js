#!/usr/bin/env node
const fs = require('fs');
const { Client } = require('pg');
const { execSync } = require('child_process');

function readEnvFile(path) {
  const raw = fs.readFileSync(path, 'utf8');
  const lines = raw.split(/\r?\n/);
  let last = null;
  for (const l of lines) {
    const t = l.trim();
    if (!t || t.startsWith('#')) continue;
    if (t.startsWith('DATABASE_URL=')) {
      last = t.slice('DATABASE_URL='.length).trim();
      // remove optional surrounding quotes
      if ((last.startsWith('"') && last.endsWith('"')) || (last.startsWith("'") && last.endsWith("'"))) {
        last = last.slice(1, -1);
      }
    }
  }
  return last;
}

function parseDatabaseUrl(url) {
  try {
    const u = new URL(url);
    return {
      protocol: u.protocol.replace(':',''),
      username: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      host: u.hostname,
      port: u.port || undefined,
      database: u.pathname ? u.pathname.replace(/^\//,'') : undefined,
      original: url
    };
  } catch (e) {
    return { error: e.message, original: url };
  }
}

async function run() {
  const envPath = 'backend-node/.env';
  if (!fs.existsSync(envPath)) {
    console.error(JSON.stringify({ error: 'env file not found', path: envPath }, null, 2));
    process.exit(2);
  }

  const databaseUrl = readEnvFile(envPath);
  if (!databaseUrl) {
    console.error(JSON.stringify({ error: 'DATABASE_URL not found in .env' }, null, 2));
    process.exit(2);
  }

  const parsed = parseDatabaseUrl(databaseUrl);

  const report = {
    databaseUrl: databaseUrl,
    parsed,
    servers: {},
    targetDatabaseExists: false,
    databases: [],
    publicTables: [],
    prismaMigrationsExists: false,
    counts: {},
    schemaChecks: {
      modelsChecked: [],
      missingTables: []
    },
    prismaMigrateStatus: null,
    errors: []
  };

  // Helper to build a connection string to a specific database
  function connString(dbName) {
    const u = new URL(databaseUrl);
    u.pathname = '/' + (dbName || 'postgres');
    return u.toString();
  }

  // Connect to maintenance DB (postgres) to list databases
  let client;
  try {
    client = new Client({ connectionString: connString('postgres') });
    await client.connect();
  } catch (e) {
    // try connecting directly to target DB
    report.errors.push('Could not connect to maintenance DB: ' + e.message);
    try {
      client = new Client({ connectionString: connString(parsed.database) });
      await client.connect();
    } catch (e2) {
      report.errors.push('Could not connect to target DB either: ' + e2.message);
      console.log(JSON.stringify(report, null, 2));
      process.exit(3);
    }
  }

  try {
    const res = await client.query("SELECT datname FROM pg_database ORDER BY datname;");
    report.databases = res.rows.map(r => r.datname);
    report.targetDatabaseExists = report.databases.includes(parsed.database);
  } catch (e) {
    report.errors.push('Failed listing databases: ' + e.message);
  }

  // If the client is connected to maintenance DB, and target exists, connect to target
  try {
    if (client.database && client.database !== parsed.database) {
      await client.end();
      client = new Client({ connectionString: connString(parsed.database) });
      await client.connect();
    }
  } catch (e) {
    report.errors.push('Failed switching to target DB: ' + e.message);
  }

  // List public tables
  try {
    const tRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;");
    report.publicTables = tRes.rows.map(r => r.table_name);
    report.prismaMigrationsExists = report.publicTables.includes('_prisma_migrations');
  } catch (e) {
    report.errors.push('Failed listing tables: ' + e.message);
  }

  // Helper to check table and count rows (read-only)
  async function safeCount(tableName) {
    try {
      if (!report.publicTables.includes(tableName)) return { table: tableName, exists: false };
      const r = await client.query(`SELECT COUNT(*)::bigint as cnt FROM public."${tableName}";`);
      return { table: tableName, exists: true, count: Number(r.rows[0].cnt) };
    } catch (e) {
      return { table: tableName, exists: true, error: e.message };
    }
  }

  // Count requested logical tables with fallbacks
  const tableChecks = {
    User: ['users'],
    Wallet: ['wallets','credit_wallets','ad_token_wallets'],
    Transaction: ['transactions','transaction_ledgers','token_transactions'],
    AffiliateNetwork: ['affiliate_networks']
  };

  for (const [logical, candidates] of Object.entries(tableChecks)) {
    report.counts[logical] = [];
    for (const t of candidates) {
      const c = await safeCount(t);
      report.counts[logical].push(c);
    }
  }

  // Basic schema.prisma matching: check @@map table names for models
  try {
    const schemaText = fs.readFileSync('backend-node/prisma/schema.prisma', 'utf8');
    const modelRegex = /model\s+(\w+)\s+\{([\s\S]*?)\n\}/g;
    let m;
    while ((m = modelRegex.exec(schemaText)) !== null) {
      const modelName = m[1];
      const body = m[2];
      const mapMatch = body.match(/@@map\((?:\"|\')([^)\"']+)(?:\"|\')\)/);
      const mapped = mapMatch ? mapMatch[1] : null;
      if (mapped) {
        report.schemaChecks.modelsChecked.push({ model: modelName, mappedTable: mapped, exists: report.publicTables.includes(mapped) });
        if (!report.publicTables.includes(mapped)) report.schemaChecks.missingTables.push({ model: modelName, expectedTable: mapped });
      } else {
        report.schemaChecks.modelsChecked.push({ model: modelName, mappedTable: null, note: 'no @@map - not checked' });
      }
    }
  } catch (e) {
    report.errors.push('Failed reading schema.prisma: ' + e.message);
  }

  // Attempt to run `npx prisma migrate status` if npx is available
  try {
    execSync('npx --version', { stdio: 'ignore' });
    try {
      // run in backend-node
      const out = execSync('npx prisma migrate status --schema=prisma/schema.prisma', { cwd: 'backend-node', encoding: 'utf8', stdio: ['ignore','pipe','pipe'] });
      report.prismaMigrateStatus = { ok: true, output: out };
    } catch (e) {
      report.prismaMigrateStatus = { ok: false, error: e.message, stdout: e.stdout && e.stdout.toString(), stderr: e.stderr && e.stderr.toString() };
    }
  } catch (e) {
    report.prismaMigrateStatus = { ok: false, error: 'npx not available in PATH' };
  }

  try {
    await client.end();
  } catch (e) {
    // ignore
  }

  console.log(JSON.stringify(report, null, 2));
}

run().catch(e => {
  console.error(JSON.stringify({ error: e.message, stack: e.stack }, null, 2));
  process.exit(1);
});
