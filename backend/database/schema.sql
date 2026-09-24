-- ============================================================
-- DIGITAL TWIN SMART CAMPUS - DATABASE SCHEMA & SEED DATA
-- Database Name: smart_campus
-- MySQL Version: 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS `smart_campus` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `smart_campus`;

-- Disable FK checks for clean reset
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `AIAnalysis`;
DROP TABLE IF EXISTS `ActivityLogs`;
DROP TABLE IF EXISTS `Notifications`;
DROP TABLE IF EXISTS `Bookings`;
DROP TABLE IF EXISTS `Schedules`;
DROP TABLE IF EXISTS `Maintenance`;
DROP TABLE IF EXISTS `Incidents`;
DROP TABLE IF EXISTS `Devices`;
DROP TABLE IF EXISTS `DeviceTypes`;
DROP TABLE IF EXISTS `SensorReadings`;
DROP TABLE IF EXISTS `EnergyLogs`;
DROP TABLE IF EXISTS `Rooms`;
DROP TABLE IF EXISTS `Floors`;
DROP TABLE IF EXISTS `Buildings`;
DROP TABLE IF EXISTS `Users`;
DROP TABLE IF EXISTS `Roles`;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- 1. Table: Roles
-- ------------------------------------------------------------
CREATE TABLE `Roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `description` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `Roles` (`id`, `name`, `description`) VALUES
(1, 'admin', 'Quản trị viên hệ thống'),
(2, 'giang_vien', 'Giảng viên đăng ký phòng và theo dõi học tập'),
(3, 'ky_thuat_vien', 'Kỹ thuật viên quản lý thiết bị và sự cố');

-- ------------------------------------------------------------
-- 2. Table: Users
-- Default password: "password123" (bcrypt hash)
-- ------------------------------------------------------------
CREATE TABLE `Users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `role_id` INT NOT NULL,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `email` VARCHAR(100) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `avatar` VARCHAR(255) DEFAULT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `Roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Hash below corresponds to password "admin123"
INSERT INTO `Users` (`id`, `role_id`, `username`, `email`, `password_hash`, `full_name`, `phone`) VALUES
(1, 1, 'admin', 'admin@smartcampus.edu.vn', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'Nguyễn Văn Admin', '0901234567'),
(2, 2, 'giangvien', 'giangvien@smartcampus.edu.vn', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'Trần Thị Giảng Viên', '0912345678'),
(3, 3, 'kythuat', 'kythuat@smartcampus.edu.vn', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeg6Lruj3vjPGga31lW', 'Lê Văn Kỹ Thuật', '0923456789');

-- ------------------------------------------------------------
-- 3. Table: Buildings
-- ------------------------------------------------------------
CREATE TABLE `Buildings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(10) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `total_floors` INT DEFAULT 5,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `Buildings` (`id`, `code`, `name`, `description`, `total_floors`) VALUES
(1, 'A', 'Tòa nhà A', 'Tòa nhà lý thuyết chính', 5),
(2, 'B', 'Tòa nhà B', 'Tòa nhà thực hành & hội trường', 5);

