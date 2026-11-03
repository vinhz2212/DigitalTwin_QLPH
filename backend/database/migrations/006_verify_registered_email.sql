-- Tai khoan hien co duoc giu quyen dang nhap; tai khoan tu dang ky moi can xac minh email.
ALTER TABLE Users
  ADD COLUMN email_verified_at DATETIME NULL DEFAULT NULL AFTER email,
  ADD COLUMN email_verification_token_hash CHAR(64) NULL DEFAULT NULL AFTER email_verified_at,
  ADD COLUMN email_verification_expires_at DATETIME NULL DEFAULT NULL AFTER email_verification_token_hash,
  ADD UNIQUE KEY uq_users_email_verification_token (email_verification_token_hash);

UPDATE Users
SET email_verified_at = COALESCE(created_at, NOW());
