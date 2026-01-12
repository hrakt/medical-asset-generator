const express = require('express');
const { createTenant } = require('../services/createTenant')


router.post('/', async (req, res) => {
  try {
    const { name, status = 'active' } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Tenant name is required' });
    }
    const tenant = await createTenant({ name, status });
    res.status(201).json(tenant);
  } catch (error) {
    if (error.code === '23505') {  // PostgreSQL unique violation
      return res.status(409).json({ error: 'Tenant slug already exists—try a different name' });
    }
    console.error('Error creating tenant:', error);
    res.status(500).json({ error: 'Failed to create tenant' });
  }
})

module.exports = router;