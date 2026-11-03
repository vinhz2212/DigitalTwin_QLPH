-- Giu phieu bao tri khi tai khoan nguoi bao da bi xoa vinh vien.
ALTER TABLE Maintenance
  MODIFY COLUMN reported_by INT NULL;
