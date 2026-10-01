BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS tenants(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 stream_id text NOT NULL, sequence bigint NOT NULL, event_type text NOT NULL,
 producer text NOT NULL, producer_event_id text NOT NULL, occurred_at timestamptz NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(), payload jsonb NOT NULL, payload_hash text NOT NULL,
 previous_event_hash text, event_hash text NOT NULL, correction_of uuid REFERENCES events(id),
 UNIQUE(tenant_id,producer,producer_event_id), UNIQUE(tenant_id,stream_id,sequence)
);
CREATE TABLE IF NOT EXISTS replay_guard(tenant_id uuid NOT NULL REFERENCES tenants(id),issuer text NOT NULL,jti text NOT NULL,expires_at timestamptz NOT NULL,PRIMARY KEY(tenant_id,issuer,jti));
CREATE TABLE IF NOT EXISTS audit_log(id bigserial PRIMARY KEY,tenant_id uuid NOT NULL REFERENCES tenants(id),actor text NOT NULL,action text NOT NULL,target text,occurred_at timestamptz NOT NULL DEFAULT now(),details jsonb NOT NULL DEFAULT '{}'::jsonb);
CREATE INDEX IF NOT EXISTS events_tenant_time_idx ON events(tenant_id,received_at DESC);
CREATE INDEX IF NOT EXISTS events_stream_idx ON events(tenant_id,stream_id,sequence);
ALTER TABLE events ENABLE ROW LEVEL SECURITY; ALTER TABLE events FORCE ROW LEVEL SECURITY;
ALTER TABLE replay_guard ENABLE ROW LEVEL SECURITY; ALTER TABLE replay_guard FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY; ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS events_tenant ON events; CREATE POLICY events_tenant ON events USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));
DROP POLICY IF EXISTS replay_tenant ON replay_guard; CREATE POLICY replay_tenant ON replay_guard USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));
DROP POLICY IF EXISTS audit_tenant ON audit_log; CREATE POLICY audit_tenant ON audit_log USING (tenant_id::text=current_setting('app.tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.tenant_id',true));
CREATE OR REPLACE FUNCTION deny_event_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'datasphere events are append-only'; END $$;
DROP TRIGGER IF EXISTS events_immutable ON events; CREATE TRIGGER events_immutable BEFORE UPDATE OR DELETE ON events FOR EACH ROW EXECUTE FUNCTION deny_event_mutation();
COMMIT;