-- ------------------------------------------------------------
-- 4. Table: Floors
-- ------------------------------------------------------------
CREATE TABLE `Floors` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `building_id` INT NOT NULL,
  `floor_number` INT NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`building_id`) REFERENCES `Buildings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uk_building_floor` (`building_id`, `floor_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `Floors` (`id`, `building_id`, `floor_number`, `name`) VALUES
(1, 1, 1, 'Tầng 1 - Tòa A'),
(2, 1, 2, 'Tầng 2 - Tòa A'),
(3, 1, 3, 'Tầng 3 - Tòa A'),
(4, 1, 4, 'Tầng 4 - Tòa A'),
(5, 1, 5, 'Tầng 5 - Tòa A'),
(6, 2, 1, 'Tầng 1 - Tòa B'),
(7, 2, 2, 'Tầng 2 - Tòa B'),
(8, 2, 3, 'Tầng 3 - Tòa B'),
(9, 2, 4, 'Tầng 4 - Tòa B'),
(10, 2, 5, 'Tầng 5 - Tòa B');

-- ------------------------------------------------------------
-- 5. Table: Rooms (40 rooms: 20 in Building A, 20 in Building B)
-- ------------------------------------------------------------
CREATE TABLE `Rooms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `floor_id` INT NOT NULL,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `capacity` INT NOT NULL DEFAULT 40,
  `type` ENUM('ly_thuyet', 'thuc_hanh', 'hoi_truong') NOT NULL DEFAULT 'ly_thuyet',
  `status` ENUM('trong', 'dang_hoc', 'bao_tri', 'su_co') NOT NULL DEFAULT 'trong',
  `description` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`floor_id`) REFERENCES `Floors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert 40 Rooms
INSERT INTO `Rooms` (`id`, `floor_id`, `code`, `name`, `capacity`, `type`, `status`, `description`) VALUES
-- Building A - Floor 1
(1, 1, 'A101', 'Phòng học A101', 45, 'ly_thuyet', 'trong', 'Phòng học lý thuyết tầng 1'),
(2, 1, 'A102', 'Phòng học A102', 45, 'ly_thuyet', 'dang_hoc', 'Phòng học lý thuyết tầng 1'),
(3, 1, 'A103', 'Phòng học A103', 45, 'ly_thuyet', 'trong', 'Phòng học lý thuyết tầng 1'),
(4, 1, 'A104', 'Phòng thực hành A104', 35, 'thuc_hanh', 'trong', 'Phòng máy tính tầng 1'),
-- Building A - Floor 2
(5, 2, 'A201', 'Phòng học A201', 50, 'ly_thuyet', 'dang_hoc', 'Phòng học lý thuyết tầng 2'),
(6, 2, 'A202', 'Phòng học A202', 50, 'ly_thuyet', 'trong', 'Phòng học lý thuyết tầng 2'),
(7, 2, 'A203', 'Phòng học A203', 50, 'ly_thuyet', 'trong', 'Phòng học lý thuyết tầng 2'),
(8, 2, 'A204', 'Phòng học A204', 50, 'ly_thuyet', 'bao_tri', 'Phòng đang bảo trì thiết bị'),
-- Building A - Floor 3
(9, 3, 'A301', 'Phòng học A301', 40, 'ly_thuyet', 'trong', 'Phòng học lý thuyết tầng 3'),
(10, 3, 'A302', 'Phòng học A302', 40, 'ly_thuyet', 'dang_hoc', 'Phòng học lý thuyết tầng 3'),
(11, 3, 'A303', 'Phòng thực hành A303', 35, 'thuc_hanh', 'trong', 'Phòng thực hành tin học'),
(12, 3, 'A304', 'Phòng học A304', 40, 'ly_thuyet', 'trong', 'Phòng học lý thuyết tầng 3'),
-- Building A - Floor 4
(13, 4, 'A401', 'Phòng học A401', 40, 'ly_thuyet', 'dang_hoc', 'Phòng học lý thuyết tầng 4'),
(14, 4, 'A402', 'Phòng học A402', 40, 'ly_thuyet', 'trong', 'Phòng học lý thuyết tầng 4'),
(15, 4, 'A403', 'Phòng học A403', 40, 'ly_thuyet', 'su_co', 'Sự cố nhiệt độ cao'),
(16, 4, 'A404', 'Phòng học A404', 40, 'ly_thuyet', 'trong', 'Phòng học lý thuyết tầng 4'),
-- Building A - Floor 5
(17, 5, 'A501', 'Phòng hội trường A501', 120, 'hoi_truong', 'trong', 'Hội trường tầng 5 Tòa A'),
(18, 5, 'A502', 'Phòng học A502', 40, 'ly_thuyet', 'dang_hoc', 'Phòng học lý thuyết tầng 5'),
(19, 5, 'A503', 'Phòng học A503', 40, 'ly_thuyet', 'trong', 'Phòng học lý thuyết tầng 5'),
(20, 5, 'A504', 'Phòng học A504', 40, 'ly_thuyet', 'trong', 'Phòng học lý thuyết tầng 5'),
-- Building B - Floor 1
(21, 6, 'B101', 'Phòng thực hành B101', 35, 'thuc_hanh', 'trong', 'Phòng thực hành mạng'),
(22, 6, 'B102', 'Phòng thực hành B102', 35, 'thuc_hanh', 'dang_hoc', 'Phòng thực hành phần mềm'),
(23, 6, 'B103', 'Phòng học B103', 45, 'ly_thuyet', 'trong', 'Phòng học Tòa B'),
(24, 6, 'B104', 'Phòng học B104', 45, 'ly_thuyet', 'trong', 'Phòng học Tòa B'),
-- Building B - Floor 2
(25, 7, 'B201', 'Phòng học B201', 45, 'ly_thuyet', 'dang_hoc', 'Phòng học Tòa B'),
(26, 7, 'B202', 'Phòng học B202', 45, 'ly_thuyet', 'trong', 'Phòng học Tòa B'),
(27, 7, 'B203', 'Phòng thực hành B203', 35, 'thuc_hanh', 'trong', 'Phòng thực hành IoT'),
(28, 7, 'B204', 'Phòng học B204', 45, 'ly_thuyet', 'trong', 'Phòng học Tòa B'),
-- Building B - Floor 3
(29, 8, 'B301', 'Phòng học B301', 40, 'ly_thuyet', 'trong', 'Phòng học Tòa B'),
(30, 8, 'B302', 'Phòng học B302', 40, 'ly_thuyet', 'su_co', 'Máy chiếu bị hỏng'),
(31, 8, 'B303', 'Phòng thực hành B303', 35, 'thuc_hanh', 'dang_hoc', 'Phòng vi điều khiển'),
(32, 8, 'B304', 'Phòng học B304', 40, 'ly_thuyet', 'trong', 'Phòng học Tòa B'),
-- Building B - Floor 4
(33, 9, 'B401', 'Phòng học B401', 40, 'ly_thuyet', 'trong', 'Phòng học Tòa B'),
(34, 9, 'B402', 'Phòng học B402', 40, 'ly_thuyet', 'dang_hoc', 'Phòng học Tòa B'),
(35, 9, 'B403', 'Phòng thực hành B403', 35, 'thuc_hanh', 'trong', 'Phòng đồ họa multimedia'),
(36, 9, 'B404', 'Phòng học B404', 40, 'ly_thuyet', 'bao_tri', 'Bảo trì hệ thống lạnh'),
-- Building B - Floor 5
(37, 10, 'B501', 'Hội trường lớn B501', 150, 'hoi_truong', 'trong', 'Hội trường lớn Tòa B'),
(38, 10, 'B502', 'Phòng học B502', 40, 'ly_thuyet', 'trong', 'Phòng học Tòa B'),
(39, 10, 'B503', 'Phòng học B503', 40, 'ly_thuyet', 'dang_hoc', 'Phòng học Tòa B'),
(40, 10, 'B504', 'Phòng học B504', 40, 'ly_thuyet', 'trong', 'Phòng học Tòa B');

-- ------------------------------------------------------------
-- 6. Table: DeviceTypes
-- ------------------------------------------------------------
CREATE TABLE `DeviceTypes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(50) NOT NULL,
  `icon` VARCHAR(50) DEFAULT 'device',
  `description` VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `DeviceTypes` (`id`, `code`, `name`, `icon`, `description`) VALUES
