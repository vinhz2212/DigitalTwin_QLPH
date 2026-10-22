# Quên mật khẩu

Luồng: người dùng nhập email trên `/forgot-password`, nhận liên kết trong email,
rồi đặt mật khẩu mới tại `/reset-password`. Liên kết hết hạn sau 15 phút. Sau
khi đổi mật khẩu, liên kết cũ và các phiên đăng nhập cũ mất hiệu lực.

## Cấu hình Gmail cho máy đang chạy backend

1. Trong tài khoản Google dùng để gửi email, bật xác minh 2 bước và tạo mật khẩu
   ứng dụng. Dùng **mật khẩu ứng dụng**, không dùng mật khẩu đăng nhập Google.
2. Mở `backend/.env` trên máy bạn và thêm các dòng sau, thay bằng thông tin thật:

   ```env
   CLIENT_URL=http://localhost:5173
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=your_address@gmail.com
   SMTP_APP_PASSWORD=your_gmail_app_password
   ```

3. Khởi động lại backend để nạp cấu hình. Không đưa `.env` hoặc mật khẩu ứng
   dụng lên GitHub. Nếu chưa cấu hình, API sẽ báo rõ dịch vụ email chưa sẵn sàng.

Email người dùng phải khớp với email lưu trong bảng `Users`. Trên môi trường
online, `CLIENT_URL` cần là địa chỉ frontend thực tế dùng HTTPS.
