const express = require('express');
const router = express.Router();
const { db } = require('../db/db');
const { jobs } = require('../db/schema');
const authMiddleware = require('../middleware/auth');
const { eq } = require('drizzle-orm');

// GET /jobs - Get all jobs for authenticated user's tenant
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { tenantId } = req.user;  // From JWT token
        const rows = await db.select().from(jobs).where(eq(jobs.tenantId, tenantId));
        res.status(200).json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
});

module.exports = router;