(1, 'den', 'den', 'Lightbulb', 'Hệ thống đèn chiếu sáng'),
(2, 'dieu_hoa', 'dieu_hoa', 'Snowflake', 'Điều hòa nhiệt độ'),
(3, 'may_chieu', 'may_chieu', 'Projector', 'Máy chiếu giảng dạy'),
(4, 'quat', 'quat', 'Fan', 'Quạt trần/Quạt thông gió'),
(5, 'loa', 'loa', 'Volume2', 'Hệ thống âm thanh / Loa'),
(6, 'may_tinh', 'may_tinh', 'Monitor', 'Máy tính phòng học / Server');

-- ------------------------------------------------------------
-- 7. Table: Devices (6 devices per room * 40 rooms = 240 devices)
-- ------------------------------------------------------------
CREATE TABLE `Devices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `room_id` INT NOT NULL,
  `device_type_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `status` ENUM('hoat_dong', 'tat', 'hong', 'dang_sua') NOT NULL DEFAULT 'tat',
  `installed_at` DATE DEFAULT NULL,
  `last_maintenance` DATE DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`room_id`) REFERENCES `Rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`device_type_id`) REFERENCES `DeviceTypes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Procedure to generate 6 devices for each of the 40 rooms
DELIMITER //
CREATE PROCEDURE generate_devices()
BEGIN
  DECLARE r_id INT DEFAULT 1;
  DECLARE r_code VARCHAR(20);
  
  WHILE r_id <= 40 DO
    SELECT code INTO r_code FROM Rooms WHERE id = r_id;
    
    INSERT INTO Devices (room_id, device_type_id, name, status, installed_at, last_maintenance) VALUES
    (r_id, 1, CONCAT('Đèn chiếu sáng ', r_code), 'hoat_dong', '2023-01-15', '2024-01-10'),
    (r_id, 2, CONCAT('Điều hòa ', r_code), IF(r_id IN (15, 36), 'hong', 'hoat_dong'), '2023-01-15', '2024-02-01'),
    (r_id, 3, CONCAT('Máy chiếu ', r_code), IF(r_id = 30, 'hong', 'hoat_dong'), '2023-01-15', '2024-01-15'),
    (r_id, 4, CONCAT('Quạt thông gió ', r_code), 'hoat_dong', '2023-01-15', '2024-01-05'),
    (r_id, 5, CONCAT('Hệ thống Loa ', r_code), 'hoat_dong', '2023-01-15', '2024-03-01'),
    (r_id, 6, CONCAT('Máy tính giáo viên ', r_code), 'hoat_dong', '2023-01-15', '2024-02-15');
    
    SET r_id = r_id + 1;
  END WHILE;
