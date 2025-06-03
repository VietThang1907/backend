// src/controllers/notificationEmailController.js
const User = require('../models/user');
const EmailNotificationLog = require('../models/emailNotificationLog');
const { transporter } = require('../config/email');
const asyncHandler = require('express-async-handler');

/**
 * Lấy danh sách email người dùng dựa trên bộ lọc
 * @param {Object} filter - Bộ lọc MongoDB
 * @returns {Promise<Array>} Danh sách người dùng
 */
const getUsersByFilter = async (filter = {}) => {
    // Thêm trường isActive vào filter nếu chưa có
    const finalFilter = { ...filter };
    if (!('isActive' in finalFilter)) {
        finalFilter.isActive = true;
    }
    
    // Lấy danh sách người dùng
    return await User.find(finalFilter).select('email fullname');
};

/**
 * Gửi email tới danh sách người dùng (được chia thành các nhóm nhỏ)
 * @param {Object} options - Tùy chọn email
 * @param {string} options.subject - Tiêu đề email
 * @param {string} options.htmlContent - Nội dung HTML
 * @param {Array} options.users - Danh sách người dùng
 * @param {number} options.batchSize - Kích thước mỗi batch (mặc định là 50)
 * @returns {Promise<number>} Số lượng email đã gửi
 */
