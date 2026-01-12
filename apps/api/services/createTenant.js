const slugify = require('../lib/slugify');
const { db } = require('../db/db');
const { tenants } = require('../db/schema');

async function createTenant({ name, status = 'active' }) {
    const slug = slugify(name);
    return await db.insert(tenants).values({ name, slug, status }).returning();
}

module.exports = { createTenant };