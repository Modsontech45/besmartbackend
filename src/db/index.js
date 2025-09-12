// db.js
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // required for Neon
  },
});

export default pool;




// import pg from "pg";
// import dotenv from "dotenv";
// dotenv.config();

// const { Pool } = pg;

// const pool = new Pool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD.replace(/"/g, ""), // strip quotes if present
//   database: process.env.DB_NAME,
//   port: Number(process.env.DB_PORT),
// });

// export default pool;
