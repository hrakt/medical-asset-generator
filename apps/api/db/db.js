require('dotenv').config();
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');

const connectionString = process.env.DATABASE_URL;
// Log the connection string with password masked for debugging
if (connectionString) {
  const masked = connectionString.replace(/:([^:@]+)@/, ':***@');
  console.log(`Connecting to: ${masked} (K_SERVICE: ${process.env.K_SERVICE})`);
}

const pool = new Pool({
  connectionString,
  // Enable SSL for remote databases (required for Google Cloud SQL and most cloud providers)
  // Set SSL_MODE=false in .env to disable SSL for local development
  ssl: process.env.SSL_MODE === 'false' ? false : {
    rejectUnauthorized: false,
  },
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})

const db = drizzle(pool);

async function initDb() {
  console.log('Initializing DB...');
  try {
    // one-time table creation; in a real app you'd use migrations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tools (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS requests (
      id SERIAL PRIMARY KEY,
      doctor_name TEXT NOT NULL,
      practice_name TEXT NOT NULL,
      practice_type TEXT NOT NULL,
      channel TEXT NOT NULL,
      primary_message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      asset_url TEXT,
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id SERIAL PRIMARY KEY,
      "requestId" INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      locked_at TIMESTAMPTZ,
      last_error TEXT,
      "createdAt" TIMESTAMPTZ DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    );
  `);

    await pool.query(`
    ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_error TEXT;
  `);

    await pool.query(`
    ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS "requestId" INTEGER;
  `);

    await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'jobs_request_id_fkey'
      ) THEN
        ALTER TABLE jobs
        ADD CONSTRAINT jobs_request_id_fkey
        FOREIGN KEY ("requestId") REFERENCES requests(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `);

    await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'jobs' AND column_name = 'toolId'
      ) THEN
        ALTER TABLE jobs DROP COLUMN "toolId";
      END IF;
    END $$;
  `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
    -- Create unique index on slug
    CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_idx ON tenants (slug);

    -- Optional: restrict allowed status values
    ALTER TABLE tenants
      ADD CONSTRAINT tenants_status_check CHECK (status IN ('active','inactive','suspended','deleted'));
  `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        "tenantId" INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      ALTER TABLE requests
      ADD COLUMN IF NOT EXISTS "tenantId" INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE;
    `);

    await pool.query(`
      ALTER TABLE jobs
      ADD COLUMN IF NOT EXISTS "tenantId" INTEGER REFERENCES tenants(id) ON DELETE CASCADE;
    `);

    console.log('Tables created or already exist.');
  } catch (err) {
    console.error('Error in initDb:', err);
    throw err;
  }
}

module.exports = {
  db,
  initDb
}
