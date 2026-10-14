require('dotenv').config();
const axios = require('axios');

// Run once in the isolated developer test account. This script never touches
// an account unless its private app/service key is explicitly supplied locally.
async function setup() {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) throw new Error('Set HUBSPOT_PRIVATE_APP_TOKEN in .env first.');
  const api = axios.create({ baseURL: 'https://api.hubapi.com',
    headers: { Authorization: `Bearer ${token}` }, timeout: 15000 });
  const schemas = await api.get('/crm/v3/schemas');
  let schema = schemas.data.results.find(item => item.name === 'practicum_plants');
  if (!schema) {
    const response = await api.post('/crm/v3/schemas', {
      name: 'practicum_plants', labels: { singular: 'Plant', plural: 'Plants' },
      primaryDisplayProperty: 'name', requiredProperties: ['name'],
      searchableProperties: ['name', 'species'],
      secondaryDisplayProperties: ['species', 'care_notes'],
      associatedObjects: ['CONTACT'],
      properties: [
        { name: 'name', label: 'Name', type: 'string', fieldType: 'text' },
        { name: 'species', label: 'Species', type: 'string', fieldType: 'text' },
        { name: 'care_notes', label: 'Care notes', type: 'string', fieldType: 'textarea' }
      ]
    });
    schema = response.data;
  }
  const objectType = schema.objectTypeId;
  const endpoint = `/crm/v3/objects/${encodeURIComponent(objectType)}`;
  const existingNames = new Set();
  let after;
  do {
    const response = await api.get(endpoint, { params: { properties: 'name', limit: 100, ...(after ? { after } : {}) } });
    response.data.results.forEach(record => existingNames.add(record.properties.name));
    after = response.data.paging?.next?.after;
  } while (after !== undefined && after !== null);
  const plants = [
    { name: 'Sunny', species: 'Aloe vera', care_notes: 'Bright indirect light; allow soil to dry before watering.' },
    { name: 'Frond', species: 'Boston fern', care_notes: 'Keep soil lightly moist; prefers humid, indirect light.' },
    { name: 'Jade', species: 'Crassula ovata', care_notes: 'Use well-draining soil; water sparingly.' }
  ];
  for (const properties of plants) {
    if (!existingNames.has(properties.name)) await api.post(endpoint, { properties });
  }
  console.log(`Object ready: ${objectType}`);
  console.log(`Add HUBSPOT_OBJECT_TYPE=${objectType} to .env.`);
  console.log('Seed records ready: Sunny, Frond, Jade.');
}

setup().catch(error => {
  console.error('Setup failed:', error.response?.status || error.message,
    error.response?.data?.correlationId ? `correlationId=${error.response.data.correlationId}` : '');
  process.exitCode = 1;
});
