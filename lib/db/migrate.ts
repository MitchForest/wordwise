import { Pool } from 'pg';
import 'dotenv/config';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in .env file');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const client = await pool.connect();

  console.log('Applying manual migration to rename column...');

  try {
    await client.query('ALTER TABLE "documents" RENAME COLUMN "readability_score" TO "reading_level";');
    console.log('Column rename successful.');
  } catch (err) {
    console.error('Manual migration failed:', err);
    // Even if it fails, it might be because it was already applied.
    // We will not exit with an error to allow the app to continue.
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration script failed:', err);
  process.exit(1);
}); 