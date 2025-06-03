// scripts/sendEmailToAllUsers.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user');
const EmailNotificationLog = require('../src/models/emailNotificationLog');
const { transporter, verifyEmailConfig } = require('../src/config/email');

/**
 * Lấy danh sách email của tất cả người dùng từ database
 * @param {Object} options - Tùy chọn truy vấn
 * @param {Object} options.filter - Bộ lọc MongoDB
 * @returns {Promise<string[]>} Danh sách email
 */
async function getEmails(options = {}) {
  const { filter = {}, isActive = true } = options;
  
  // Thêm điều kiện isActive vào filter nếu được chỉ định
  const finalFilter = { ...filter };
  if (isActive !== null) {
    finalFilter.isActive = isActive;
  }

  try {
    // Kết nối đến database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Kết nối MongoDB thành công');
    
    // Lấy tất cả email người dùng theo điều kiện lọc
    const users = await User.find(finalFilter).select('email fullname -_id');
    
    console.log(`📧 Tìm thấy ${users.length} người dùng`);
    return users;
  } catch (error) {
    console.error('❌ Lỗi khi truy vấn database:', error);
    throw error;
  }
}

/**
 * Gửi email tới danh sách người dùng (được chia thành các nhóm nhỏ)
 * @param {Object} options - Tùy chọn email
 * @param {string} options.subject - Tiêu đề email
 * @param {string} options.htmlContent - Nội dung HTML
 * @param {Array} options.users - Danh sách người dùng
 * @param {number} options.batchSize - Kích thước mỗi batch (mặc định là 50)
 * @returns {Promise<Object>} Kết quả gửi email
 */
