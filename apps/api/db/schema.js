const { pgTable, serial, text, boolean, timestamp, integer } = require('drizzle-orm/pg-core');

const tenants = pgTable('tenants', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    status: text('status').notNull().default('active'),
    slug: text('slug').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow(),
});

const tools = pgTable('tools', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    type: text('type').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow(),
});

const users = pgTable('users', {
    id: serial('id').primaryKey(),
    tenantId: integer('tenantId').notNull().references(() => tenants.id),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    status: text('status').notNull().default('active'),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow(),
});

const requests = pgTable('requests', {
    id: serial('id').primaryKey(),
    tenantId: integer('tenantId').notNull().references(() => tenants.id),
    userId: integer('userId').notNull().references(() => users.id),
    doctorName: text('doctor_name').notNull(),
    practiceName: text('practice_name').notNull(),
    practiceType: text('practice_type').notNull(),
    channel: text('channel').notNull(),
    primaryMessage: text('primary_message').notNull(),
    status: text('status').notNull().default('pending'),
    assetUrl: text('asset_url'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

const jobs = pgTable('jobs', {
    id: serial('id').primaryKey(),
    requestId: integer('requestId').notNull().references(() => requests.id),
    tenantId: integer('tenantId').notNull().references(() => tenants.id),
    type: text('type').notNull(),
    status: text('status').notNull().default('queued'),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    runAt: timestamp('run_at', { withTimezone: true }).notNull().defaultNow(),
    lockedAt: timestamp('locked_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow(),
});

module.exports = { tools, jobs, requests, tenants, users };
