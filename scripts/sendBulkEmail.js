// scripts/sendBulkEmail.js
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user');
const EmailNotificationLog = require('../src/models/emailNotificationLog');
const { transporter, verifyEmailConfig } = require('../src/config/email');

// Kết nối đến database
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

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
    
    // Gửi email theo từng batch
    for (let [index, batch] of batches.entries()) {
        const emailList = batch.map(user => user.email);
        
        try {
            // Tạo nội dung email
            const emailContent = {
                from: process.env.EMAIL_USER10,
                bcc: emailList, // Sử dụng BCC để ẩn danh sách người nhận
                subject: subject,
                html: htmlContent
            };
            
            // Gửi email
            await transporter.sendMail(emailContent);
            totalSent += emailList.length;
            
            console.log(`Batch ${index + 1}/${batches.length}: Sent to ${emailList.length} users`);
        } catch (error) {
            console.error(`Batch ${index + 1}/${batches.length}: Failed to send - ${error.message}`);
            failed += emailList.length;
            failedEmails = [...failedEmails, ...emailList];
        }
        
        // Chờ một chút trước khi gửi batch tiếp theo (để tránh rate limiting)
        if (index < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    return {
        totalSent,
        failed,
        failedEmails
    };
};

/**
 * Hàm chính để gửi email
 */
const sendBulkEmailToUsers = async () => {
    try {
        // Kiểm tra cấu hình email
        const emailConfigOk = await verifyEmailConfig();
        if (!emailConfigOk) {
            console.error('Email configuration is not valid');
            process.exit(1);
        }

        // Lấy tham số từ command line
        const args = process.argv.slice(2);
        const params = {};
        args.forEach((arg, index) => {
            if (arg.startsWith('--')) {
                const key = arg.slice(2);
                const value = args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : true;
                params[key] = value;
            }
        });

        // Kiểm tra tham số bắt buộc
        if (!params.subject || !params.message) {
            console.error('Required parameters: --subject "Email Subject" --message "Email message"');
            console.log('Optional parameters:');
            console.log('  --userGroup [all|premium|free] (default: all)');
            console.log('  --batchSize [number] (default: 50)');
            console.log('  --dryRun (only counts users, does not send emails)');
            process.exit(1);
        }

        // Xây dựng query dựa vào userGroup
        let query = { isActive: true };
        if (params.userGroup === 'premium') {
            query.accountTypeId = { $ne: null };
        } else if (params.userGroup === 'free') {
            query.accountTypeId = null;
        }

        // Lấy danh sách người dùng
        const users = await User.find(query).select('email fullname');
        console.log(`Found ${users.length} users matching criteria`);

        // Nếu là dry run, chỉ hiển thị số lượng và thoát
        if (params.dryRun) {
            console.log('Dry run completed. No emails sent.');
            process.exit(0);
        }

        // Tạo nội dung HTML
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <h2 style="color: #e50914;">Thông Báo Từ Movie Streaming</h2>
                <p>Kính gửi Quý khách hàng,</p>
                <p>${params.message}</p>
                <p>Trân trọng,<br>Đội ngũ hỗ trợ Movie Streaming</p>
            </div>
        `;

        // Gửi email theo từng batch
        const batchSize = parseInt(params.batchSize, 10) || 50;
        console.log(`Sending emails in batches of ${batchSize}...`);

        const result = await sendEmailToBatches({
            subject: params.subject,
            htmlContent,
            users,
            batchSize
        });

        // Lưu lịch sử gửi thông báo
        const status = result.failed > 0 ? 'partial' : 'success';
        await EmailNotificationLog.create({
            subject: params.subject,
            message: params.message,
            type: 'bulk',
            userGroup: params.userGroup || 'all',
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

        console.log('\nEmail sending completed:');
        console.log(`- Total users: ${users.length}`);
        console.log(`- Successfully sent: ${result.totalSent}`);
        console.log(`- Failed: ${result.failed}`);
        
        if (result.failedEmails.length > 0) {
            console.log('\nFailed email addresses:');
            console.log(result.failedEmails.slice(0, 10).join(', ') + 
                      (result.failedEmails.length > 10 ? ' (and more...)' : ''));
        }

        // Ngắt kết nối database
        await mongoose.disconnect();
        console.log('Done.');
    } catch (error) {
        console.error('Error sending bulk emails:', error);
        
        try {
            // Lưu lịch sử lỗi
            await EmailNotificationLog.create({
                subject: params?.subject || 'Bulk Email',
                message: params?.message || '',
                type: 'bulk',
                userGroup: params?.userGroup || 'all',
                sentBy: null,
                recipientCount: 0,
                status: 'failed',
                errorMessage: error.message || 'Unknown error',
                metadata: {
                    sentFromScript: true
                }
            });
        } catch (logError) {
            console.error('Error logging failure:', logError);
        }
        
        await mongoose.disconnect();
        process.exit(1);
    }
};

// Chạy hàm chính
sendBulkEmailToUsers();
