CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    user_name text NOT NULL UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now()
);
