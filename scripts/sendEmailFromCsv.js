// scripts/sendEmailFromCsv.js
require('dotenv').config({ path: '../.env' });
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');

/**
 * Đọc danh sách email từ file CSV
 * @param {string} filePath - Đường dẫn tới file CSV
 * @param {string} emailColumn - Tên cột chứa địa chỉ email
 * @returns {Promise<string[]>} Danh sách email
 */
async function readEmailsFromCsv(filePath, emailColumn = 'email') {
  return new Promise((resolve, reject) => {
    const emails = [];
    fs.createReadStream(filePath)
      .pipe(parse({
        columns: true,
        skip_empty_lines: true,
        trim: true
      }))
      .on('data', (row) => {
        // Lấy email từ cột được chỉ định hoặc cột đầu tiên nếu không tìm thấy
        const email = row[emailColumn] || row[Object.keys(row)[0]];
        if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          emails.push(email);
        }
      })
      .on('error', (err) => {
        reject(err);
      })
      .on('end', () => {
        console.log(`📂 Đã đọc ${emails.length} email hợp lệ từ file CSV`);
        resolve(emails);
      });
  });
}

/**
 * Cấu hình transporter email
 * @returns {Object} Nodemailer transporter
 */
function createTransporter() {
  // Kiểm tra xem có cấu hình SMTP tùy chỉnh không
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    // Sử dụng cấu hình SMTP tùy chỉnh
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } else {
    // Sử dụng Gmail mặc định
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
}

/**
 * Gửi email đến danh sách email
 * @param {Object} options - Tùy chọn email
 * @param {string[]} options.emails - Danh sách email
 * @param {string} options.subject - Tiêu đề email
 * @param {string} options.message - Nội dung văn bản
 * @param {string} options.htmlContent - Nội dung HTML (tùy chọn)
 * @param {number} options.batchSize - Kích thước batch (mặc định: 50)
 */
async function sendEmailsFromList(options) {
  const { emails, subject, message, htmlContent, batchSize = 50 } = options;
  
  if (!subject || !message || !emails || emails.length === 0) {
    console.error('❌ Thiếu thông tin bắt buộc: emails, subject, message');
    return;
  }

  try {
    // Tạo transporter
    const transporter = createTransporter();
    
    // Kiểm tra kết nối
    await transporter.verify();
    console.log('✅ Kết nối email server thành công');

    // Chuẩn bị nội dung email
    const defaultHtmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #e50914;">Thông Báo Từ Movie Streaming</h2>
        <p>Kính gửi Quý khách hàng,</p>
        <p>${message}</p>
        <p>Trân trọng,<br>Đội ngũ hỗ trợ Movie Streaming</p>
      </div>
    `;

    const finalHtmlContent = htmlContent || defaultHtmlContent;

    // Chia thành các nhóm nhỏ để tránh bị chặn
    const batches = [];
    for (let i = 0; i < emails.length; i += batchSize) {
      batches.push(emails.slice(i, i + batchSize));
    }

    console.log(`📨 Gửi email đến ${emails.length} địa chỉ (${batches.length} batches)`);

    // Gửi email theo từng batch
    for (let [index, batch] of batches.entries()) {
      console.log(`📤 Đang gửi batch ${index + 1}/${batches.length} (${batch.length} người nhận)`);
      
      // Tạo nội dung email
      const emailContent = {
        from: process.env.EMAIL_USER,
        bcc: batch,
        subject: subject,
        html: finalHtmlContent
      };

      // Gửi email
      await transporter.sendMail(emailContent);
      console.log(`✅ Đã gửi batch ${index + 1} thành công`);
      
      // Chờ một chút giữa các lần gửi để tránh giới hạn tốc độ
      if (index < batches.length - 1) {
        console.log('⏳ Đợi 3 giây trước khi gửi batch tiếp theo...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    console.log(`🎉 Đã gửi email thành công đến ${emails.length} người dùng`);
  } catch (error) {
    console.error('❌ Lỗi khi gửi email:', error);
    throw error;
  }
}

/**
 * Gửi email đến danh sách email từ file CSV
 * @param {Object} options - Tùy chọn email
 * @param {string} options.csvPath - Đường dẫn file CSV
 * @param {string} options.emailColumn - Tên cột chứa email trong CSV
 * @param {string} options.subject - Tiêu đề email
 * @param {string} options.message - Nội dung văn bản
 * @param {string} options.htmlContent - Nội dung HTML (tùy chọn)
 * @param {number} options.batchSize - Kích thước batch (mặc định: 50)
 */
async function sendEmailFromCsv(options) {
  const { csvPath, emailColumn = 'email', subject, message, htmlContent, batchSize = 50 } = options;
  
  if (!csvPath || !subject || !message) {
    console.error('❌ Thiếu thông tin bắt buộc: csvPath, subject, message');
    return;
  }

  try {
    console.log(`📂 Đang đọc danh sách email từ file ${csvPath}`);
    const emails = await readEmailsFromCsv(csvPath, emailColumn);
    
    if (emails.length === 0) {
      console.log('❌ Không tìm thấy email hợp lệ nào trong file CSV');
      return;
    }
    
    await sendEmailsFromList({
      emails,
      subject,
      message,
      htmlContent,
      batchSize
    });
  } catch (error) {
    console.error('❌ Lỗi khi gửi email từ CSV:', error);
    throw error;
  }
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Chế độ tương tác nếu không có tham số
  if (args.length === 0) {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('📧 Gửi email thông báo từ file CSV');
    console.log('----------------------------------');

    readline.question('Đường dẫn đến file CSV: ', (csvPath) => {
      readline.question('Tên cột chứa email (mặc định: email): ', (emailColumn) => {
        readline.question('Tiêu đề email: ', (subject) => {
          readline.question('Nội dung thông báo: ', (message) => {
            readline.question('Kích thước batch (số lượng email mỗi lần gửi, mặc định: 50): ', (batchSizeStr) => {
              readline.close();
              
              const finalEmailColumn = emailColumn || 'email';
              const batchSize = parseInt(batchSizeStr, 10) || 50;
              
              console.log(`\n📤 Bắt đầu gửi email...`);
              sendEmailFromCsv({ 
                csvPath, 
                emailColumn: finalEmailColumn,
                subject, 
                message,
                batchSize 
              })
                .then(() => console.log('✅ Hoàn thành'))
                .catch(err => console.error('❌ Lỗi:', err))
                .finally(() => process.exit());
            });
          });
        });
      });
    });
  } else {
    // Sử dụng tham số từ dòng lệnh
    const csvPath = args[0];
    const subject = args[1];
    const message = args[2];
    const emailColumn = args[3] || 'email';
    const batchSize = parseInt(args[4], 10) || 50;
    
    sendEmailFromCsv({ 
      csvPath, 
      emailColumn,
      subject, 
      message,
      batchSize 
    })
      .then(() => console.log('✅ Hoàn thành'))
      .catch(err => console.error('❌ Lỗi:', err))
      .finally(() => process.exit());
  }
}

module.exports = {
  readEmailsFromCsv,
  sendEmailsFromList,
  sendEmailFromCsv
};
