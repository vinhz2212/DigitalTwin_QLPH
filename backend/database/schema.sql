-- SMART CAMPUS - CAU TRUC MYSQL HIEN TAI + DU LIEU MAU KHONG NHAY CAM
-- Nguon cau truc: MySQL hien tai, 20 bang. Du lieu mau chi gom toa nha, phong va thiet bi.
-- CANH BAO: file nay co DROP TABLE; chi dung de khoi tao lai database moi.
-- Ban sao day du du lieu that nam o database/backups/schema.sql (khong dua len Git).

-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: smart_campus
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `smart_campus`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `smart_campus` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `smart_campus`;

--
-- Table structure for table `activitylogs`
--

DROP TABLE IF EXISTS `activitylogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activitylogs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entity_id` int DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_logs_user` (`user_id`,`created_at`),
  CONSTRAINT `activitylogs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=66 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `aianalysis`
--

DROP TABLE IF EXISTS `aianalysis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `aianalysis` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `incident_id` int DEFAULT NULL,
  `maintenance_id` int DEFAULT NULL,
  `prompt` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `response` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('phan_tich_su_co','de_xuat_bao_tri','chatbot','phan_tich_anh') COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokens_used` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `incident_id` (`incident_id`),
  KEY `maintenance_id` (`maintenance_id`),
  KEY `idx_ai_user` (`user_id`),
  KEY `idx_ai_type` (`type`),
  CONSTRAINT `aianalysis_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `aianalysis_ibfk_2` FOREIGN KEY (`incident_id`) REFERENCES `incidents` (`id`),
  CONSTRAINT `aianalysis_ibfk_3` FOREIGN KEY (`maintenance_id`) REFERENCES `maintenance` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=102 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `room_id` int NOT NULL,
  `date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `purpose` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('cho_duyet','da_duyet','tu_choi','da_huy') COLLATE utf8mb4_unicode_ci DEFAULT 'cho_duyet',
  `note` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bookings_room_date` (`room_id`,`date`),
  KEY `idx_bookings_user` (`user_id`),
  CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  CONSTRAINT `chk_time` CHECK ((`end_time` > `start_time`))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `buildings`
--

DROP TABLE IF EXISTS `buildings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `buildings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `floors_count` tinyint NOT NULL DEFAULT '5',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `devices`
--

DROP TABLE IF EXISTS `devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `devices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `device_type_id` int NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('hoat_dong','tat','hong','dang_sua') COLLATE utf8mb4_unicode_ci DEFAULT 'tat',
  `power_status` enum('co_dien','ngat_dien') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'co_dien',
  `power_cut_previous_status` enum('hoat_dong','tat','hong','dang_sua') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `installed_at` date DEFAULT NULL,
  `last_maintenance` date DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `device_type_id` (`device_type_id`),
  KEY `idx_devices_room` (`room_id`),
  KEY `idx_devices_status` (`status`),
  CONSTRAINT `devices_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  CONSTRAINT `devices_ibfk_2` FOREIGN KEY (`device_type_id`) REFERENCES `devicetypes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=241 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `devicestatushistory`
--

DROP TABLE IF EXISTS `devicestatushistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `devicestatushistory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `device_id` int NOT NULL,
  `old_status` enum('hoat_dong','tat','hong','dang_sua') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_status` enum('hoat_dong','tat','hong','dang_sua') COLLATE utf8mb4_unicode_ci NOT NULL,
  `changed_by` int DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `changed_by` (`changed_by`),
  KEY `idx_dsh_device` (`device_id`),
  KEY `idx_dsh_changed_at` (`changed_at`),
  CONSTRAINT `devicestatushistory_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`),
  CONSTRAINT `devicestatushistory_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `devicetypes`
--

DROP TABLE IF EXISTS `devicetypes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `devicetypes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `energylogs`
--

DROP TABLE IF EXISTS `energylogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `energylogs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `building_id` int NOT NULL,
  `room_id` int DEFAULT NULL,
  `kwh` decimal(8,2) NOT NULL,
  `cost` decimal(10,2) NOT NULL,
  `recorded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `building_id` (`building_id`),
  KEY `room_id` (`room_id`),
  KEY `idx_recorded_at` (`recorded_at`),
  CONSTRAINT `energylogs_ibfk_1` FOREIGN KEY (`building_id`) REFERENCES `buildings` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `energylogs_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `floors`
--

DROP TABLE IF EXISTS `floors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `floors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `building_id` int NOT NULL,
  `floor_number` tinyint NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `building_id` (`building_id`,`floor_number`),
  CONSTRAINT `floors_ibfk_1` FOREIGN KEY (`building_id`) REFERENCES `buildings` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `incidents`
--

DROP TABLE IF EXISTS `incidents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `incidents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `type` enum('chay','mat_dien','may_chieu_hong','dieu_hoa_hong','mat_internet','qua_tai') COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `severity` enum('thap','trung','cao','nghiem_trong') COLLATE utf8mb4_unicode_ci DEFAULT 'trung',
  `status` enum('dang_xay_ra','dang_xu_ly','da_giai_quyet') COLLATE utf8mb4_unicode_ci DEFAULT 'dang_xay_ra',
  `simulated` tinyint(1) DEFAULT '1',
  `triggered_by` int DEFAULT NULL,
  `occurred_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `triggered_by` (`triggered_by`),
  KEY `idx_incidents_room` (`room_id`),
  KEY `idx_incidents_status` (`status`),
  CONSTRAINT `incidents_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  CONSTRAINT `incidents_ibfk_2` FOREIGN KEY (`triggered_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `maintenance`
