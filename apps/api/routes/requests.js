const express = require('express');
const router = express.Router();
const { db } = require('../db/db');
const { requests, jobs } = require('../db/schema');
const { eq } = require('drizzle-orm');
const authMiddleware = require('../middleware/auth');

// POST /requests - Create request (requires auth)
router.post('/', authMiddleware, async (req, res) => {
    const { doctorName, practiceName, practiceType, channel, primaryMessage } = req.body;
    const { userId, tenantId } = req.user;

    // Basic validation
    if (!doctorName || !practiceName || !practiceType || !channel || !primaryMessage) {
        return res.status(400).json({ error: 'Missing required fields: doctorName, practiceName, practiceType, channel, primaryMessage' });
    }

    try {
        // Insert new request with tenant + user context
        const [newRequest] = await db.insert(requests).values({
            tenantId,
            userId,
            doctorName,
            practiceName,
            practiceType,
            channel,
            primaryMessage,
            status: 'pending'
        }).returning();

        // Create job linked to tenant
        await db.insert(jobs).values({
            requestId: newRequest.id,
            tenantId,
            type: 'generate-asset',
            status: 'queued'
        });

        res.status(202).json(newRequest);

    } catch (err) {
        console.error('Failed to create request:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /requests/all - Get all requests for authenticated user's tenant
router.get('/all', authMiddleware, async (req, res) => {
    try {
        const { tenantId } = req.user;
        const allRequests = await db.select().from(requests).where(eq(requests.tenantId, tenantId));
        res.json(allRequests);
    } catch (err) {
        console.error('Failed to fetch requests:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /requests/:id - Get single request (verify ownership)
router.get('/:id', authMiddleware, async (req, res) => {
    const id = Number(req.params.id);
    const { tenantId } = req.user;

    if (Number.isNaN(id)) {
        return res.status(400).json({ error: 'Invalid ID' });
    }

    try {
        const [request] = await db.select().from(requests).where(eq(requests.id, id));

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // Verify tenant ownership
        if (request.tenantId !== tenantId) {
            return res.status(403).json({ error: 'Forbidden: You do not have access to this request' });
        }

        res.json(request);

    } catch (err) {
        console.error('Failed to fetch request:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
