require('dotenv').config();
const path = require('node:path');
const express = require('express');
const axios = require('axios');

const FIELDS = ['name', 'species', 'care_notes'];

function createApp({ token = process.env.HUBSPOT_PRIVATE_APP_TOKEN,
  objectType = process.env.HUBSPOT_OBJECT_TYPE, client = axios } = {}) {
  const app = express();
  app.set('view engine', 'pug');
  app.set('views', path.join(__dirname, 'views'));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.urlencoded({ extended: false, limit: '16kb' }));
  const endpoint = `https://api.hubapi.com/crm/v3/objects/${encodeURIComponent(objectType || '')}`;
  const options = { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 };

  function configured(req, res, next) {
    if (!token || !objectType) {
      return res.status(503).render('error', { title: 'Setup required',
        message: 'Set HUBSPOT_PRIVATE_APP_TOKEN and HUBSPOT_OBJECT_TYPE in your local .env file. See the README for setup instructions.' });
    }
    next();
  }

  app.get('/', configured, async (req, res, next) => {
    try {
      const data = [];
      let after;
      do {
        const response = await client.get(endpoint, { ...options,
          params: { properties: FIELDS.join(','), limit: 100, ...(after ? { after } : {}) } });
        data.push(...response.data.results);
        after = response.data.paging?.next?.after;
      } while (after !== undefined && after !== null);
      res.render('homepage', { title: 'Plant collection | HubSpot practicum', data });
    } catch (error) { next(error); }
  });

  app.get('/update-cobj', (req, res) => {
    res.render('updates', { title: 'Update Custom Object Form | Integrating With HubSpot I Practicum', values: {}, errors: [] });
  });

  app.post('/update-cobj', configured, async (req, res, next) => {
    const properties = Object.fromEntries(FIELDS.map(field => [field,
      typeof req.body[field] === 'string' ? req.body[field].trim() : '']));
    const errors = FIELDS.filter(field => !properties[field]).map(field => `${field.replaceAll('_', ' ')} is required.`);
    if (FIELDS.some(field => properties[field].length > 1000)) errors.push('Each field must be at most 1,000 characters.');
    if (errors.length) return res.status(400).render('updates', {
      title: 'Update Custom Object Form | Integrating With HubSpot I Practicum', values: properties, errors });
    try {
      await client.post(endpoint, { properties }, options);
      res.redirect(303, '/');
    } catch (error) { next(error); }
  });

  app.use((error, req, res, next) => {
    // Never log Axios errors directly: their config includes the bearer token.
    const status = error.response?.status;
    console.error('HubSpot request failed', { status: status || 'network', correlationId: error.response?.data?.correlationId });
    res.status(502).render('error', { title: 'HubSpot request failed',
      message: status === 401 ? 'HubSpot rejected the access token. Check your local .env file.'
        : status === 403 ? 'The private app needs permission to read and write this object.'
        : status === 429 ? 'HubSpot is temporarily rate limiting requests. Please try again shortly.'
        : 'We could not complete the request to HubSpot. Please try again. Before retrying a new record, check the table to avoid creating a duplicate.' });
  });
  return app;
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  createApp().listen(port, '127.0.0.1', () => console.log(`Listening on http://localhost:${port}`));
}
module.exports = { createApp };
