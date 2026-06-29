import {
  createPostgresDatabase,
  createPostgresPool,
  migratePostgresDatabase,
} from './postgres.js';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run database migrations.');
}

const pool = createPostgresPool({ connectionString });
const db = createPostgresDatabase(pool);

try {
  await migratePostgresDatabase(db);
  console.log('Database migrations applied.');
} finally {
  await db.destroy();
}
