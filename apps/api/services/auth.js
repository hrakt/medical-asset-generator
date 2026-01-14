const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../db/db');
const { users, tenants } = require('../db/schema');
const slugify = require('../lib/slugify');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-prod';
const JWT_EXPIRY = '7d';

// Sign up: Create tenant + user
async function signup({ tenantName, email, password }) {
    try {
        // 1. Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // 2. Generate unique tenant slug
        const slug = slugify(tenantName);

        // 3. Create tenant
        const [tenant] = await db
            .insert(tenants)
            .values({ name: tenantName, slug, status: 'active' })
            .returning();

        // 4. Create user (linked to tenant)
        const [user] = await db
            .insert(users)
            .values({ tenantId: tenant.id, email, passwordHash: passwordHash, status: 'active' })
            .returning();

        // 5. Generate JWT
        const token = jwt.sign(
            { userId: user.id, tenantId: tenant.id, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );

        return { token, user: { id: user.id, email: user.email, tenantId: tenant.id }, tenant };
    } catch (error) {
        if (error.code === '23505') {  // Unique violation (email already exists)
            throw new Error('Email already exists');
        }
        throw error;
    }
}

// Login: Validate credentials, return JWT
async function login({ email, password }) {
    const [user] = await db.select().from(users).where(users.email.eq(email)).limit(1);

    if (!user) {
        throw new Error('Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
        throw new Error('Invalid email or password');
    }

    const token = jwt.sign(
        { userId: user.id, tenantId: user.tenantId, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
    );

    return { token, user: { id: user.id, email: user.email, tenantId: user.tenantId } };
}

// Verify JWT token (used in middleware)
function verifyToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

module.exports = { signup, login, verifyToken };