END //
DELIMITER ;

CALL generate_devices();
DROP PROCEDURE IF EXISTS generate_devices;

-- ------------------------------------------------------------
-- 8. Table: Incidents
-- ------------------------------------------------------------
CREATE TABLE `Incidents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `room_id` INT NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `severity` ENUM('thap', 'trung', 'cao', 'nghiem_trong') NOT NULL DEFAULT 'trung',
  `status` ENUM('dang_xay_ra', 'dang_xu_ly', 'da_giai_quyet') NOT NULL DEFAULT 'dang_xay_ra',
  `triggered_by` INT DEFAULT NULL,
  `simulated` BOOLEAN DEFAULT FALSE,
  `occurred_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` DATETIME DEFAULT NULL,
  FOREIGN KEY (`room_id`) REFERENCES `Rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`triggered_by`) REFERENCES `Users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `Incidents` (`id`, `room_id`, `type`, `description`, `severity`, `status`, `triggered_by`, `simulated`, `occurred_at`) VALUES
(1, 15, 'dieu_hoa_hong', 'Nhiệt độ phòng tăng cao do điều hòa ngừng chạy', 'cao', 'dang_xay_ra', 1, TRUE, NOW() - INTERVAL 2 HOUR),
(2, 30, 'may_chieu_hong', 'Máy chiếu bị chập nguồn không lên hình', 'trung', 'dang_xay_ra', 1, TRUE, NOW() - INTERVAL 1 HOUR),
(3, 8, 'mat_dien', 'Mất điện cục bộ phòng A204', 'trung', 'dang_xu_ly', 1, FALSE, NOW() - INTERVAL 5 HOUR);

-- ------------------------------------------------------------
-- 9. Table: Maintenance
-- ------------------------------------------------------------
CREATE TABLE `Maintenance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `device_id` INT NOT NULL,
  `reported_by` INT NOT NULL,
  `resolved_by` INT DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `image_url` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('cho_xu_ly', 'dang_sua', 'da_xong') NOT NULL DEFAULT 'cho_xu_ly',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` DATETIME DEFAULT NULL,
  FOREIGN KEY (`device_id`) REFERENCES `Devices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`reported_by`) REFERENCES `Users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (`resolved_by`) REFERENCES `Users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `Maintenance` (`id`, `device_id`, `reported_by`, `status`, `description`, `created_at`) VALUES
(1, 86, 2, 'dang_sua', 'Sửa chữa bóng đèn máy chiếu phòng B302', NOW() - INTERVAL 1 DAY),
(2, 44, 2, 'cho_xu_ly', 'Bảo trì dàn lạnh điều hòa phòng A204', NOW() - INTERVAL 3 HOUR);

-- ------------------------------------------------------------
-- 10. Table: Schedules
-- ------------------------------------------------------------
CREATE TABLE `Schedules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `room_id` INT NOT NULL,
  `subject` VARCHAR(100) NOT NULL,
  `instructor` VARCHAR(100) NOT NULL,
  `day_of_week` TINYINT NOT NULL COMMENT '2: T2, 3: T3, ..., 7: T7, 8: CN',
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `semester` VARCHAR(20) DEFAULT 'HK1-2024',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`room_id`) REFERENCES `Rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `Schedules` (`room_id`, `subject`, `instructor`, `day_of_week`, `start_time`, `end_time`, `semester`) VALUES
(2, 'Lập trình Web nâng cao', 'ThS. Nguyễn Văn A', 2, '07:00:00', '09:15:00', 'HK1-2024'),
(5, 'Cấu trúc dữ liệu & Giải thuật', 'TS. Trần Thị B', 2, '09:30:00', '11:45:00', 'HK1-2024'),
(10, 'Hệ quản trị CSDL', 'ThS. Lê Văn C', 3, '13:00:00', '15:15:00', 'HK1-2024'),
(22, 'Thực hành Mạng máy tính', 'KS. Hoàng Văn D', 4, '07:00:00', '11:00:00', 'HK1-2024');

