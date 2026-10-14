# Plant collection — Integrating With HubSpot I practicum

A Node.js application that reads plant records from HubSpot and creates new records from an HTML form. It uses Express, Axios, dotenv, and Pug.

## Developer test account

- Account: **Rumano Practicum - Plant Collection**
- Account ID: **149544142**
- Custom object list: [Plants in the developer test account](https://app-eu1.hubspot.com/contacts/149544142/objects/2-254891863/views/all/list)
- Object type ID: **2-254891863**
- API credential name: **Rumano's Practicum Private App** (Service Key)

This application is intended only for the isolated developer test account. It does not need a deployed website for grading.

## Run locally

Requires Node.js 20 or later.

```sh
npm ci
cp .env.example .env
```

In `.env`, set `HUBSPOT_PRIVATE_APP_TOKEN` to the test account's private app token or Service Key. Never commit this value. The `.gitignore` excludes `.env`, local environment variants, and `node_modules`.

The practicum asks for read and write access to custom schemas, custom objects, and contacts. On accounts where legacy private apps are no longer available, use a scoped Service Key instead. The application uses the same Bearer authentication header.

```sh
npm run setup
```

The setup script creates the Plants schema with three string properties (`name`, `species`, `care_notes`), enables associations with contacts, and seeds Sunny, Frond, and Jade. On repeat runs it reuses the schema and skips seed records with those names. It does not delete data. Copy the returned object type ID into `HUBSPOT_OBJECT_TYPE` in `.env`.

```sh
npm start
```

Open `http://localhost:3000`. To use another local port, set `PORT` in `.env`.

## Application routes

| Method | Route | Behavior |
| --- | --- | --- |
| GET | `/` | Reads all plant records, including subsequent result pages, and renders a three-column table. |
| GET | `/update-cobj` | Renders the new-record form with Name, Species, and Care notes. |
| POST | `/update-cobj` | Validates and submits the three properties to HubSpot, then redirects to `/`. |

The homepage links to the form with **Add to this table**. The form links back with **Return to the homepage**. Pug escapes values retrieved from the CRM. API failures return useful messages without exposing the token or raw Axios configuration.

## Validation

```sh
npm test
```

Tests use a mock HubSpot client and temporary local HTTP servers. They verify pagination, escaped CRM content, form rendering, rejected invalid input, the create-record payload and redirect, missing configuration, and permission errors. They do not send requests to HubSpot.

Live validation completed on 14 October 2026: the homepage retrieved Sunny, Frond, and Jade from HubSpot. Submitting Sprout (Chlorophytum comosum) through `/update-cobj` created a fourth CRM record, redirected to the homepage, and displayed the new row. The same four records were verified in the HubSpot Plants list. The custom-object schema includes the contact object association.

## Development and authorship

Forked from the official HubSpot Academy starter repository. Implementation assistance was provided by OpenAI Codex. The certification instructions require the learner's own work; the learner should review, understand, and adapt the implementation and confirm that their use of assistance meets the course requirements before submitting.
