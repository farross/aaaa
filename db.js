const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id TEXT,
        service TEXT,
        price INTEGER,
        cost INTEGER,
        profit INTEGER,
        status TEXT,
        date TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        total_orders INTEGER DEFAULT 0,
        total_spent INTEGER DEFAULT 0
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS blacklist (
        user_id TEXT PRIMARY KEY
      )
    `);

    console.log("🔥 Database Ready (Tables Checked)");
  } catch (err) {
    console.error("❌ Database Error:", err);
  }
}

initDatabase();

module.exports = pool;