const sendEmailToBatches = async ({ subject, htmlContent, users, batchSize = 50 }) => {
  // Chia thành các nhóm nhỏ để tránh bị chặn
  const batches = [];
  for (let i = 0; i < users.length; i += batchSize) {
    batches.push(users.slice(i, i + batchSize));
  }
  
  let totalSent = 0;
  let failed = 0;
  let failedEmails = [];
  
  console.log(`📨 Gửi email đến ${users.length} người dùng (${batches.length} batches)`);
  
  // Gửi email theo từng batch
  for (let [index, batch] of batches.entries()) {
    const emailList = batch.map(user => user.email);
    
    try {
      // Tạo nội dung email
      const emailContent = {
        from: process.env.EMAIL_USER,
        bcc: emailList, // Sử dụng BCC để ẩn danh sách người nhận
        subject: subject,
        html: htmlContent
      };
      
      // Gửi email
      await transporter.sendMail(emailContent);
      totalSent += emailList.length;
      
      console.log(`✅ Batch ${index + 1}/${batches.length}: Đã gửi thành công đến ${emailList.length} người dùng`);
    } catch (error) {
      console.error(`❌ Batch ${index + 1}/${batches.length}: Lỗi gửi - ${error.message}`);
      failed += emailList.length;
      failedEmails = [...failedEmails, ...emailList];
    }
    
    // Chờ một chút trước khi gửi batch tiếp theo (để tránh rate limiting)
    if (index < batches.length - 1) {
      console.log('⏳ Đợi 3 giây trước khi gửi batch tiếp theo...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  return {
    totalSent,
    failed,
    failedEmails
  };
};

/**
 * Gửi email đến danh sách người dùng
 * @param {Object} options - Tùy chọn email
 * @param {string} options.subject - Tiêu đề email
 * @param {string} options.message - Nội dung văn bản
 * @param {string} options.htmlContent - Nội dung HTML (tùy chọn)
 * @param {Object} options.filter - Bộ lọc MongoDB cho người dùng (tùy chọn)
 * @param {string} options.userGroup - Nhóm người dùng (all, premium, free)
 */
async function sendEmailToUsers(options) {
  const { subject, message, htmlContent, filter = {}, userGroup = 'all', batchSize = 50 } = options;
  
  if (!subject || !message) {
    console.error('❌ Thiếu thông tin bắt buộc: subject, message');
    return;
  }

  try {
    // Kiểm tra cấu hình email
    const emailConfigOk = await verifyEmailConfig();
    if (!emailConfigOk) {
      console.error('❌ Cấu hình email không hợp lệ');
      return;
    }
    
    // Xây dựng query dựa vào userGroup
    const finalFilter = { ...filter };
    if (userGroup === 'premium') {
      finalFilter.accountTypeId = { $ne: null };
      console.log('🔍 Lọc người dùng: Premium');
    } else if (userGroup === 'free') {
      finalFilter.accountTypeId = null;
      console.log('🔍 Lọc người dùng: Free');
    } else {
      console.log('🔍 Lọc người dùng: Tất cả');
    }
    
    // Lấy danh sách email người dùng
    const users = await getEmails({ filter: finalFilter });
    
    if (users.length === 0) {
      console.log('❌ Không tìm thấy người dùng nào phù hợp');
      return;
    }
    
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

    // Gửi email theo từng batch
    const result = await sendEmailToBatches({
      subject,
      htmlContent: finalHtmlContent,
      users,
      batchSize: parseInt(batchSize, 10)
    });

    // Lưu lịch sử gửi thông báo
    const status = result.failed > 0 ? 'partial' : 'success';
    await EmailNotificationLog.create({
      subject,
      message,
      type: 'bulk',
      userGroup,
      sentBy: null, // Null vì gửi từ script
      recipientCount: result.totalSent,
      status,
      metadata: {
        sentFromScript: true,
        totalUsers: users.length,
        totalSent: result.totalSent,
        failed: result.failed
      }
    });

    console.log('\n📊 Kết quả gửi email:');
    console.log(`- Tổng số người dùng: ${users.length}`);
    console.log(`- Gửi thành công: ${result.totalSent}`);
    console.log(`- Gửi thất bại: ${result.failed}`);
    
    if (result.failedEmails.length > 0) {
      console.log('\n❌ Các địa chỉ email thất bại:');
      console.log(result.failedEmails.slice(0, 10).join(', ') + 
                (result.failedEmails.length > 10 ? ' (và nhiều hơn...)' : ''));
    }
    
    console.log(`🎉 Đã gửi email thành công đến ${result.totalSent} người dùng`);
  } catch (error) {
    console.error('❌ Lỗi khi gửi email:', error);
    
    try {
      // Lưu lịch sử lỗi
      await EmailNotificationLog.create({
        subject: options.subject || 'Email hàng loạt',
        message: options.message || '',
        type: 'bulk',
        userGroup: options.userGroup || 'all',
        sentBy: null,
        recipientCount: 0,
        status: 'failed',
        errorMessage: error.message || 'Unknown error',
        metadata: {
          sentFromScript: true
        }
      });
    } catch (logError) {
      console.error('❌ Lỗi khi ghi log thất bại:', logError);
    }
    
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔚 Đã đóng kết nối MongoDB');
  }
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
  // Lấy các tham số từ dòng lệnh
  const args = process.argv.slice(2);
  const params = {};
  args.forEach((arg, index) => {
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : true;
      params[key] = value;
    }
  });
  
  // Chế độ tương tác nếu không có tham số
  if (Object.keys(params).length === 0) {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('📧 Gửi email thông báo tới người dùng');
    console.log('-------------------------------------');

    readline.question('Tiêu đề email: ', (subject) => {
      readline.question('Nội dung thông báo: ', (message) => {
        readline.question('Nhóm người dùng (all/premium/free, mặc định: all): ', (userGroup) => {
          readline.question('Kích thước batch (số lượng email mỗi lần gửi, mặc định: 50): ', (batchSizeStr) => {
            readline.close();
            
            const finalUserGroup = userGroup || 'all';
            const batchSize = parseInt(batchSizeStr, 10) || 50;
            
            console.log(`\n📤 Bắt đầu gửi email cho nhóm: ${finalUserGroup}...`);
            sendEmailToUsers({ 
              subject, 
              message,
              userGroup: finalUserGroup,
              batchSize 
            })
              .then(() => console.log('✅ Hoàn thành'))
              .catch(err => console.error('❌ Lỗi:', err))
              .finally(() => process.exit());
          });
        });
      });
    });
  } else {
    // Sử dụng tham số từ dòng lệnh
    if (!params.subject || !params.message) {
      console.error('❌ Thiếu thông tin bắt buộc: --subject "Tiêu đề" --message "Nội dung"');
      console.log('Sử dụng: node sendEmailToAllUsers.js --subject "Tiêu đề" --message "Nội dung" [--userGroup all|premium|free] [--batchSize 50]');
      process.exit(1);
    }
    
    sendEmailToUsers({ 
      subject: params.subject, 
      message: params.message,
      userGroup: params.userGroup || 'all',
      batchSize: params.batchSize || 50
    })
      .then(() => console.log('✅ Hoàn thành'))
      .catch(err => console.error('❌ Lỗi:', err))
      .finally(() => process.exit());
  }
}

module.exports = {
  getEmails,
  sendEmailToBatches,
  sendEmailToUsers
};
