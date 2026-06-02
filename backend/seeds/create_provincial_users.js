/*
 * Creates the 7 province-scoped users (role 'provincial', status 'active'),
 * one per province. Generates a random temporary password for each (printed
 * once at the end for first-login reset).
 *
 * Run AFTER migration 006 (needs users.province + the 'provincial' role).
 * Connection: DATABASE_URL (Render external, SSL) or the DB_* vars.
 *
 *   DATABASE_URL="<render-external-url>" node backend/seeds/create_provincial_users.js
 *
 * Sets BOTH password and password_hash to the bcrypt hash: login (auth.js)
 * authenticates against password_hash; password is NOT NULL on the table.
 */
require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const USERS = [
  { province: 'Punjab',                      email: 'punjab@pcpp.gov.pk' },
  { province: 'Sindh',                       email: 'sindh@pcpp.gov.pk' },
  { province: 'Khyber Pakhtunkhwa',          email: 'kpk@pcpp.gov.pk' },
  { province: 'Balochistan',                 email: 'balochistan@pcpp.gov.pk' },
  { province: 'Gilgit-Baltistan',            email: 'gb@pcpp.gov.pk' },
  { province: 'Azad Jammu and Kashmir',      email: 'ajk@pcpp.gov.pk' },
  { province: 'Islamabad Capital Territory', email: 'ict@pcpp.gov.pk' },
];

function tempPassword() {
  // 12 hex chars + complexity suffix, e.g. "a1b2c3d4e5f6#7"
  return crypto.randomBytes(6).toString('hex') + '#7';
}

function makePool() {
  if (process.env.DATABASE_URL) {
    return new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 4 });
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

const INSERT_SQL = `
  INSERT INTO users (id, first_name, last_name, email, role, status, province, password, password_hash)
  VALUES ($1, $2, $3, $4, 'provincial', 'active', $5, $6, $6)
  RETURNING id, email, province
`;

async function main() {
  const pool = makePool();
  const created = [];
  let skipped = 0;

  for (const u of USERS) {
    const exists = await pool.query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', [u.email]);
    if (exists.rows.length) {
      console.log(`SKIP (exists): ${u.email}`);
      skipped++;
      continue;
    }
    const temp = tempPassword();
    const hash = await bcrypt.hash(temp, 12);
    await pool.query(INSERT_SQL, [
      crypto.randomUUID(),
      u.province,           // first_name
      'Provincial User',    // last_name
      u.email,
      u.province,           // province
      hash,
    ]);
    created.push({ email: u.email, province: u.province, tempPassword: temp });
  }

  console.log('\n=== Provincial users ===');
  console.log(`Created: ${created.length}   Skipped: ${skipped}`);
  if (created.length) {
    console.log('\nTEMP CREDENTIALS (store securely, force reset on first login):');
    console.log('province                         | email                      | temp password');
    console.log('---------------------------------|----------------------------|---------------');
    created.forEach(c => {
      console.log(`${c.province.padEnd(32)} | ${c.email.padEnd(26)} | ${c.tempPassword}`);
    });
  }

  await pool.end();
}

main().catch(err => { console.error('\nFailed:', err); process.exit(1); });
