ALTER TABLE Devices
  ADD COLUMN power_status ENUM('co_dien','ngat_dien') NOT NULL DEFAULT 'co_dien'
  AFTER status;
