-- Bổ sung các bảng lịch sử còn thiếu trong database đang sử dụng.
-- CREATE TABLE IF NOT EXISTS giữ nguyên bảng và dữ liệu nếu chúng đã tồn tại.

CREATE TABLE IF NOT EXISTS `SensorReadings` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `room_id` INT NOT NULL,
  `temperature` DECIMAL(4,1) DEFAULT 25.0 COMMENT '°C',
  `humidity` DECIMAL(4,1) DEFAULT 55.0 COMMENT '%',
  `co2` INT DEFAULT 450 COMMENT 'ppm',
  `occupancy` INT DEFAULT 0 COMMENT 'Số người trong phòng',
  `light` INT DEFAULT 500 COMMENT 'lux',
  `smoke` INT DEFAULT 10 COMMENT 'ppm',
  `recorded_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`room_id`) REFERENCES `Rooms`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_room_recorded` (`room_id`, `recorded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `EnergyLogs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `building_id` INT NOT NULL,
  `room_id` INT DEFAULT NULL,
  `kwh` DECIMAL(8,2) NOT NULL,
  `cost` DECIMAL(10,2) NOT NULL,
  `recorded_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`building_id`) REFERENCES `Buildings`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`room_id`) REFERENCES `Rooms`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_recorded_at` (`recorded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
