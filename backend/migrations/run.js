#!/usr/bin/env node
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const sqlFile = path.join(__dirname, '001_initial_schema.sql');
const sql = fs.readFileSync(sqlFile, 'utf-8');

const client = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'bcpp_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

(async () => {
  try {
    await client.connect();
    console.log('📦 Applying migrations...');
    await client.query(sql);
    console.log('✅ Database schema is up to date');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
