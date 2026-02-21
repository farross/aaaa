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
        seller_id TEXT,
        service TEXT,
        price INTEGER,
        status TEXT,
        date TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log("🔥 Database Ready");
  } catch (err) {
    console.error("DB ERROR:", err);
  }
}

initDatabase();

module.exports = pool;
