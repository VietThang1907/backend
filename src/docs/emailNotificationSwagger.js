// src/docs/emailNotificationSwagger.js
/**
 * @swagger
 * tags:
 *   name: Email Notifications
 *   description: API quản lý và gửi thông báo email đến người dùng
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     EmailNotificationLog:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: ID của log
 *         subject:
 *           type: string
 *           description: Tiêu đề email
 *         message:
 *           type: string
 *           description: Nội dung thông báo
 *         type:
 *           type: string
 *           enum: [maintenance, custom, bulk, selected-users]
 *           description: Loại thông báo
 *         userGroup:
 *           type: string
 *           enum: [all, premium, free, custom, custom-emails]
 *           description: Nhóm người dùng nhận thông báo
 *         sentBy:
 *           type: string
 *           description: ID của admin gửi thông báo
 *         recipientCount:
 *           type: number
 *           description: Số lượng người nhận thông báo
 *         status:
 *           type: string
 *           enum: [success, failed, partial]
 *           description: Trạng thái gửi thông báo
 *         errorMessage:
 *           type: string
 *           description: Thông báo lỗi (nếu có)
 *         metadata:
 *           type: object
 *           description: Thông tin bổ sung
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Thời gian tạo
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Thời gian cập nhật
 */

/**
 * @swagger
 * /api/admin/notifications/send-maintenance:
 *   post:
 *     summary: Gửi thông báo bảo trì hệ thống
 *     description: Gửi email thông báo về việc bảo trì hệ thống đến các người dùng
 *     tags: [Email Notifications]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - message
 *               - maintenanceTime
 *               - expectedDuration
 *             properties:
 *               subject:
 *                 type: string
 *                 description: Tiêu đề email
 *               message:
 *                 type: string
 *                 description: Nội dung thông báo
 *               maintenanceTime:
 *                 type: string
 *                 description: Thời gian bắt đầu bảo trì
 *               expectedDuration:
 *                 type: string
 *                 description: Thời gian dự kiến hoàn thành
 *               userGroup:
 *                 type: string
 *                 enum: [all, premium, free]
 *                 description: Nhóm người dùng nhận thông báo
 *                 default: all
 *     responses:
 *       200:
 *         description: Gửi thông báo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Đã gửi thông báo thành công đến 100 người dùng
 *                 count:
 *                   type: number
 *                   example: 100
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy người dùng
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/admin/notifications/send-custom:
 *   post:
 *     summary: Gửi thông báo tùy chỉnh
 *     description: Gửi email thông báo tùy chỉnh đến người dùng
 *     tags: [Email Notifications]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - message
 *             properties:
 *               subject:
 *                 type: string
 *                 description: Tiêu đề email
 *               message:
 *                 type: string
 *                 description: Nội dung thông báo
 *               htmlContent:
 *                 type: string
 *                 description: Nội dung HTML tùy chỉnh (tùy chọn)
 *               userGroup:
 *                 type: string
 *                 enum: [all, premium, free]
 *                 description: Nhóm người dùng nhận thông báo
 *                 default: all
 *     responses:
 *       200:
 *         description: Gửi thông báo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Đã gửi thông báo thành công đến 100 người dùng
 *                 count:
 *                   type: number
 *                   example: 100
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy người dùng
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/admin/notifications/send-to-emails:
 *   post:
 *     summary: Gửi email đến danh sách email cụ thể
 *     description: Gửi email thông báo đến danh sách email do người dùng cung cấp
 *     tags: [Email Notifications]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subject
 *               - message
 *               - emails
 *             properties:
 *               subject:
 *                 type: string
 *                 description: Tiêu đề email
 *               message:
 *                 type: string
 *                 description: Nội dung thông báo
 *               htmlContent:
 *                 type: string
 *                 description: Nội dung HTML tùy chỉnh (tùy chọn)
 *               emails:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: email
 *                 description: Danh sách địa chỉ email
 *               batchSize:
 *                 type: integer
 *                 description: Kích thước mỗi batch
 *                 default: 50
 *     responses:
 *       200:
 *         description: Gửi thông báo thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Đã gửi thông báo thành công đến 10 địa chỉ email
 *                 count:
 *                   type: number
 *                   example: 10
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/admin/notifications/history:
 *   get:
 *     summary: Lấy lịch sử gửi thông báo email
 *     description: Lấy lịch sử gửi thông báo email với phân trang
 *     tags: [Email Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng kết quả trên một trang
 *     responses:
 *       200:
 *         description: Lấy lịch sử thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/EmailNotificationLog'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 50
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         pages:
 *                           type: integer
 *                           example: 5
 *       500:
 *         description: Lỗi server
 */
