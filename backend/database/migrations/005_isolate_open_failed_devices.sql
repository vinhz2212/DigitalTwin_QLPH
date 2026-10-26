-- Đồng bộ các máy chiếu/điều hòa đã hỏng trước khi có nguồn điện riêng.
UPDATE Devices d
JOIN DeviceTypes dt ON dt.id = d.device_type_id
SET d.power_status = 'ngat_dien'
WHERE d.power_status = 'co_dien'
  AND d.status IN ('hong', 'dang_sua')
  AND dt.name IN ('may_chieu', 'dieu_hoa')
  AND (
    EXISTS (
      SELECT 1 FROM Incidents i
      WHERE i.room_id = d.room_id
        AND i.status <> 'da_giai_quyet'
        AND i.type = CASE dt.name
          WHEN 'may_chieu' THEN 'may_chieu_hong'
          ELSE 'dieu_hoa_hong' END
    )
    OR EXISTS (
      SELECT 1 FROM Maintenance m
      WHERE m.device_id = d.id
        AND m.status IN ('cho_xu_ly', 'dang_sua')
    )
  );
