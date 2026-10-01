# Datasphere
Datasphere is the sovereign append-only event/provenance plane for the SPR ecosystem.

**SPR:** what can be proven?  
**Constellation:** what may happen here?  
**Datasphere:** what happened?

## Non-negotiable rules
- Events are append-only. Corrections are new events.
- Missing evidence never becomes PASS.
- Datasphere does not authorize actions and does not manufacture trust scores.
- Every request is tenant scoped; RLS is forced on tenant data.
- M2M messages require signed, short-lived, audience-bound identities and replay protection.
- Runtime and migration database credentials are separate.

## Run
1. Create PostgreSQL and separate admin/runtime roles. The runtime role must not own tables and must not have BYPASSRLS.
2. Copy `.env.example` to `.env` and set real secrets/URLs.
3. `npm install`
4. `npm run migrate`
5. `npm run dev`

## API
- `GET /health` process liveness
- `GET /ready` database readiness
- `POST /v1/events` append an authenticated event
- `GET /v1/events/:id` retrieve tenant-scoped event
- `GET /v1/streams/:streamId/events` retrieve a tenant-scoped stream

Production readiness requires deployment proof, restricted DB-role proof, RLS attack tests, backup/restore testing, load testing, key rotation, monitoring and real SPR → Constellation → Datasphere end-to-end acceptance. Code presence alone is not proof.
