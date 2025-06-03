// src/routes/notificationEmailRoutes.js
const express = require('express');
const router = express.Router();
const notificationEmailController = require('../controllers/notificationEmailController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// Áp dụng middleware xác thực và quyền admin cho tất cả các routes
router.use(authMiddleware.isAuthenticated);
router.use(adminMiddleware.isAdmin);

// Route gửi thông báo bảo trì
router.post('/send-maintenance', notificationEmailController.sendMaintenanceNotification);

// Route gửi thông báo tùy chỉnh
router.post('/send-custom', notificationEmailController.sendCustomNotification);

// Route gửi email đến danh sách email cụ thể
router.post('/send-to-emails', async (req, res) => {
    try {
        const { subject, message, htmlContent, emails } = req.body;
        
        if (!subject || !message || !emails || !Array.isArray(emails) || emails.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp đầy đủ tiêu đề, nội dung và danh sách email'
            });
        }

        // Kiểm tra danh sách email hợp lệ
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validEmails = emails.filter(email => emailRegex.test(email));
        
        if (validEmails.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không có email hợp lệ nào trong danh sách'
            });
        }

        // Tạo nội dung HTML cho email
        const defaultHtmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <h2 style="color: #e50914;">Thông Báo Từ Movie Streaming</h2>
                <p>Kính gửi Quý khách hàng,</p>
                <p>${message}</p>
                <p>Trân trọng,<br>Đội ngũ hỗ trợ Movie Streaming</p>
            </div>
        `;

        const { transporter } = require('../config/email');
        const EmailNotificationLog = require('../models/emailNotificationLog');

        // Chia thành các nhóm nhỏ để tránh bị chặn
        const batchSize = req.body.batchSize || 50;
        const batches = [];
        for (let i = 0; i < validEmails.length; i += batchSize) {
            batches.push(validEmails.slice(i, i + batchSize));
        }
        
        let totalSent = 0;
        
        // Gửi email theo từng batch
        for (let [index, batch] of batches.entries()) {
            // Tạo nội dung email
            const emailContent = {
                from: process.env.EMAIL_USER,
                bcc: batch, // Sử dụng BCC để ẩn danh sách người nhận
                subject: subject,
                html: htmlContent || defaultHtmlContent
            };

            // Gửi email
            await transporter.sendMail(emailContent);
            totalSent += batch.length;
            
            // Chờ một chút giữa các lần gửi để tránh giới hạn tốc độ
            if (index < batches.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Lưu lịch sử gửi thông báo
        await EmailNotificationLog.create({
            subject,
            message,
            type: 'custom',
            userGroup: 'custom-emails',
            sentBy: req.user._id,
            recipientCount: totalSent,
            status: 'success',
            metadata: {
                hasHtmlContent: !!htmlContent,
                emailCount: validEmails.length
            }
        });

        return res.status(200).json({
            success: true,
            message: `Đã gửi thông báo thành công đến ${totalSent} địa chỉ email`,
            count: totalSent
        });
    } catch (error) {
        console.error('Error sending emails to specific addresses:', error);
        
        // Cố gắng lưu lịch sử lỗi
        try {
            const EmailNotificationLog = require('../models/emailNotificationLog');
            if (req.user && req.user._id) {
                await EmailNotificationLog.create({
                    subject: req.body.subject || 'Thông báo tùy chỉnh',
                    message: req.body.message || '',
                    type: 'custom',
                    userGroup: 'custom-emails',
                    sentBy: req.user._id,
                    recipientCount: 0,
                    status: 'failed',
                    errorMessage: error.message || 'Unknown error'
                });
            }
        } catch (logError) {
            console.error('Error logging email failure:', logError);
        }
        
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi gửi thông báo tùy chỉnh',
            error: error.message
        });
    }
});

// Route lấy lịch sử gửi thông báo
router.get('/history', notificationEmailController.getNotificationHistory);

module.exports = router;
