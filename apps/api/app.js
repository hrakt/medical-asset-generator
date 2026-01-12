const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());

app.use('/requests', require('./routes/requests'));

app.use('/jobs', require('./routes/jobs'));

app.use('/tools', require('./routes/tools'));

app.use('/tenants', require('./routes/tenants'));

module.exports = app;
