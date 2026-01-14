const express = require('express');
const { signup, login } = require('../services/auth');
const router = express.Router();

// POST /auth/signup - Create tenant + user
router.post('/signup', async (req, res) => {
    try {
        const { tenantName, email, password } = req.body;

        if (!tenantName || !email || !password) {
            return res.status(400).json({ error: 'Missing tenantName, email, or password' });
        }

        const result = await signup({ tenantName, email, password });
        res.status(201).json(result);
    } catch (error) {
        console.error('Signup error:', error.message);
        res.status(400).json({ error: error.message });
    }
});

// POST /auth/login - Authenticate user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Missing email or password' });
        }

        const result = await login({ email, password });
        res.status(200).json(result);
    } catch (error) {
        console.error('Login error:', error.message);
        res.status(401).json({ error: error.message });
    }
});

module.exports = router;