const sendEmailToBatches = async ({ subject, htmlContent, users, batchSize = 50 }) => {
    // Chia thành các nhóm nhỏ để tránh bị chặn
    const batches = [];
    for (let i = 0; i < users.length; i += batchSize) {
        batches.push(users.slice(i, i + batchSize));
    }
    
    let totalSent = 0;
    
    // Gửi email theo từng batch
    for (const batch of batches) {
        const emailList = batch.map(user => user.email);
        
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
        
        // Chờ một chút trước khi gửi batch tiếp theo (để tránh rate limiting)
        if (batch !== batches[batches.length - 1]) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    return totalSent;
};

/**
 * @desc    Gửi email thông báo về bảo trì hệ thống đến các người dùng
 * @route   POST /api/admin/notifications/send-maintenance
 * @access  Private/Admin
 */
const sendMaintenanceNotification = asyncHandler(async (req, res) => {
    try {
        const { subject, message, maintenanceTime, expectedDuration, userGroup, customFilter } = req.body;
        
        if (!subject || !message || !maintenanceTime || !expectedDuration) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp đầy đủ thông tin: tiêu đề, nội dung, thời gian bảo trì và thời gian dự kiến hoàn thành' 
            });
        }

        // Xây dựng query dựa vào userGroup
        let query = { isActive: true };
        
        if (userGroup === 'premium') {
            // Lọc người dùng premium
            query.accountTypeId = { $ne: null }; // Giả sử accountTypeId null là người dùng miễn phí
        } else if (userGroup === 'free') {
            // Lọc người dùng miễn phí
            query.accountTypeId = null; // Giả sử accountTypeId null là người dùng miễn phí
        }
        // Nếu userGroup là 'all' hoặc không được cung cấp, sử dụng query mặc định

        // Lấy danh sách email của người dùng phù hợp
        const users = await User.find(query).select('email fullname');
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng nào phù hợp với điều kiện'
            });
        }

        const emailList = users.map(user => user.email);
        
        // Tạo nội dung email với thiết kế đẹp
        // Format thời gian để hiển thị đẹp hơn
        const formatDateTime = (dateTimeString) => {
            if (!dateTimeString) return '';
            
            // Đảm bảo chuyển đổi sang đối tượng Date
            const date = new Date(dateTimeString);
            
            // Format ngày tháng theo định dạng Việt Nam: DD/MM/YYYY, HH:MM
            return date.toLocaleString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false // Sử dụng định dạng 24 giờ
            }).replace(/\./g, '/'); // Đảm bảo dấu phân cách là dấu / thay vì dấu .
        };        const formattedStartTime = formatDateTime(maintenanceTime);
        const formattedEndTime = formatDateTime(expectedDuration);
        
        const emailContent = {
            from: process.env.EMAIL_USER,
            bcc: emailList, // Sử dụng BCC để ẩn danh sách người nhận
            subject: subject,
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thông Báo Bảo Trì Hệ Thống</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; color: #333333;">  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); margin-top: 20px;">
    <tr>      <td style="background: linear-gradient(135deg, #6a0572, #ab0c8b); padding: 20px; text-align: center;">        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>            <td width="80" style="vertical-align: middle;">
              <img src="https://res.cloudinary.com/dtk2qgorj/image/upload/c_scale,w_120,h_120,q_auto,f_auto/v1748064723/emails/logo.png" alt="Movie Streaming Logo" style="width: 60px; height: 60px; display: block; border: 0; margin: 0 auto;" />
            </td>
            <td style="vertical-align: middle; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">THÔNG BÁO BẢO TRÌ HỆ THỐNG</h1>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 30px 10px;">
        <p style="margin-top: 0; margin-bottom: 20px; font-size: 16px; line-height: 1.6;">Kính gửi Quý khách hàng,</p>
        <p style="margin-bottom: 20px; font-size: 16px; line-height: 1.6;">${message}</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 10px 30px;">
        <div style="background-color: #f9f5fc; border-left: 4px solid #6a0572; padding: 15px 20px; border-radius: 5px;">
          <p style="margin: 0 0 10px; font-weight: 600; color: #333;">Chi tiết bảo trì:</p>
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="180" style="font-size: 15px; color: #555;">⏰ Thời gian bắt đầu:</td>
              <td style="font-size: 15px; font-weight: 600;">${formattedStartTime}</td>
            </tr>
            <tr>
              <td style="font-size: 15px; color: #555; padding-top: 10px;">⌛ Dự kiến hoàn thành:</td>
              <td style="font-size: 15px; font-weight: 600; padding-top: 10px;">${formattedEndTime}</td>
            </tr>
          </table>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 30px 30px;">
        <p style="margin-bottom: 10px; font-size: 16px; line-height: 1.6;">Chúng tôi rất xin lỗi vì sự bất tiện này và cảm ơn sự thông cảm của bạn.</p>
        <p style="margin-bottom: 0; font-size: 16px; line-height: 1.6;">Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua email hỗ trợ.</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 30px; border-top: 1px solid #eeeeee; background-color: #f9f9f9;">
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #333;">Trân trọng,</p>
        <p style="margin: 5px 0 0; font-size: 16px; color: #666;">Đội ngũ Movie Streaming</p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #6a0572; padding: 15px; text-align: center;">
        <p style="margin: 0; color: #ffffff; font-size: 14px;">© ${new Date().getFullYear()} Movie Streaming. All rights reserved.</p>
      </td>
    </tr>
  </table>
</body>
</html>
            `
        };
        
        // Gửi email
        await transporter.sendMail(emailContent);

        // Lưu lịch sử gửi thông báo
        await EmailNotificationLog.create({
            subject,
            message,
            type: 'maintenance',
            userGroup: userGroup || 'all',
            sentBy: req.user._id, // Từ middleware auth
            recipientCount: emailList.length,
            status: 'success',
            metadata: {
                maintenanceTime,
                expectedDuration
            }
        });

        return res.status(200).json({
            success: true,
            message: `Đã gửi thông báo thành công đến ${emailList.length} người dùng`,
            count: emailList.length
        });
    } catch (error) {
        console.error('Error sending maintenance notification:', error);
        
        // Lưu lịch sử lỗi nếu có thông tin người dùng 
        if (req.user && req.user._id) {
            try {
                await EmailNotificationLog.create({
                    subject: req.body.subject || 'Thông báo bảo trì',
                    message: req.body.message || '',
                    type: 'maintenance',
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
            message: 'Lỗi khi gửi thông báo bảo trì',
            error: error.message
        });
    }
});

/**
 * @desc    Gửi email thông báo tùy chỉnh đến tất cả người dùng
 * @route   POST /api/admin/notifications/send-custom
 * @access  Private/Admin
 */
const sendCustomNotification = asyncHandler(async (req, res) => {
    try {
        const { subject, message, htmlContent, userGroup } = req.body;
        
        if (!subject || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp đầy đủ tiêu đề và nội dung thông báo' 
            });
        }

        // Xây dựng query dựa vào userGroup
        let query = { isActive: true };
        
        if (userGroup === 'premium') {
            // Lọc người dùng premium
            query.accountTypeId = { $ne: null }; // Giả sử accountTypeId null là người dùng miễn phí
        } else if (userGroup === 'free') {
            // Lọc người dùng miễn phí
            query.accountTypeId = null; // Giả sử accountTypeId null là người dùng miễn phí
        }
        // Nếu userGroup là 'all' hoặc không được cung cấp, sử dụng query mặc định

        // Lấy danh sách email của người dùng phù hợp
        const users = await User.find(query).select('email fullname');
        
        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng nào phù hợp với điều kiện'
            });
        }        const emailList = users.map(user => user.email);
        
        // Tạo nội dung email đẹp hơn
        const emailContent = {
            from: process.env.EMAIL_USER,
            bcc: emailList, // Sử dụng BCC để ẩn danh sách người nhận
            subject: subject,
            html: htmlContent || `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4; color: #333333;">  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); margin-top: 20px;">
    <tr>
      <td style="background: linear-gradient(135deg, #6a0572, #ab0c8b); padding: 20px; text-align: center;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>            <td width="80" style="vertical-align: middle;">
              <img src="https://res.cloudinary.com/dtk2qgorj/image/upload/c_scale,w_120,h_120,q_auto,f_auto/v1748064723/emails/logo.png" alt="Movie Streaming Logo" style="width: 60px; height: 60px; display: block; border: 0; margin: 0 auto;">
            </td>
            <td style="vertical-align: middle; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">${subject.toUpperCase()}</h1>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 30px 20px;">
        <p style="margin-top: 0; margin-bottom: 20px; font-size: 16px; line-height: 1.6;">Kính gửi Quý khách hàng,</p>
        <div style="font-size: 16px; line-height: 1.8; color: #333;">${message}</div>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 30px; border-top: 1px solid #eeeeee; background-color: #f9f9f9;">
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #333;">Trân trọng,</p>
        <p style="margin: 5px 0 0; font-size: 16px; color: #666;">Đội ngũ Movie Streaming</p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #6a0572; padding: 15px; text-align: center;">
        <p style="margin: 0; color: #ffffff; font-size: 14px;">© ${new Date().getFullYear()} Movie Streaming. All rights reserved.</p>
      </td>
    </tr>
  </table>
</body>
</html>            `
        };
        
        // Gửi email
        await transporter.sendMail(emailContent);

        // Lưu lịch sử gửi thông báo
        await EmailNotificationLog.create({
            subject,
            message,
            type: 'custom',
            userGroup: userGroup || 'all',
            sentBy: req.user._id, // Từ middleware auth
            recipientCount: emailList.length,
            status: 'success',
            metadata: {
                hasHtmlContent: !!htmlContent
            }
        });

        return res.status(200).json({
            success: true,
            message: `Đã gửi thông báo thành công đến ${emailList.length} người dùng`,
            count: emailList.length
        });
    } catch (error) {
        console.error('Error sending custom notification:', error);
        
        // Lưu lịch sử lỗi nếu có thông tin người dùng 
        if (req.user && req.user._id) {
            try {
                await EmailNotificationLog.create({
                    subject: req.body.subject || 'Thông báo tùy chỉnh',
                    message: req.body.message || '',
                    type: 'custom',
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
            message: 'Lỗi khi gửi thông báo tùy chỉnh',
            error: error.message
        });
    }
});

/**
 * @desc    Lấy lịch sử gửi thông báo email
 * @route   GET /api/admin/notifications/history
 * @access  Private/Admin
 */
const getNotificationHistory = asyncHandler(async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Lấy tổng số bản ghi
        const total = await EmailNotificationLog.countDocuments();
        
        // Lấy lịch sử thông báo với phân trang và populate thông tin user
        const logs = await EmailNotificationLog.find()
            .sort({ createdAt: -1 }) // Sắp xếp mới nhất lên đầu
            .skip(skip)
            .limit(limit)
            .populate('sentBy', 'fullname email')
            .lean();
        
        return res.status(200).json({
            success: true,
            data: {
                logs,
                pagination: {
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Error fetching notification history:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy lịch sử thông báo',
            error: error.message
        });
    }
});

module.exports = {
    sendMaintenanceNotification,
    sendCustomNotification,
    getNotificationHistory
};
