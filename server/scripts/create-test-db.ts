import { Pool } from "pg";

const dbUrl = new URL(process.env.DATABASE_URL!);
const testDbName = dbUrl.pathname.slice(1);

const adminPool = new Pool({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port || "5432"),
  user: dbUrl.username,
  password: dbUrl.password,
  database: "postgres",
});

const client = await adminPool.connect();
try {
  const result = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [testDbName]
  );
  if (result.rows.length === 0) {
    await client.query(`CREATE DATABASE "${testDbName}"`);
    console.log(`Created database: ${testDbName}`);
  } else {
    console.log(`Database already exists: ${testDbName}`);
  }
} finally {
  client.release();
  await adminPool.end();
}
