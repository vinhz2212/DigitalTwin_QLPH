ALTER TABLE Devices
  ADD COLUMN power_cut_previous_status ENUM('hoat_dong','tat','hong','dang_sua') DEFAULT NULL
  AFTER status;
