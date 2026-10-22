-- FILE ĐIỀU HƯỚNG, KHÔNG PHẢI MIGRATION.
-- database/schema.sql: đúng cấu trúc 20 bảng MySQL, kèm dữ liệu mẫu công khai.
-- database/backups/schema.sql: bản sao đầy đủ dữ liệu thật, chỉ lưu trên máy.
-- Cả hai bản có DROP TABLE; không chạy trên database đang dùng.
-- Trong MySQL Workbench, mở trực tiếp database/schema.sql.
-- SOURCE bên dưới chỉ dành cho MySQL command-line khi thư mục hiện tại là backend.
SOURCE database/schema.sql;
