const express = require('express');
const router = express.Router();
const { db } = require('../db/db');
const { jobs } = require('../db/schema');

router.get('/', async (req, res) => {
    try {
        const rows = await db.select().from(jobs);
        res.status(200).json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
})

module.exports = router