--

DROP TABLE IF EXISTS `maintenance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `device_id` int NOT NULL,
  `reported_by` int NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('cho_xu_ly','dang_sua','da_xong','huy') COLLATE utf8mb4_unicode_ci DEFAULT 'cho_xu_ly',
  `resolved_at` datetime DEFAULT NULL,
  `resolved_by` int DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `reported_by` (`reported_by`),
  KEY `resolved_by` (`resolved_by`),
  KEY `idx_maintenance_device` (`device_id`),
  CONSTRAINT `maintenance_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `devices` (`id`),
  CONSTRAINT `maintenance_ibfk_2` FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`),
  CONSTRAINT `maintenance_ibfk_3` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('su_co','bao_tri','dat_phong','he_thong') COLLATE utf8mb4_unicode_ci DEFAULT 'he_thong',
  `severity` enum('info','warning','error','critical') COLLATE utf8mb4_unicode_ci DEFAULT 'info',
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user` (`user_id`,`is_read`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rooms`
--

DROP TABLE IF EXISTS `rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rooms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `floor_id` int NOT NULL,
  `code` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `capacity` smallint NOT NULL DEFAULT '40',
  `status` enum('trong','dang_hoc','bao_tri','su_co') COLLATE utf8mb4_unicode_ci DEFAULT 'trong',
  `power_status` enum('co_dien','ngat_dien') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'co_dien',
  `type` enum('ly_thuyet','thuc_hanh','hoi_truong') COLLATE utf8mb4_unicode_ci DEFAULT 'ly_thuyet',
  `description` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_rooms_floor` (`floor_id`),
  KEY `idx_rooms_status` (`status`),
  CONSTRAINT `rooms_ibfk_1` FOREIGN KEY (`floor_id`) REFERENCES `floors` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `roomstatushistory`
--

DROP TABLE IF EXISTS `roomstatushistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roomstatushistory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `old_status` enum('trong','dang_hoc','bao_tri','su_co') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_status` enum('trong','dang_hoc','bao_tri','su_co') COLLATE utf8mb4_unicode_ci NOT NULL,
  `changed_by` int DEFAULT NULL,
  `reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` enum('manual','booking','incident','schedule','system') COLLATE utf8mb4_unicode_ci DEFAULT 'system',
  `changed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `changed_by` (`changed_by`),
  KEY `idx_rsh_room` (`room_id`),
  KEY `idx_rsh_changed_at` (`changed_at`),
  CONSTRAINT `roomstatushistory_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`),
  CONSTRAINT `roomstatushistory_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `schedules`
--

DROP TABLE IF EXISTS `schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `subject` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `session_type` enum('theory','practical','exam') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'theory',
  `instructor` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `class_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `semester` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_schedules_room_date` (`room_id`,`class_date`),
  CONSTRAINT `schedules_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `schemamigrations`
--

DROP TABLE IF EXISTS `schemamigrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schemamigrations` (
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `applied_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sensorreadings`
--

DROP TABLE IF EXISTS `sensorreadings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sensorreadings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `temperature` decimal(4,1) DEFAULT '25.0' COMMENT '°C',
  `humidity` decimal(4,1) DEFAULT '55.0' COMMENT '%',
  `co2` int DEFAULT '450' COMMENT 'ppm',
  `occupancy` int DEFAULT '0' COMMENT 'Số người trong phòng',
  `light` int DEFAULT '500' COMMENT 'lux',
  `smoke` int DEFAULT '10' COMMENT 'ppm',
  `recorded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_room_recorded` (`room_id`,`recorded_at`),
  CONSTRAINT `sensorreadings_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sensors`
--

DROP TABLE IF EXISTS `sensors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sensors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `type` enum('nhiet_do','do_am','khoi','co2','anh_sang','so_nguoi') COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` float NOT NULL,
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_alert` tinyint(1) DEFAULT '0',
  `threshold_min` float DEFAULT NULL,
  `threshold_max` float DEFAULT NULL,
  `recorded_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sensors_room` (`room_id`),
  KEY `idx_sensors_type` (`type`),
  KEY `idx_sensors_recorded_at` (`recorded_at`),
  CONSTRAINT `sensors_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping events for database 'smart_campus'
--

--
-- Dumping routines for database 'smart_campus'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;


-- Du lieu mau tu cac bang cong khai, khong kem tai khoan va lich su AI.
INSERT INTO `roles` (`id`, `name`, `description`) VALUES
  (1, 'admin', 'Quản trị viên toàn hệ thống'),
  (2, 'giang_vien', 'Giảng viên — đặt phòng, xem lịch'),
  (3, 'ky_thuat_vien', 'Kỹ thuật viên — quản lý thiết bị, xử lý sự cố');
INSERT INTO `buildings` (`id`, `code`, `name`, `description`, `floors_count`) VALUES
  (1, 'A', 'Tòa nhà A', NULL, 5),
  (2, 'B', 'Tòa nhà B', NULL, 5);
