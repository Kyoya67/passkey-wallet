CREATE TABLE IF NOT EXISTS credentials (
    credential_id text PRIMARY KEY,
    public_key text NOT NULL,
    aaguid text NOT NULL,
    device_type text NOT NULL,
    synced boolean NOT NULL DEFAULT false,
    registered_at timestamptz NOT NULL,
    last_used_at timestamptz NULL,
    user_id text NOT NULL REFERENCES users(user_id) ON DELETE CASCADE
)
