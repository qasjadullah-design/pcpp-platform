/*
 * One-off importer for AJK/GB projects (ajk_gb_projects_clean.csv).
 * Inserts via the live pg pool (raw SQL, matching backend/routes/*).
 *
 * Connection: uses DATABASE_URL (Render External URL, with SSL) if set,
 * otherwise the DB_* vars from backend/.env (same fields as backend/db/pool.js).
 *
 * Usage:
 *   node backend/seeds/import_ajk_gb.js --dry-run            # parse+map only, NO DB
 *   DATABASE_URL="<render-external-url>" node backend/seeds/import_ajk_gb.js
 *   ... --limit=10        # only first N rows
 *   ... --file=path.csv   # override CSV path
 *   ... --owner-email=admin@pcpp.gov.pk
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const IMPORT_TAG = 'bulk_import_2026_ajk_gb';

const VALID_STATUSES = new Set([
  'draft', 'under_review', 'approved', 'rejected',
  'changes_requested', 'under_implementation', 'completed', 'archived',
]);

function getArg(name, def = null) {
  const found = process.argv.find(a => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : def;
}
function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

// Empty-string / undefined -> null coercion (same pattern as routes/projects.js)
const n = (v) => (v === '' || v === undefined || v === null ? null : v);

function parseAmount(value) {
  const raw = String(value ?? '').replace(/,/g, '').trim();
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? Math.round(num) : null;
}

// Minimal RFC-4180-ish CSV parser (handles quoted fields w/ commas + escaped quotes).
function parseCsv(content) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i], nxt = content[i + 1];
    if (c === '"') {
      if (inQuotes && nxt === '"') { field += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      row.push(field); field = '';
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (c === '\r' && nxt === '\n') i++;
      row.push(field);
      if (row.some(v => String(v).trim() !== '')) rows.push(row);
      row = []; field = '';
    } else {
      field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    if (row.some(v => String(v).trim() !== '')) rows.push(row);
  }
  return rows;
}

function loadRecords(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const rows = parseCsv(content);
  if (!rows.length) throw new Error('CSV is empty.');
  const headers = rows[0].map(h => h.replace(/^﻿/, '').trim().toLowerCase());
  return rows.slice(1).map((row, idx) => {
    const rec = { rowNumber: idx + 2 };
    headers.forEach((h, i) => { rec[h] = (row[i] ?? '').trim(); });
    return rec;
  });
}

// Build the INSERT params for one CSV record.
function mapRecord(rec, userId) {
  const title = rec.title;
  const province = rec.province;
  const status = VALID_STATUSES.has(rec.status) ? rec.status : 'under_review';
  const primary_sector = rec.primary_sector || 'Other';
  const total_cost = parseAmount(rec.total_cost);

  const impact_metrics = {
    source: 'AJK/GB bulk import',
    funding_type: rec.funding_type || null,
    source_file: rec.source_file || null,
  };
  const tags = [
    IMPORT_TAG,
    `funding_type:${rec.funding_type || 'unknown'}`,
    `source_file:${rec.source_file || 'unknown'}`,
    `province:${province}`,
  ];

  return {
    statusCoerced: status !== rec.status,
    values: [
      title,                       // $1  title (NOT NULL)
      title,                       // $2  abstract (NOT NULL) -> mirror title
      n(province),                 // $3  province
      n(rec.district),             // $4  district
      primary_sector,              // $5  primary_sector (NOT NULL)
      status,                      // $6  status
      'PKR',                       // $7  currency
      n(total_cost),               // $8  total_cost
      `${province} Government`,     // $9  organization_name
      userId,                      // $10 user_id
      JSON.stringify(impact_metrics), // $11 impact_metrics (jsonb)
      tags,                        // $12 tags (text[])
    ],
  };
}

const INSERT_SQL = `
  INSERT INTO projects (
    title, abstract, province, district, primary_sector, status,
    currency, total_cost, organization_name, user_id, impact_metrics, tags
  ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
  RETURNING id
`;

function makePool() {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 4,
    });
  }
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 4,
  });
}

async function main() {
  const filePath = getArg('file', path.join(__dirname, 'data', 'ajk_gb_projects_clean.csv'));
  const ownerEmail = getArg('owner-email', 'admin@pcpp.gov.pk');
  const limit = Number(getArg('limit', '0')) || 0;
  const dryRun = hasFlag('dry-run');

  let records = loadRecords(filePath);
  if (limit) records = records.slice(0, limit);

  console.log(`File: ${filePath}`);
  console.log(`Rows to process: ${records.length}`);
  console.log(`Owner email: ${ownerEmail}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no DB)' : 'LIVE INSERT'}`);
  console.log('');

  if (dryRun) {
    // No DB: just show how the first few rows map.
    const sample = records.slice(0, 3).map(r => mapRecord(r, '<ADMIN_USER_ID>'));
    sample.forEach((s, i) => {
      console.log(`--- mapped row ${i + 1} ---`);
      console.log(JSON.stringify(s.values, null, 2));
    });
    const coerced = records.filter(r => !VALID_STATUSES.has(r.status));
    const blankTitle = records.filter(r => !r.title).length;
    const blankSector = records.filter(r => !r.primary_sector).length;
    const badAmount = records.filter(r => parseAmount(r.total_cost) === null).length;
    console.log('\nValidation preview:');
    console.log(`  Blank titles: ${blankTitle}`);
    console.log(`  Blank primary_sector (-> 'Other'): ${blankSector}`);
    console.log(`  Null/invalid total_cost: ${badAmount}`);
    console.log(`  Rows with unrecognized status (-> 'under_review'): ${coerced.length}`);
    if (coerced.length) console.log('   values:', [...new Set(coerced.map(r => r.status))]);
    console.log('\nDRY RUN complete. No rows inserted.');
    return;
  }

  const pool = makePool();

  // Resolve admin owner id.
  let owner = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [ownerEmail]);
  if (!owner.rows.length) {
    owner = await pool.query("SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1");
  }
  if (!owner.rows.length) throw new Error(`No owner user found (tried ${ownerEmail}, then first admin).`);
  const userId = owner.rows[0].id;
  console.log(`Owner user_id: ${userId}\n`);

  let inserted = 0, skippedDuplicate = 0, skippedBlankTitle = 0, errors = 0;

  for (const rec of records) {
    if (!rec.title) { skippedBlankTitle++; continue; }

    // Dedup guard: skip if a project with the same title already exists.
    const exists = await pool.query('SELECT 1 FROM projects WHERE title = $1 LIMIT 1', [rec.title]);
    if (exists.rows.length) { skippedDuplicate++; continue; }

    try {
      const { values } = mapRecord(rec, userId);
      await pool.query(INSERT_SQL, values);
      inserted++;
    } catch (err) {
      errors++;
      console.error(`Row ${rec.rowNumber} failed: ${err.message}`);
    }
  }

  console.log('\nImport summary');
  console.log('--------------');
  console.log(`Inserted:           ${inserted}`);
  console.log(`Skipped duplicate:  ${skippedDuplicate}`);
  console.log(`Skipped blank title:${skippedBlankTitle}`);
  console.log(`Errors:             ${errors}`);

  const total = await pool.query("SELECT COUNT(*)::int AS c FROM projects WHERE tags @> ARRAY[$1]", [IMPORT_TAG]);
  console.log(`Total rows tagged '${IMPORT_TAG}' now: ${total.rows[0].c}`);

  await pool.end();
}

main().catch(err => { console.error('\nImport failed:', err); process.exit(1); });
