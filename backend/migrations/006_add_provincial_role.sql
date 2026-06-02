-- 006_add_provincial_role.sql
-- Adds the 'provincial' user role + a province column on users, for
-- province-scoped access control.
--
-- Run in pgAdmin against the Render DB BEFORE deploying the scoping code
-- (the auth middleware will SELECT users.province; it must exist first).
-- Idempotent.

ALTER TABLE users ADD COLUMN IF NOT EXISTS province VARCHAR(100);

-- role is a CHECK-constrained varchar (constraint name: users_role_check).
-- Re-create it to allow 'provincial' (and 'superadmin', which the code already
-- references in requireAdmin but the old constraint omitted).
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin','superadmin','project_owner','investor','government','ngo','provincial'));
