# Cấu trúc và dữ liệu MySQL

MySQL hiện có 20 bảng. File `schema.sql` trong thư mục này được xuất từ cấu trúc
MySQL hiện tại, gồm đủ 20 bảng, các cột, khóa và chỉ mục. Phần cuối file có dữ
liệu mẫu cho vai trò, tòa nhà, tầng, phòng học, loại thiết bị và thiết bị.
File công khai không chứa tài khoản mẫu, mật khẩu, nhật ký hoặc nội dung AI;
database mới khởi tạo từ file này cần tạo tài khoản quản trị riêng trước khi
đăng nhập hệ thống.

`backups/schema.sql` là bản sao đầy đủ tại thời điểm xuất: cùng 20 bảng và
toàn bộ dữ liệu thật, bao gồm tài khoản, nhật ký và lịch sử AI. Thư mục này
được Git bỏ qua. Dùng bản riêng này khi cần đối chiếu dữ liệu chính xác để
làm báo cáo hoặc khôi phục tại máy của bạn.
Sau thời điểm xuất, nếu dữ liệu MySQL thay đổi thì bản sao này không tự cập nhật.

| File | Nội dung | Đưa lên GitHub |
| --- | --- | --- |
| `schema.sql` | 20 bảng và dữ liệu mẫu không nhạy cảm | Có |
| `backups/schema.sql` | 20 bảng và toàn bộ dữ liệu thật lúc xuất | Không |
| `../schema.sql` | Lệnh `SOURCE` trỏ đến file mẫu | Có |

Cả hai bản xuất SQL đều có `DROP TABLE`. Chỉ chạy trên database mới hoặc khi
bạn chủ động khôi phục sau khi đã sao lưu. Với database đang sử dụng, áp dụng
thay đổi cấu trúc bằng các file trong `migrations/`.

