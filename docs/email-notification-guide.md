# Hướng dẫn sử dụng tính năng gửi email thông báo

## 1. Giới thiệu

Tính năng gửi email thông báo cho phép admin gửi thông báo qua Gmail đến tất cả người dùng trong hệ thống xem phim, bao gồm các thông báo về việc bảo trì hệ thống và các thông báo tùy chỉnh khác.

## 1.1 Tạo Email Thông Báo Chuyên Nghiệp

Email thông báo được thiết kế đẹp mắt sẽ giúp tăng tính chuyên nghiệp và cải thiện trải nghiệm người dùng. Hệ thống hỗ trợ định dạng HTML đầy đủ cho email, cho phép bạn tạo các thông báo đẹp mắt và thu hút.

## 1.2 Mẫu HTML Email Hiện Đại

Dưới đây là mẫu HTML cơ bản để tạo email đẹp mắt:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tiêu đề của Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; color: #333333;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); margin-top: 20px;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #6a0572, #ab0c8b); padding: 30px 20px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">TIÊU ĐỀ EMAIL</h1>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 30px 30px 20px;">
        <p style="margin-top: 0; margin-bottom: 20px; font-size: 16px; line-height: 1.6;">Kính gửi Quý khách hàng,</p>
        <div style="font-size: 16px; line-height: 1.8; color: #333;">
          <!-- Nội dung email -->
          <p>Đây là nội dung email của bạn. Bạn có thể thêm bất kỳ nội dung HTML nào ở đây.</p>
        </div>
      </td>
    </tr>
    
    <!-- Info Box (Optional) -->
    <tr>
      <td style="padding: 10px 30px;">
        <div style="background-color: #f9f5fc; border-left: 4px solid #6a0572; padding: 15px 20px; border-radius: 5px;">
          <p style="margin: 0 0 10px; font-weight: 600; color: #333;">Thông tin quan trọng:</p>
          <!-- Thông tin quan trọng -->
          <p style="margin: 0; color: #555;">Đây là thông tin bổ sung hoặc chi tiết quan trọng.</p>
        </div>
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="padding: 20px 30px; border-top: 1px solid #eeeeee; background-color: #f9f9f9;">
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #333;">Trân trọng,</p>
        <p style="margin: 5px 0 0; font-size: 16px; color: #666;">Đội ngũ Movie Streaming</p>
      </td>
    </tr>
    
    <!-- Copyright -->
    <tr>
      <td style="background-color: #6a0572; padding: 15px; text-align: center;">
        <p style="margin: 0; color: #ffffff; font-size: 14px;">© 2025 Movie Streaming. All rights reserved.</p>
      </td>
    </tr>
  </table>
