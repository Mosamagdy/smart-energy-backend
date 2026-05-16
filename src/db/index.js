const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: String(config.db.password), // ضمان إن الباسورد string دايماً
  database: config.db.database,
  max: config.db.max,
  idleTimeoutMillis: config.db.idleTimeoutMillis,
  ssl: {
    rejectUnauthorized: false // مطلوب لـ Supabase
  }
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL idle client error', err);
  process.exit(-1);
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = {
  pool,
  query
};