INSERT INTO `floors` (`id`, `building_id`, `floor_number`, `name`) VALUES
  (1, 1, 1, 'Tầng 1'),
  (2, 1, 2, 'Tầng 2'),
  (3, 1, 3, 'Tầng 3'),
  (4, 1, 4, 'Tầng 4'),
  (5, 1, 5, 'Tầng 5'),
  (6, 2, 1, 'Tầng 1'),
  (7, 2, 2, 'Tầng 2'),
  (8, 2, 3, 'Tầng 3'),
  (9, 2, 4, 'Tầng 4'),
  (10, 2, 5, 'Tầng 5');
INSERT INTO `rooms` (`id`, `floor_id`, `code`, `name`, `capacity`, `status`, `type`, `description`) VALUES
  (1, 1, 'A101', 'Phòng A101', 40, 'trong', 'ly_thuyet', NULL),
  (2, 1, 'A102', 'Phòng A102', 40, 'trong', 'ly_thuyet', NULL),
  (3, 1, 'A103', 'Phòng A103', 30, 'trong', 'thuc_hanh', NULL),
  (4, 1, 'A104', 'Phòng A104', 40, 'trong', 'ly_thuyet', NULL),
  (5, 2, 'A201', 'Phòng A201', 40, 'trong', 'ly_thuyet', NULL),
  (6, 2, 'A202', 'Phòng A202', 40, 'dang_hoc', 'ly_thuyet', NULL),
  (7, 2, 'A203', 'Phòng A203', 50, 'trong', 'hoi_truong', NULL),
  (8, 2, 'A204', 'Phòng A204', 40, 'trong', 'ly_thuyet', NULL),
  (9, 3, 'A301', 'Phòng A301', 40, 'trong', 'ly_thuyet', NULL),
  (10, 3, 'A302', 'Phòng A302', 40, 'trong', 'ly_thuyet', NULL),
  (11, 3, 'A303', 'Phòng A303', 30, 'trong', 'thuc_hanh', NULL),
  (12, 3, 'A304', 'Phòng A304', 40, 'trong', 'ly_thuyet', NULL),
  (13, 4, 'A401', 'Phòng A401', 40, 'trong', 'ly_thuyet', NULL),
  (14, 4, 'A402', 'Phòng A402', 40, 'trong', 'ly_thuyet', NULL),
  (15, 4, 'A403', 'Phòng A403', 40, 'trong', 'ly_thuyet', NULL),
  (16, 4, 'A404', 'Phòng A404', 30, 'trong', 'thuc_hanh', NULL),
  (17, 5, 'A501', 'Phòng A501', 40, 'trong', 'ly_thuyet', NULL),
  (18, 5, 'A502', 'Phòng A502', 45, 'trong', 'ly_thuyet', NULL),
  (19, 5, 'A503', 'Phòng A503', 40, 'trong', 'ly_thuyet', NULL),
  (20, 5, 'A504', 'Phòng A504', 40, 'trong', 'ly_thuyet', NULL),
  (21, 6, 'B101', 'Phòng B101', 40, 'trong', 'ly_thuyet', NULL),
  (22, 6, 'B102', 'Phòng B102', 40, 'trong', 'ly_thuyet', NULL),
  (23, 6, 'B103', 'Phòng B103', 30, 'trong', 'thuc_hanh', NULL),
  (24, 6, 'B104', 'Phòng B104', 40, 'trong', 'ly_thuyet', NULL),
  (25, 7, 'B201', 'Phòng B201', 40, 'trong', 'ly_thuyet', NULL),
  (26, 7, 'B202', 'Phòng B202', 40, 'trong', 'ly_thuyet', NULL),
  (27, 7, 'B203', 'Phòng B203', 40, 'dang_hoc', 'ly_thuyet', NULL),
  (28, 7, 'B204', 'Phòng B204', 50, 'trong', 'hoi_truong', NULL),
  (29, 8, 'B301', 'Phòng B301', 40, 'trong', 'ly_thuyet', NULL),
  (30, 8, 'B302', 'Phòng B302', 40, 'trong', 'ly_thuyet', NULL),
  (31, 8, 'B303', 'Phòng B303', 40, 'dang_hoc', 'ly_thuyet', NULL),
  (32, 8, 'B304', 'Phòng B304', 30, 'trong', 'thuc_hanh', NULL),
  (33, 9, 'B401', 'Phòng B401', 40, 'trong', 'ly_thuyet', NULL),
  (34, 9, 'B402', 'Phòng B402', 40, 'dang_hoc', 'ly_thuyet', NULL),
  (35, 9, 'B403', 'Phòng B403', 40, 'trong', 'ly_thuyet', NULL),
  (36, 9, 'B404', 'Phòng B404', 40, 'trong', 'ly_thuyet', NULL),
  (37, 10, 'B501', 'Phòng B501', 40, 'trong', 'ly_thuyet', NULL),
  (38, 10, 'B502', 'Phòng B502', 40, 'dang_hoc', 'ly_thuyet', NULL),
  (39, 10, 'B503', 'Phòng B503', 30, 'trong', 'thuc_hanh', NULL),
  (40, 10, 'B504', 'Phòng B504', 40, 'trong', 'ly_thuyet', NULL);
INSERT INTO `devicetypes` (`id`, `name`, `icon`, `description`) VALUES
  (1, 'den', 'lightbulb', NULL),
  (2, 'dieu_hoa', 'thermometer', NULL),
  (3, 'may_chieu', 'monitor', NULL),
  (4, 'quat', 'wind', NULL),
  (5, 'loa', 'volume-2', NULL),
  (6, 'may_tinh', 'monitor-check', NULL);