</body>
</html>
```

## 1.3 Mẹo Tạo Email Hiệu Quả

1. **Sử dụng inline CSS**: Email clients thường không hỗ trợ external CSS, vì vậy hãy sử dụng inline CSS cho tất cả các phần tử.
2. **Giữ thiết kế đơn giản**: Hãy sử dụng bố cục đơn giản để đảm bảo hiển thị tốt trên nhiều thiết bị.
3. **Sử dụng tables cho layout**: Các email clients cổ xử lý tables tốt hơn div và flexbox.
4. **Tối ưu hóa hình ảnh**: Sử dụng hình ảnh có kích thước phù hợp và thêm thuộc tính alt.
5. **Kiểm tra trước khi gửi**: Luôn dùng chức năng xem trước để kiểm tra email trước khi gửi.

## 2. Cách sử dụng API

### 2.1. Gửi thông báo bảo trì

```bash
POST /api/admin/notifications/send-maintenance
```

Tham số:
- `subject`: Tiêu đề email
- `message`: Nội dung thông báo
- `maintenanceTime`: Thời gian bắt đầu bảo trì
- `expectedDuration`: Thời gian dự kiến hoàn thành
- `userGroup`: Nhóm người dùng (all, premium, free)

Ví dụ:
```json
{
  "subject": "Thông báo bảo trì hệ thống",
  "message": "Chúng tôi sẽ tiến hành bảo trì hệ thống để nâng cấp trải nghiệm xem phim.",
  "maintenanceTime": "2025-05-24 22:00",
  "expectedDuration": "3 giờ",
  "userGroup": "all"
}
```

### 2.2. Gửi thông báo tùy chỉnh

```bash
POST /api/admin/notifications/send-custom
```

Tham số:
- `subject`: Tiêu đề email
- `message`: Nội dung thông báo
- `htmlContent`: Nội dung HTML (tùy chọn)
- `userGroup`: Nhóm người dùng (all, premium, free)

Ví dụ:
```json
{
  "subject": "Phim mới đã ra mắt trên Movie Streaming",
  "message": "Chúng tôi vừa cập nhật các bộ phim mới. Hãy đăng nhập để trải nghiệm!",
  "userGroup": "all"
}
```

### 2.3. Gửi email hàng loạt (Bulk Email)

```bash
POST /api/admin/notifications/send-bulk
```

Tham số:
- `subject`: Tiêu đề email
- `message`: Nội dung thông báo
- `htmlContent`: Nội dung HTML (tùy chọn)
- `userGroup`: Nhóm người dùng (all, premium, free, custom)
- `filter`: Bộ lọc MongoDB tùy chỉnh (chỉ khi userGroup là custom)
- `batchSize`: Kích thước mỗi batch (mặc định: 50)

Ví dụ:
```json
{
  "subject": "Chương trình khuyến mãi tháng 5",
  "message": "Đăng ký gói Premium trong tháng 5 và nhận giảm giá 20%!",
  "userGroup": "free",
  "batchSize": 100
}
```

### 2.4. Gửi email đến người dùng được chọn

```bash
POST /api/admin/notifications/send-to-users
```

Tham số:
- `subject`: Tiêu đề email
- `message`: Nội dung thông báo
- `htmlContent`: Nội dung HTML (tùy chọn)
- `userIds`: Mảng các ID người dùng cần gửi
- `batchSize`: Kích thước mỗi batch (mặc định: 50)

Ví dụ:
```json
{
  "subject": "Thông báo quan trọng cho bạn",
  "message": "Thông báo này chỉ dành riêng cho bạn.",
  "userIds": ["60d0fe4f5311236168a109ca", "60d0fe4f5311236168a109cb"]
}
```

### 2.5. Gửi email đến danh sách email cụ thể

```bash
POST /api/admin/notifications/send-to-emails
```

Tham số:
- `subject`: Tiêu đề email
- `message`: Nội dung thông báo
- `htmlContent`: Nội dung HTML (tùy chọn)
- `emails`: Mảng các địa chỉ email
- `batchSize`: Kích thước mỗi batch (mặc định: 50)

Ví dụ:
```json
{
  "subject": "Mời bạn tham gia Movie Streaming",
  "message": "Bạn đã được mời tham gia nền tảng xem phim Movie Streaming.",
  "emails": ["user1@example.com", "user2@example.com"]
}
```

### 2.6. Xem lịch sử gửi thông báo

```bash
GET /api/admin/notifications/history
```

Tham số query:
- `page`: Số trang (mặc định: 1)
- `limit`: Số lượng kết quả mỗi trang (mặc định: 10)

Ví dụ:
```
GET /api/admin/notifications/history?page=1&limit=20
```

## 3. Sử dụng Script gửi email

### 3.1. Gửi email đến tất cả người dùng

```bash
node scripts/sendEmailToAllUsers.js
```

Hoặc với tham số:

```bash
node scripts/sendEmailToAllUsers.js --subject "Tiêu đề" --message "Nội dung" --userGroup all --batchSize 50
```

### 3.2. Gửi email từ file CSV

```bash
node scripts/sendEmailFromCsv.js
```

Hoặc với tham số:

```bash
node scripts/sendEmailFromCsv.js ./path/to/file.csv "Tiêu đề" "Nội dung" email 50
```

### 3.3. Gửi email hàng loạt

```bash
node scripts/sendBulkEmail.js
```

Hoặc với tham số:

```bash
node scripts/sendBulkEmail.js --subject "Tiêu đề" --message "Nội dung" --userGroup all --batchSize 50
```

## 4. Lưu ý quan trọng

- Để tránh giới hạn gửi email của Gmail (500 email/ngày), nên chia thành các batch nhỏ khi gửi cho nhiều người dùng.
- Email được gửi bằng BCC (Blind Carbon Copy) để bảo vệ thông tin người nhận.
- Lưu ý cài đặt biến môi trường `EMAIL_USER` và `EMAIL_PASS` trong file `.env`.
- Có thể cấu hình SMTP tùy chỉnh bằng các biến môi trường: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`.

## 5. Khắc phục sự cố

- Nếu không thể gửi email, kiểm tra cài đặt email trong file `.env`.
- Đối với Gmail, cần bật "Less secure app access" hoặc sử dụng "App password".
- Kiểm tra lịch sử gửi email để xem thông tin lỗi chi tiết.
- Nếu gặp lỗi "Rate limit exceeded", tăng thời gian chờ giữa các batch hoặc giảm kích thước batch.

## 6. Mẫu Cài Đặt .env

```
# Email Settings
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-password-or-app-password

# Optional SMTP Settings (for custom SMTP servers)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
```
