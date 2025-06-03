// src/controllers/bulkEmailController.js
const User = require('../models/user');
const EmailNotificationLog = require('../models/emailNotificationLog');
const { transporter } = require('../config/email');
const asyncHandler = require('express-async-handler');

/**
 * Gửi email tới danh sách người dùng (được chia thành các nhóm nhỏ)
 * @param {Object} options - Tùy chọn email
 * @param {string} options.subject - Tiêu đề email
 * @param {string} options.htmlContent - Nội dung HTML
 * @param {Array} options.users - Danh sách người dùng
 * @param {number} options.batchSize - Kích thước mỗi batch (mặc định là 50)
 * @returns {Promise<Object>} Kết quả gửi email bao gồm tổng số gửi thành công và thất bại
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
                from: process.env.EMAIL_USER,
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
 * @desc    Gửi email đến tất cả người dùng trong hệ thống phân theo batch
 * @route   POST /api/admin/notifications/send-bulk
 * @access  Private/Admin
 */
const sendBulkNotification = asyncHandler(async (req, res) => {
    try {
        const { 
            subject, 
            message, 
            htmlContent, 
            userGroup = 'all', 
            filter = {}, 
            batchSize = 50 
        } = req.body;
        
        if (!subject || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp đầy đủ tiêu đề và nội dung thông báo' 
            });
        }

        // Xây dựng query dựa vào userGroup
        let query = { isActive: true, ...filter };
        
        if (userGroup === 'premium') {
            // Lọc người dùng premium
            query.accountTypeId = { $ne: null };
        } else if (userGroup === 'free') {
            // Lọc người dùng miễn phí
            query.accountTypeId = null;
        } else if (userGroup === 'custom' && filter) {
            // Sử dụng filter tùy chỉnh từ người dùng
            query = { ...query, ...filter };
        }

        // Lấy danh sách người dùng phù hợp
        const users = await User.find(query).select('email fullname');
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng nào phù hợp với điều kiện'
            });
        }

        // Tạo nội dung email mặc định nếu không cung cấp htmlContent
        const defaultHtmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <h2 style="color: #e50914;">Thông Báo Từ Movie Streaming</h2>
                <p>Kính gửi Quý khách hàng,</p>
                <p>${message}</p>
                <p>Trân trọng,<br>Đội ngũ hỗ trợ Movie Streaming</p>
            </div>
        `;

        // Gửi email theo từng batch
        const emailResult = await sendEmailToBatches({
            subject,
            htmlContent: htmlContent || defaultHtmlContent,
            users,
            batchSize: parseInt(batchSize, 10)
        });

        // Lưu lịch sử gửi thông báo
        const status = emailResult.failed > 0 ? 'partial' : 'success';
        
        await EmailNotificationLog.create({
            subject,
            message,
            type: 'bulk',
            userGroup,
            sentBy: req.user._id,
            recipientCount: emailResult.totalSent,
            status,
            metadata: {
                hasHtmlContent: !!htmlContent,
                totalUsers: users.length,
                totalSent: emailResult.totalSent,
                failed: emailResult.failed,
                failedEmails: emailResult.failedEmails.length <= 10 ? emailResult.failedEmails : 
                              emailResult.failedEmails.slice(0, 10).concat(['...and more'])
            }
        });

        return res.status(200).json({
            success: true,
            message: `Đã gửi thông báo thành công đến ${emailResult.totalSent} người dùng` +
                     (emailResult.failed > 0 ? `, thất bại ${emailResult.failed} người dùng` : ''),
            result: emailResult
        });
    } catch (error) {
        console.error('Error sending bulk notification:', error);
        
        // Lưu lịch sử lỗi nếu có thông tin người dùng 
        if (req.user && req.user._id) {
            try {
                await EmailNotificationLog.create({
                    subject: req.body.subject || 'Thông báo hàng loạt',
                    message: req.body.message || '',
                    type: 'bulk',
                    userGroup: req.body.userGroup || 'all',
                    sentBy: req.user._id,
                    recipientCount: 0,
                    status: 'failed',
                    errorMessage: error.message || 'Unknown error'
                });
            } catch (logError) {
                console.error('Error logging email failure:', logError);
            }
        }
        
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi gửi thông báo hàng loạt',
            error: error.message
        });
    }
});

/**
 * @desc    Gửi email đến danh sách người dùng theo ID
 * @route   POST /api/admin/notifications/send-to-users
 * @access  Private/Admin
 */
const sendToSelectedUsers = asyncHandler(async (req, res) => {
    try {
        const { subject, message, htmlContent, userIds, batchSize = 50 } = req.body;
        
        if (!subject || !message || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ tiêu đề, nội dung và danh sách ID người dùng'
            });
        }

        // Tìm người dùng theo danh sách ID
        const users = await User.find({
            _id: { $in: userIds },
            isActive: true
        }).select('email fullname');
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng nào phù hợp với danh sách ID'
            });
        }

        // Tạo nội dung email mặc định nếu không cung cấp htmlContent
        const defaultHtmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <h2 style="color: #e50914;">Thông Báo Từ Movie Streaming</h2>
                <p>Kính gửi Quý khách hàng,</p>
                <p>${message}</p>
                <p>Trân trọng,<br>Đội ngũ hỗ trợ Movie Streaming</p>
            </div>
        `;

        // Gửi email theo từng batch
        const emailResult = await sendEmailToBatches({
            subject,
            htmlContent: htmlContent || defaultHtmlContent,
            users,
            batchSize: parseInt(batchSize, 10)
        });

        // Lưu lịch sử gửi thông báo
        const status = emailResult.failed > 0 ? 'partial' : 'success';
        
        await EmailNotificationLog.create({
            subject,
            message,
            type: 'selected-users',
            userGroup: 'custom',
            sentBy: req.user._id,
            recipientCount: emailResult.totalSent,
            status,
            metadata: {
                hasHtmlContent: !!htmlContent,
                totalUsers: users.length,
                totalSent: emailResult.totalSent,
                failed: emailResult.failed,
                userIds: userIds.length <= 10 ? userIds : userIds.slice(0, 10).concat(['...and more'])
            }
        });

        return res.status(200).json({
            success: true,
            message: `Đã gửi thông báo thành công đến ${emailResult.totalSent} người dùng` +
                     (emailResult.failed > 0 ? `, thất bại ${emailResult.failed} người dùng` : ''),
            result: emailResult
        });
    } catch (error) {
        console.error('Error sending to selected users:', error);
        
        // Lưu lịch sử lỗi nếu có thông tin người dùng 
        if (req.user && req.user._id) {
            try {
                await EmailNotificationLog.create({
                    subject: req.body.subject || 'Thông báo tùy chọn',
                    message: req.body.message || '',
                    type: 'selected-users',
                    userGroup: 'custom',
                    sentBy: req.user._id,
                    recipientCount: 0,
                    status: 'failed',
                    errorMessage: error.message || 'Unknown error'
                });
            } catch (logError) {
                console.error('Error logging email failure:', logError);
            }
        }
        
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi gửi thông báo đến người dùng đã chọn',
            error: error.message
        });
    }
});

module.exports = {
    sendBulkNotification,
    sendToSelectedUsers,
    sendEmailToBatches
};
