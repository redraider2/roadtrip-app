const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// If the pool has an unexpected error, log it and crash
pool.on("error", (err) => {
  console.error("Unexpected PG pool error", err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
