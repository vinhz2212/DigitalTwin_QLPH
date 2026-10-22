# Database migrations

Thư mục này chứa các thay đổi cấu trúc MySQL được áp dụng theo thứ tự và không
xóa dữ liệu đang sử dụng.

## Database mới hoàn toàn

1. Mở `backend/database/schema.sql` trong MySQL Workbench. File này phản ánh
   cấu trúc 20 bảng hiện tại và có dữ liệu mẫu không nhạy cảm.
2. Kiểm tra đúng server MySQL cần khởi tạo.
3. Chạy toàn bộ file đúng một lần.
4. Trong thư mục `backend`, chạy `npm run db:migrate` để ghi nhận mốc ban đầu.

`database/schema.sql` có lệnh `DROP TABLE`. Không chạy lại file này trên
database đang có dữ liệu nếu chưa chủ động sao lưu.

Bản `backend/database/backups/schema.sql` là ảnh chụp đầy đủ dữ liệu MySQL
trên máy tại thời điểm xuất. Thư mục `backups` được Git bỏ qua để giữ riêng
thông tin tài khoản, nhật ký và nội dung AI. Không đưa bản này lên GitHub.

## Database đang có dữ liệu

1. Sao lưu database trước khi thay đổi cấu trúc.
2. Kiểm tra `backend/.env` đang trỏ đúng database.
3. Chạy `npm run db:migrate:status` để xem trạng thái.
4. Chạy `npm run db:migrate` để áp dụng các migration chưa chạy.

## Tạo migration mới

- Tạo file theo mẫu `002_ten_thay_doi.sql`, `003_ten_thay_doi.sql`, ...
- Chỉ thêm thay đổi cần thiết bằng `ALTER TABLE`, `CREATE TABLE` hoặc tạo chỉ mục.
- Không thêm `DROP DATABASE`, không reset toàn bộ schema và không chèn dữ liệu mẫu.
- Không sửa migration đã chạy. Nếu cần điều chỉnh, tạo một migration mới.

Migration `001_ensure_current_schema.sql` bổ sung an toàn hai bảng lịch sử cảm
biến và điện năng nếu database cũ chưa có chúng.

Mỗi migration được lưu tên, mã kiểm tra SHA-256 và thời điểm chạy trong bảng
`SchemaMigrations`. Công cụ sẽ dừng nếu một migration đã chạy bị chỉnh sửa.