INSERT INTO `devices` (`id`, `room_id`, `device_type_id`, `name`, `status`, `installed_at`, `last_maintenance`) VALUES
  (1, 1, 4, 'quat - A101', 'hoat_dong', '2026-05-10', '2026-06-06'),
  (2, 1, 6, 'may_tinh - A101', 'hoat_dong', '2025-09-13', '2026-05-30'),
  (3, 1, 3, 'may_chieu - A101', 'hoat_dong', '2025-08-25', '2026-06-10'),
  (4, 1, 5, 'loa - A101', 'hoat_dong', '2026-02-17', '2026-06-19'),
  (5, 1, 2, 'dieu_hoa - A101', 'hoat_dong', '2026-03-03', '2026-06-17'),
  (6, 1, 1, 'den - A101', 'hoat_dong', '2026-02-05', '2026-07-17'),
  (7, 2, 4, 'quat - A102', 'hoat_dong', '2026-06-26', '2026-05-15'),
  (8, 2, 6, 'may_tinh - A102', 'hoat_dong', '2026-05-16', '2026-06-17'),
  (9, 2, 3, 'may_chieu - A102', 'hoat_dong', '2025-12-12', '2026-07-30'),
  (10, 2, 5, 'loa - A102', 'hoat_dong', '2025-12-30', '2026-05-14'),
  (11, 2, 2, 'dieu_hoa - A102', 'hoat_dong', '2026-04-06', '2026-07-18'),
  (12, 2, 1, 'den - A102', 'hoat_dong', '2026-05-11', '2026-07-09'),
  (13, 3, 4, 'quat - A103', 'hoat_dong', '2025-09-27', '2026-08-02'),
  (14, 3, 6, 'may_tinh - A103', 'hoat_dong', '2025-09-30', '2026-06-23'),
  (15, 3, 3, 'may_chieu - A103', 'hoat_dong', '2025-12-01', '2026-05-14'),
  (16, 3, 5, 'loa - A103', 'hoat_dong', '2026-06-17', '2026-05-13'),
  (17, 3, 2, 'dieu_hoa - A103', 'hoat_dong', '2026-03-21', '2026-07-19'),
  (18, 3, 1, 'den - A103', 'hoat_dong', '2026-03-04', '2026-06-01'),
  (19, 4, 4, 'quat - A104', 'tat', '2026-01-31', '2026-06-17'),
  (20, 4, 6, 'may_tinh - A104', 'hoat_dong', '2026-04-16', '2026-05-10'),
  (21, 4, 3, 'may_chieu - A104', 'tat', '2026-01-26', '2026-05-09'),
  (22, 4, 5, 'loa - A104', 'tat', '2026-01-06', '2026-05-07'),
  (23, 4, 2, 'dieu_hoa - A104', 'hoat_dong', '2026-06-22', '2026-05-12'),
  (24, 4, 1, 'den - A104', 'tat', '2025-09-26', '2026-07-10'),
  (25, 5, 4, 'quat - A201', 'tat', '2026-04-14', '2026-07-30'),
  (26, 5, 6, 'may_tinh - A201', 'tat', '2025-12-23', '2026-08-04'),
  (27, 5, 3, 'may_chieu - A201', 'hoat_dong', '2025-10-10', '2026-06-12'),
  (28, 5, 5, 'loa - A201', 'tat', '2025-09-10', '2026-05-17'),
  (29, 5, 2, 'dieu_hoa - A201', 'tat', '2025-09-20', '2026-07-13'),
  (30, 5, 1, 'den - A201', 'hoat_dong', '2026-03-04', '2026-07-17'),
  (31, 6, 4, 'quat - A202', 'tat', '2026-06-21', '2026-07-02'),
  (32, 6, 6, 'may_tinh - A202', 'tat', '2026-04-08', '2026-07-21'),
  (33, 6, 3, 'may_chieu - A202', 'tat', '2025-12-25', '2026-06-12'),
  (34, 6, 5, 'loa - A202', 'hoat_dong', '2025-08-24', '2026-07-09'),
  (35, 6, 2, 'dieu_hoa - A202', 'hoat_dong', '2026-04-18', '2026-06-13'),
  (36, 6, 1, 'den - A202', 'hoat_dong', '2026-04-10', '2026-06-16'),
  (37, 7, 4, 'quat - A203', 'hoat_dong', '2026-03-18', '2026-06-22'),
  (38, 7, 6, 'may_tinh - A203', 'hoat_dong', '2025-08-07', '2026-07-28'),
  (39, 7, 3, 'may_chieu - A203', 'hoat_dong', '2026-07-10', '2026-05-12'),
  (40, 7, 5, 'loa - A203', 'hoat_dong', '2025-11-21', '2026-05-07'),
  (41, 7, 2, 'dieu_hoa - A203', 'hoat_dong', '2026-04-13', '2026-05-08'),
  (42, 7, 1, 'den - A203', 'hoat_dong', '2025-09-23', '2026-06-26'),
  (43, 8, 4, 'quat - A204', 'tat', '2025-11-01', '2026-05-12'),
  (44, 8, 6, 'may_tinh - A204', 'tat', '2026-05-04', '2026-08-02'),
  (45, 8, 3, 'may_chieu - A204', 'tat', '2025-09-09', '2026-07-07'),
  (46, 8, 5, 'loa - A204', 'tat', '2026-03-28', '2026-07-17'),
  (47, 8, 2, 'dieu_hoa - A204', 'tat', '2026-07-04', '2026-06-10'),
  (48, 8, 1, 'den - A204', 'tat', '2026-04-18', '2026-05-07'),
  (49, 9, 4, 'quat - A301', 'hoat_dong', '2026-03-29', '2026-06-15'),
  (50, 9, 6, 'may_tinh - A301', 'tat', '2026-07-07', '2026-07-24'),
  (51, 9, 3, 'may_chieu - A301', 'tat', '2025-11-04', '2026-06-24'),
  (52, 9, 5, 'loa - A301', 'hoat_dong', '2025-09-20', '2026-07-16'),
  (53, 9, 2, 'dieu_hoa - A301', 'tat', '2025-12-25', '2026-06-03'),
  (54, 9, 1, 'den - A301', 'tat', '2026-06-20', '2026-06-03'),
  (55, 10, 4, 'quat - A302', 'hoat_dong', '2026-02-23', '2026-05-15'),
  (56, 10, 6, 'may_tinh - A302', 'hoat_dong', '2026-04-26', '2026-05-27'),
  (57, 10, 3, 'may_chieu - A302', 'hoat_dong', '2025-09-02', '2026-06-24'),
  (58, 10, 5, 'loa - A302', 'tat', '2026-04-14', '2026-05-13'),
  (59, 10, 2, 'dieu_hoa - A302', 'tat', '2025-10-01', '2026-08-02'),
  (60, 10, 1, 'den - A302', 'tat', '2026-07-17', '2026-07-03'),
  (61, 11, 4, 'quat - A303', 'tat', '2026-05-22', '2026-07-31'),
  (62, 11, 6, 'may_tinh - A303', 'tat', '2025-08-21', '2026-05-14'),
  (63, 11, 3, 'may_chieu - A303', 'tat', '2025-09-16', '2026-07-14'),
  (64, 11, 5, 'loa - A303', 'tat', '2025-09-14', '2026-05-16'),
  (65, 11, 2, 'dieu_hoa - A303', 'tat', '2026-05-04', '2026-05-15'),
  (66, 11, 1, 'den - A303', 'tat', '2026-05-21', '2026-06-04'),
  (67, 12, 4, 'quat - A304', 'tat', '2025-10-08', '2026-05-24'),
  (68, 12, 6, 'may_tinh - A304', 'tat', '2026-04-07', '2026-05-07'),
  (69, 12, 3, 'may_chieu - A304', 'tat', '2025-08-13', '2026-05-15'),
  (70, 12, 5, 'loa - A304', 'tat', '2026-03-27', '2026-05-12'),
  (71, 12, 2, 'dieu_hoa - A304', 'tat', '2026-05-28', '2026-07-22'),
  (72, 12, 1, 'den - A304', 'hoat_dong', '2026-03-24', '2026-07-04'),
  (73, 13, 4, 'quat - A401', 'tat', '2026-05-11', '2026-07-18'),
  (74, 13, 6, 'may_tinh - A401', 'tat', '2025-10-04', '2026-07-07'),
  (75, 13, 3, 'may_chieu - A401', 'hoat_dong', '2026-03-02', '2026-05-14'),
  (76, 13, 5, 'loa - A401', 'tat', '2025-12-08', '2026-06-25'),
  (77, 13, 2, 'dieu_hoa - A401', 'tat', '2026-07-19', '2026-06-30'),
  (78, 13, 1, 'den - A401', 'tat', '2025-09-01', '2026-07-20'),
  (79, 14, 4, 'quat - A402', 'hoat_dong', '2025-10-15', '2026-05-21'),
  (80, 14, 6, 'may_tinh - A402', 'tat', '2026-03-15', '2026-06-11'),
  (81, 14, 3, 'may_chieu - A402', 'tat', '2026-01-22', '2026-07-31'),
  (82, 14, 5, 'loa - A402', 'tat', '2026-06-21', '2026-06-08'),
  (83, 14, 2, 'dieu_hoa - A402', 'tat', '2026-04-10', '2026-08-01'),
  (84, 14, 1, 'den - A402', 'tat', '2026-06-08', '2026-08-03'),
  (85, 15, 4, 'quat - A403', 'tat', '2026-07-15', '2026-06-28'),
  (86, 15, 6, 'may_tinh - A403', 'tat', '2026-05-18', '2026-06-29'),
  (87, 15, 3, 'may_chieu - A403', 'tat', '2025-12-16', '2026-07-29'),
  (88, 15, 5, 'loa - A403', 'tat', '2026-07-31', '2026-05-31'),
  (89, 15, 2, 'dieu_hoa - A403', 'tat', '2025-10-04', '2026-07-03'),
  (90, 15, 1, 'den - A403', 'tat', '2026-03-02', '2026-07-15'),
  (91, 16, 4, 'quat - A404', 'tat', '2026-01-16', '2026-07-16'),
  (92, 16, 6, 'may_tinh - A404', 'tat', '2026-02-19', '2026-08-02'),
  (93, 16, 3, 'may_chieu - A404', 'tat', '2025-11-18', '2026-07-10'),
  (94, 16, 5, 'loa - A404', 'tat', '2026-01-17', '2026-05-16'),
  (95, 16, 2, 'dieu_hoa - A404', 'tat', '2026-01-24', '2026-07-26'),
  (96, 16, 1, 'den - A404', 'tat', '2026-03-01', '2026-07-09'),
  (97, 17, 4, 'quat - A501', 'hoat_dong', '2026-07-13', '2026-05-30'),
  (98, 17, 6, 'may_tinh - A501', 'tat', '2026-05-04', '2026-05-25'),
  (99, 17, 3, 'may_chieu - A501', 'hoat_dong', '2025-11-28', '2026-05-27'),
  (100, 17, 5, 'loa - A501', 'tat', '2025-10-24', '2026-06-26'),
  (101, 17, 2, 'dieu_hoa - A501', 'tat', '2025-09-23', '2026-05-22'),
  (102, 17, 1, 'den - A501', 'tat', '2026-05-18', '2026-06-24'),
  (103, 18, 4, 'quat - A502', 'tat', '2025-09-16', '2026-06-25'),
  (104, 18, 6, 'may_tinh - A502', 'hoat_dong', '2025-11-02', '2026-05-15'),
  (105, 18, 3, 'may_chieu - A502', 'tat', '2026-01-13', '2026-08-02'),
  (106, 18, 5, 'loa - A502', 'tat', '2026-05-01', '2026-05-16'),
  (107, 18, 2, 'dieu_hoa - A502', 'tat', '2025-10-30', '2026-05-29'),
  (108, 18, 1, 'den - A502', 'tat', '2025-08-16', '2026-06-19'),
  (109, 19, 4, 'quat - A503', 'tat', '2025-09-11', '2026-06-28'),
  (110, 19, 6, 'may_tinh - A503', 'tat', '2025-12-12', '2026-07-27'),
  (111, 19, 3, 'may_chieu - A503', 'tat', '2026-02-27', '2026-06-17'),
  (112, 19, 5, 'loa - A503', 'tat', '2026-04-16', '2026-07-03'),
  (113, 19, 2, 'dieu_hoa - A503', 'tat', '2026-01-30', '2026-05-26'),
  (114, 19, 1, 'den - A503', 'tat', '2025-12-01', '2026-07-22'),
  (115, 20, 4, 'quat - A504', 'tat', '2026-05-02', '2026-07-30'),
  (116, 20, 6, 'may_tinh - A504', 'tat', '2026-01-23', '2026-08-03'),
  (117, 20, 3, 'may_chieu - A504', 'tat', '2026-02-18', '2026-05-26'),
  (118, 20, 5, 'loa - A504', 'tat', '2026-03-24', '2026-07-17'),
  (119, 20, 2, 'dieu_hoa - A504', 'tat', '2025-08-23', '2026-08-03'),
  (120, 20, 1, 'den - A504', 'hoat_dong', '2026-06-28', '2026-05-23'),
  (121, 21, 4, 'quat - B101', 'hoat_dong', '2026-02-02', '2026-07-23'),
  (122, 21, 6, 'may_tinh - B101', 'hoat_dong', '2026-02-06', '2026-05-15'),
  (123, 21, 3, 'may_chieu - B101', 'hoat_dong', '2025-12-06', '2026-07-29'),
  (124, 21, 5, 'loa - B101', 'hoat_dong', '2025-11-20', '2026-07-02'),
  (125, 21, 2, 'dieu_hoa - B101', 'hoat_dong', '2026-01-19', '2026-06-19'),
  (126, 21, 1, 'den - B101', 'hoat_dong', '2026-05-03', '2026-06-30'),
  (127, 22, 4, 'quat - B102', 'hoat_dong', '2025-09-11', '2026-05-22'),
  (128, 22, 6, 'may_tinh - B102', 'tat', '2025-09-23', '2026-05-15'),
  (129, 22, 3, 'may_chieu - B102', 'tat', '2025-09-03', '2026-05-23'),
  (130, 22, 5, 'loa - B102', 'tat', '2026-06-25', '2026-06-10'),
  (131, 22, 2, 'dieu_hoa - B102', 'tat', '2026-07-24', '2026-05-22'),
  (132, 22, 1, 'den - B102', 'hoat_dong', '2025-12-21', '2026-07-31'),
  (133, 23, 4, 'quat - B103', 'tat', '2025-11-10', '2026-06-17'),
  (134, 23, 6, 'may_tinh - B103', 'tat', '2025-10-10', '2026-06-09'),
  (135, 23, 3, 'may_chieu - B103', 'tat', '2026-01-08', '2026-05-26'),
  (136, 23, 5, 'loa - B103', 'hoat_dong', '2025-12-15', '2026-06-12'),
  (137, 23, 2, 'dieu_hoa - B103', 'hoat_dong', '2026-02-23', '2026-07-27'),
  (138, 23, 1, 'den - B103', 'hoat_dong', '2026-03-25', '2026-06-27'),
  (139, 24, 4, 'quat - B104', 'hoat_dong', '2026-07-07', '2026-07-21'),
  (140, 24, 6, 'may_tinh - B104', 'tat', '2026-02-21', '2026-06-22'),
  (141, 24, 3, 'may_chieu - B104', 'hoat_dong', '2025-09-23', '2026-07-24'),
  (142, 24, 5, 'loa - B104', 'hoat_dong', '2025-08-17', '2026-06-11'),
  (143, 24, 2, 'dieu_hoa - B104', 'hoat_dong', '2025-09-17', '2026-05-08'),
  (144, 24, 1, 'den - B104', 'tat', '2026-04-09', '2026-05-19'),
  (145, 25, 4, 'quat - B201', 'tat', '2026-08-03', '2026-07-29'),
  (146, 25, 6, 'may_tinh - B201', 'tat', '2025-12-18', '2026-08-02'),
  (147, 25, 3, 'may_chieu - B201', 'hoat_dong', '2026-06-26', '2026-05-22'),
  (148, 25, 5, 'loa - B201', 'tat', '2025-12-22', '2026-06-09'),
  (149, 25, 2, 'dieu_hoa - B201', 'tat', '2026-02-04', '2026-06-06'),
  (150, 25, 1, 'den - B201', 'tat', '2026-07-30', '2026-06-04'),
  (151, 26, 4, 'quat - B202', 'tat', '2025-10-21', '2026-05-21'),
  (152, 26, 6, 'may_tinh - B202', 'tat', '2026-01-10', '2026-07-01'),
  (153, 26, 3, 'may_chieu - B202', 'hoat_dong', '2025-08-26', '2026-07-30'),
  (154, 26, 5, 'loa - B202', 'tat', '2026-06-28', '2026-07-22'),
  (155, 26, 2, 'dieu_hoa - B202', 'tat', '2025-11-01', '2026-06-24'),
  (156, 26, 1, 'den - B202', 'hoat_dong', '2025-10-27', '2026-05-28'),
  (157, 27, 4, 'quat - B203', 'tat', '2026-05-06', '2026-06-01'),
  (158, 27, 6, 'may_tinh - B203', 'tat', '2025-08-08', '2026-06-23'),
  (159, 27, 3, 'may_chieu - B203', 'tat', '2026-02-07', '2026-07-08'),
  (160, 27, 5, 'loa - B203', 'hoat_dong', '2026-03-16', '2026-05-28'),
  (161, 27, 2, 'dieu_hoa - B203', 'tat', '2025-09-09', '2026-06-11'),
  (162, 27, 1, 'den - B203', 'tat', '2025-10-14', '2026-07-30'),
  (163, 28, 4, 'quat - B204', 'tat', '2026-05-25', '2026-07-04'),
  (164, 28, 6, 'may_tinh - B204', 'hoat_dong', '2025-10-26', '2026-07-02'),
  (165, 28, 3, 'may_chieu - B204', 'tat', '2025-11-25', '2026-05-27'),
  (166, 28, 5, 'loa - B204', 'tat', '2026-01-31', '2026-07-12'),
  (167, 28, 2, 'dieu_hoa - B204', 'tat', '2026-07-31', '2026-05-25'),
  (168, 28, 1, 'den - B204', 'tat', '2026-04-22', '2026-06-09'),
  (169, 29, 4, 'quat - B301', 'tat', '2025-12-22', '2026-07-19'),
  (170, 29, 6, 'may_tinh - B301', 'hoat_dong', '2025-11-28', '2026-07-10'),
  (171, 29, 3, 'may_chieu - B301', 'tat', '2025-08-22', '2026-06-04'),
  (172, 29, 5, 'loa - B301', 'tat', '2025-10-24', '2026-07-17'),
  (173, 29, 2, 'dieu_hoa - B301', 'tat', '2025-11-20', '2026-06-17'),
  (174, 29, 1, 'den - B301', 'tat', '2026-04-23', '2026-06-05'),
  (175, 30, 4, 'quat - B302', 'tat', '2025-12-28', '2026-06-27'),
  (176, 30, 6, 'may_tinh - B302', 'tat', '2026-03-15', '2026-05-11'),
  (177, 30, 3, 'may_chieu - B302', 'tat', '2026-06-29', '2026-05-31'),
  (178, 30, 5, 'loa - B302', 'tat', '2026-03-02', '2026-07-20'),
  (179, 30, 2, 'dieu_hoa - B302', 'tat', '2026-04-06', '2026-05-11'),
  (180, 30, 1, 'den - B302', 'tat', '2025-08-13', '2026-06-13'),
  (181, 31, 4, 'quat - B303', 'tat', '2026-06-16', '2026-05-29'),
  (182, 31, 6, 'may_tinh - B303', 'tat', '2026-01-13', '2026-06-03'),
  (183, 31, 3, 'may_chieu - B303', 'tat', '2025-08-12', '2026-06-25'),
  (184, 31, 5, 'loa - B303', 'tat', '2026-05-23', '2026-07-29'),
  (185, 31, 2, 'dieu_hoa - B303', 'tat', '2025-12-15', '2026-05-19'),
  (186, 31, 1, 'den - B303', 'tat', '2026-02-12', '2026-07-24'),
  (187, 32, 4, 'quat - B304', 'hoat_dong', '2025-10-19', '2026-07-13'),
  (188, 32, 6, 'may_tinh - B304', 'tat', '2025-12-22', '2026-06-23'),
  (189, 32, 3, 'may_chieu - B304', 'tat', '2026-06-22', '2026-07-29'),
  (190, 32, 5, 'loa - B304', 'tat', '2025-11-15', '2026-06-08'),
  (191, 32, 2, 'dieu_hoa - B304', 'hoat_dong', '2026-04-09', '2026-06-24'),
  (192, 32, 1, 'den - B304', 'tat', '2026-03-31', '2026-06-03'),
  (193, 33, 4, 'quat - B401', 'tat', '2026-06-15', '2026-07-04'),
  (194, 33, 6, 'may_tinh - B401', 'tat', '2025-12-13', '2026-07-18'),
  (195, 33, 3, 'may_chieu - B401', 'hoat_dong', '2025-11-21', '2026-07-05'),
  (196, 33, 5, 'loa - B401', 'tat', '2025-09-05', '2026-05-23'),
  (197, 33, 2, 'dieu_hoa - B401', 'tat', '2026-05-31', '2026-05-13'),
  (198, 33, 1, 'den - B401', 'hoat_dong', '2025-11-26', '2026-07-21'),
  (199, 34, 4, 'quat - B402', 'tat', '2026-06-07', '2026-06-10'),
  (200, 34, 6, 'may_tinh - B402', 'tat', '2026-05-22', '2026-07-19'),
  (201, 34, 3, 'may_chieu - B402', 'tat', '2025-09-02', '2026-05-31'),
  (202, 34, 5, 'loa - B402', 'tat', '2026-05-17', '2026-06-25'),
  (203, 34, 2, 'dieu_hoa - B402', 'tat', '2026-01-04', '2026-07-22'),
  (204, 34, 1, 'den - B402', 'hoat_dong', '2025-12-22', '2026-07-31'),
  (205, 35, 4, 'quat - B403', 'tat', '2025-10-24', '2026-05-30'),
  (206, 35, 6, 'may_tinh - B403', 'tat', '2025-12-28', '2026-05-14'),
  (207, 35, 3, 'may_chieu - B403', 'tat', '2026-06-16', '2026-07-04'),
  (208, 35, 5, 'loa - B403', 'tat', '2025-12-10', '2026-07-14'),
  (209, 35, 2, 'dieu_hoa - B403', 'hoat_dong', '2026-02-16', '2026-06-10'),
  (210, 35, 1, 'den - B403', 'tat', '2026-02-05', '2026-06-23'),
  (211, 36, 4, 'quat - B404', 'tat', '2025-08-21', '2026-07-21'),
  (212, 36, 6, 'may_tinh - B404', 'tat', '2026-06-17', '2026-05-15'),
  (213, 36, 3, 'may_chieu - B404', 'hoat_dong', '2025-09-09', '2026-07-22'),
  (214, 36, 5, 'loa - B404', 'hoat_dong', '2025-12-13', '2026-07-21'),
  (215, 36, 2, 'dieu_hoa - B404', 'tat', '2025-08-11', '2026-07-15'),
  (216, 36, 1, 'den - B404', 'hoat_dong', '2026-04-08', '2026-08-03'),
  (217, 37, 4, 'quat - B501', 'hoat_dong', '2026-01-29', '2026-07-15'),
  (218, 37, 6, 'may_tinh - B501', 'hoat_dong', '2026-03-19', '2026-07-30'),
  (219, 37, 3, 'may_chieu - B501', 'hoat_dong', '2026-01-24', '2026-07-16'),
  (220, 37, 5, 'loa - B501', 'hoat_dong', '2025-10-11', '2026-06-11'),
  (221, 37, 2, 'dieu_hoa - B501', 'hoat_dong', '2026-07-10', '2026-06-10'),
  (222, 37, 1, 'den - B501', 'hoat_dong', '2026-01-19', '2026-07-29'),
  (223, 38, 4, 'quat - B502', 'tat', '2026-02-09', '2026-07-18'),
  (224, 38, 6, 'may_tinh - B502', 'tat', '2025-08-15', '2026-07-06'),
  (225, 38, 3, 'may_chieu - B502', 'tat', '2026-01-08', '2026-05-31'),
  (226, 38, 5, 'loa - B502', 'tat', '2026-02-27', '2026-06-29'),
  (227, 38, 2, 'dieu_hoa - B502', 'tat', '2026-03-24', '2026-06-04'),
  (228, 38, 1, 'den - B502', 'tat', '2026-02-10', '2026-06-21'),
  (229, 39, 4, 'quat - B503', 'hoat_dong', '2026-01-06', '2026-05-20'),
  (230, 39, 6, 'may_tinh - B503', 'tat', '2026-07-01', '2026-05-17'),
  (231, 39, 3, 'may_chieu - B503', 'hoat_dong', '2026-07-20', '2026-05-25'),
  (232, 39, 5, 'loa - B503', 'hoat_dong', '2025-10-17', '2026-06-22'),
  (233, 39, 2, 'dieu_hoa - B503', 'hoat_dong', '2025-11-10', '2026-06-16'),
  (234, 39, 1, 'den - B503', 'hoat_dong', '2026-07-25', '2026-06-16'),
  (235, 40, 4, 'quat - B504', 'tat', '2025-12-27', '2026-07-29'),
  (236, 40, 6, 'may_tinh - B504', 'tat', '2026-01-02', '2026-07-13'),
  (237, 40, 3, 'may_chieu - B504', 'tat', '2025-11-07', '2026-07-17'),
  (238, 40, 5, 'loa - B504', 'tat', '2026-03-28', '2026-06-30'),
  (239, 40, 2, 'dieu_hoa - B504', 'tat', '2026-02-26', '2026-06-29'),
  (240, 40, 1, 'den - B504', 'tat', '2026-04-25', '2026-07-08');
