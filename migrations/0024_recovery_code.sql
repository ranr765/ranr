-- Recovery code for self-serve password reset (no email needed). Only the HASH
-- of the code is stored, like the password. ADDITIVE ONLY — new columns default
-- to empty (no recovery code set until the owner generates one).

ALTER TABLE users ADD COLUMN recovery_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN recovery_salt TEXT NOT NULL DEFAULT '';
