// scripts/testEmailConfig.js
require('dotenv').config();
const { verifyEmailConfig, transporter } = require('../src/config/email');

/**
 * Kiểm tra cấu hình email và gửi email test
 */
async function testEmailConfiguration() {
  console.log('🔍 Kiểm tra cấu hình email...');
  
  // Kiểm tra các biến môi trường bắt buộc
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ Lỗi: Thiếu biến môi trường EMAIL_USER hoặc EMAIL_PASS!');
    console.log('Vui lòng cập nhật file .env với các thông tin sau:');
    console.log('EMAIL_USER=your-email@gmail.com');
    console.log('EMAIL_PASS=your-password-or-app-password');
    return false;
  }
  
  // Kiểm tra kết nối với server email
  try {
    const isConfigValid = await verifyEmailConfig();
    
    if (!isConfigValid) {
      console.error('❌ Không thể kết nối đến máy chủ email.');
      console.error('Vui lòng kiểm tra lại thông tin đăng nhập email và cài đặt SMTP.');
      
      if (process.env.SMTP_HOST) {
        console.log('\nCấu hình SMTP hiện tại:');
        console.log(`- Host: ${process.env.SMTP_HOST}`);
        console.log(`- Port: ${process.env.SMTP_PORT}`);
        console.log(`- Secure: ${process.env.SMTP_SECURE === 'true' ? 'Có' : 'Không'}`);
      } else {
        console.log('\nĐang sử dụng Gmail. Nếu bạn sử dụng Gmail, hãy đảm bảo:');
        console.log('1. Đã kích hoạt "Less secure app access" hoặc');
        console.log('2. Đang sử dụng "App password" nếu bạn đã bật xác thực 2 yếu tố');
      }
      
      return false;
    }
    
    console.log('✅ Kết nối đến máy chủ email thành công!');
    
    // Hiển thị thông tin cấu hình
    console.log('\n📧 Thông tin cấu hình email:');
    console.log(`- Email người gửi: ${process.env.EMAIL_USER}`);
    
    if (process.env.SMTP_HOST) {
      console.log('- Loại máy chủ: SMTP tùy chỉnh');
      console.log(`- SMTP Host: ${process.env.SMTP_HOST}`);
      console.log(`- SMTP Port: ${process.env.SMTP_PORT}`);
    } else {
      console.log('- Loại máy chủ: Gmail');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra cấu hình email:', error.message);
    return false;
  }
}

/**
 * Gửi email test
 */
async function sendTestEmail(toEmail) {
  if (!toEmail) {
    console.error('❌ Vui lòng cung cấp địa chỉ email để gửi test.');
    return false;
  }
  
  console.log(`📤 Đang gửi email test đến ${toEmail}...`);
  
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: toEmail,
      subject: 'Test Email từ Movie Streaming',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #e50914;">Test Email từ Movie Streaming</h2>
          <p>Đây là email test từ hệ thống Movie Streaming.</p>
          <p>Nếu bạn nhận được email này, cấu hình email của hệ thống đã hoạt động bình thường.</p>
          <p>Email được gửi lúc: ${new Date().toLocaleString()}</p>
          <p>Trân trọng,<br>Đội ngũ hỗ trợ Movie Streaming</p>
        </div>
      `
    });
    
    console.log('✅ Email test đã được gửi thành công!');
    console.log(`📨 Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('❌ Lỗi khi gửi email test:', error.message);
    return false;
  }
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
  const args = process.argv.slice(2);
  const testEmail = args[0];
  
  testEmailConfiguration()
    .then(configValid => {
      if (configValid && testEmail) {
        return sendTestEmail(testEmail);
      } else if (configValid) {
        console.log('\n🔍 Cấu hình email hợp lệ! Để gửi email test, chạy:');
        console.log('node scripts/testEmailConfig.js your-email@example.com');
      }
    })
    .catch(err => console.error('❌ Lỗi:', err))
    .finally(() => process.exit());
}

module.exports = {
  testEmailConfiguration,
  sendTestEmail
};
