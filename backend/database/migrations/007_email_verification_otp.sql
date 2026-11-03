-- Gioi han so lan nhap sai ma OTP. Ma xac minh cu co the duoc thay bang ma moi khi gui lai.
ALTER TABLE Users
  ADD COLUMN email_verification_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0
  AFTER email_verification_expires_at;
