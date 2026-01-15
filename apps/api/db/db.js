require('dotenv').config();
const { Pool } = require('pg');
const { drizzle } = require('drizzle-orm/node-postgres');

const connectionString = process.env.DATABASE_URL;
if (connectionString) {
  const masked = connectionString.replace(/:([^:@]+)@/, ':***@');
  console.log(`Connecting to: ${masked} (K_SERVICE: ${process.env.K_SERVICE})`);
}

const pool = new Pool({
  connectionString,
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
    // Tools table
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

    // Tenants table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Users table (linked to tenants)
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

    // Requests table (with tenantId + userId)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        "tenantId" INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

    // Jobs table (with tenantId)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id SERIAL PRIMARY KEY,
        "requestId" INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
        "tenantId" INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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

    // Backfill/migrate columns for existing tables.
    await pool.query(`
      ALTER TABLE requests
      ADD COLUMN IF NOT EXISTS "tenantId" INTEGER,
      ADD COLUMN IF NOT EXISTS "userId" INTEGER;
    `);

    await pool.query(`
      ALTER TABLE jobs
      ADD COLUMN IF NOT EXISTS "requestId" INTEGER,
      ADD COLUMN IF NOT EXISTS "tenantId" INTEGER,
      ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS max_attempts INTEGER NOT NULL DEFAULT 3,
      ADD COLUMN IF NOT EXISTS run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_error TEXT;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'requests_tenantid_fkey'
        ) THEN
          ALTER TABLE requests
          ADD CONSTRAINT requests_tenantId_fkey
          FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'requests_userid_fkey'
        ) THEN
          ALTER TABLE requests
          ADD CONSTRAINT requests_userId_fkey
          FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'jobs_requestid_fkey'
        ) THEN
          ALTER TABLE jobs
          ADD CONSTRAINT jobs_requestId_fkey
          FOREIGN KEY ("requestId") REFERENCES requests(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'jobs_tenantid_fkey'
        ) THEN
          ALTER TABLE jobs
          ADD CONSTRAINT jobs_tenantId_fkey
          FOREIGN KEY ("tenantId") REFERENCES tenants(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    // Indexes
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_idx ON tenants (slug);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS requests_tenant_idx ON requests ("tenantId");
      CREATE INDEX IF NOT EXISTS requests_user_idx ON requests ("userId");
      CREATE INDEX IF NOT EXISTS jobs_tenant_idx ON jobs ("tenantId");
      CREATE INDEX IF NOT EXISTS jobs_request_idx ON jobs ("requestId");
    `);

    console.log('✅ All tables created successfully.');
  } catch (err) {
    console.error('❌ Error in initDb:', err);
    throw err;
  }
}

module.exports = {
  db,
  initDb
}