-- ------------------------------------------------------------
-- 11. Table: Bookings
-- ------------------------------------------------------------
CREATE TABLE `Bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `room_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `purpose` VARCHAR(255) DEFAULT NULL,
  `note` TEXT DEFAULT NULL,
  `status` ENUM('cho_duyet', 'da_duyet', 'tu_choi', 'da_huy') NOT NULL DEFAULT 'cho_duyet',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`room_id`) REFERENCES `Rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `Bookings` (`user_id`, `room_id`, `date`, `start_time`, `end_time`, `purpose`, `status`) VALUES
(2, 1, CURDATE() + INTERVAL 1 DAY, '08:00:00', '10:00:00', 'Họp nhóm nghiên cứu AI', 'cho_duyet'),
(2, 3, CURDATE() + INTERVAL 2 DAY, '14:00:00', '16:00:00', 'Hội thảo chuyên đề CNTT', 'da_duyet');

-- ------------------------------------------------------------
-- 12. Table: Notifications
-- ------------------------------------------------------------
CREATE TABLE `Notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `content` TEXT NOT NULL,
  `type` ENUM('su_co', 'bao_tri', 'dat_phong', 'he_thong') NOT NULL DEFAULT 'he_thong',
  `severity` ENUM('info', 'warning', 'error', 'critical') NOT NULL DEFAULT 'info',
  `is_read` BOOLEAN DEFAULT FALSE,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `Notifications` (`user_id`, `content`, `type`, `severity`, `is_read`, `created_at`) VALUES
(1, 'Thiết bị máy chiếu tại phòng B302 bị lỗi kết nối', 'su_co', 'error', FALSE, NOW() - INTERVAL 30 MINUTE),
(1, 'Nhiệt độ cao bất thường tại phòng A403 — 32°C', 'su_co', 'warning', FALSE, NOW() - INTERVAL 1 HOUR),
(2, 'Yêu cầu đặt phòng A103 ngày mai đã được tạo thành công', 'dat_phong', 'info', FALSE, NOW() - INTERVAL 2 HOUR);

-- ------------------------------------------------------------
-- 13. Table: ActivityLogs
-- ------------------------------------------------------------
CREATE TABLE `ActivityLogs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) DEFAULT NULL,
  `entity_id` INT DEFAULT NULL,
  `details` JSON DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 14. Table: AIAnalysis
-- ------------------------------------------------------------
CREATE TABLE `AIAnalysis` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `prompt` TEXT NOT NULL,
  `response` LONGTEXT NOT NULL,
  `type` ENUM('chatbot', 'phan_tich_su_co', 'de_xuat_bao_tri') NOT NULL DEFAULT 'chatbot',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `Users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 15. Table: SensorReadings (Chỉ số cảm biến IoT)
-- ------------------------------------------------------------
CREATE TABLE `SensorReadings` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `room_id` INT NOT NULL,
  `temperature` DECIMAL(4,1) DEFAULT 25.0 COMMENT '°C',
  `humidity` DECIMAL(4,1) DEFAULT 55.0 COMMENT '%',
  `co2` INT DEFAULT 450 COMMENT 'ppm',
  `occupancy` INT DEFAULT 0 COMMENT 'Số người trong phòng',
  `light` INT DEFAULT 500 COMMENT 'lux',
  `smoke` INT DEFAULT 10 COMMENT 'ppm',
  `recorded_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`room_id`) REFERENCES `Rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_room_recorded` (`room_id`, `recorded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 16. Table: EnergyLogs (Điện năng tiêu thụ)
-- ------------------------------------------------------------
CREATE TABLE `EnergyLogs` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `building_id` INT NOT NULL,
  `room_id` INT DEFAULT NULL,
  `kwh` DECIMAL(8,2) NOT NULL,
  `cost` DECIMAL(10,2) NOT NULL,
  `recorded_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`building_id`) REFERENCES `Buildings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`room_id`) REFERENCES `Rooms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_recorded_at` (`recorded_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
