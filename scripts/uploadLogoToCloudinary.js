/**
 * Script để tải logo lên Cloudinary
 * Sử dụng: node scripts/uploadLogoToCloudinary.js
 */

require('dotenv').config();
const cloudinary = require('../src/config/cloudinary');
const fs = require('fs');
const path = require('path');

// Đường dẫn tới logo local
const logoPath = path.join(__dirname, '../..', 'frontend/public/img/Logo.png');

// Hàm tải logo lên Cloudinary
async function uploadLogo() {
  try {
    // Kiểm tra xem file có tồn tại không
    if (!fs.existsSync(logoPath)) {
      console.error(`Logo không được tìm thấy tại đường dẫn: ${logoPath}`);
      return;
    }

    console.log('Đang tải logo lên Cloudinary...');
    
    // Tải lên với thư mục emails và giữ tên gốc
    const result = await cloudinary.uploader.upload(logoPath, {
      folder: 'emails',
      public_id: 'logo',
      overwrite: true,
      resource_type: 'image'
    });

    console.log('Tải lên thành công!');
    console.log('URL của logo:', result.secure_url);
    console.log('Vui lòng lưu URL này để sử dụng trong email template');
    
    return result.secure_url;
  } catch (error) {
    console.error('Lỗi khi tải logo lên Cloudinary:', error);
  }
}

// Chạy hàm tải lên
uploadLogo();
