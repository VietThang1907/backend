// src/docs/bulkEmailSwagger.js
/**
 * @swagger
 * tags:
 *   name: Bulk Email
 *   description: API gửi email hàng loạt đến người dùng
 */

/**
 * @swagger
 * /api/admin/notifications/send-bulk:
 *   post:
 *     summary: Gửi email hàng loạt đến người dùng
 *     description: Gửi email thông báo đến tất cả người dùng hoặc nhóm người dùng cụ thể
 *     tags: [Bulk Email]
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
 *                 enum: [all, premium, free, custom]
 *                 description: Nhóm người dùng nhận thông báo
 *                 default: all
 *               filter:
 *                 type: object
 *                 description: Bộ lọc MongoDB tùy chỉnh (chỉ khi userGroup là custom)
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
 *                   example: Đã gửi thông báo thành công đến 100 người dùng
 *                 result:
 *                   type: object
 *                   properties:
 *                     totalSent:
 *                       type: integer
 *                       example: 100
 *                     failed:
 *                       type: integer
 *                       example: 0
 *                     failedEmails:
 *                       type: array
 *                       items:
 *                         type: string
 *                         format: email
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy người dùng
 *       500:
 *         description: Lỗi server
 */

/**
 * @swagger
 * /api/admin/notifications/send-to-users:
 *   post:
 *     summary: Gửi email đến danh sách người dùng theo ID
 *     description: Gửi email thông báo đến danh sách người dùng được chọn theo ID
 *     tags: [Bulk Email]
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
 *               - userIds
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
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Danh sách ID người dùng
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
 *                   example: Đã gửi thông báo thành công đến 10 người dùng
 *                 result:
 *                   type: object
 *                   properties:
 *                     totalSent:
 *                       type: integer
 *                       example: 10
 *                     failed:
 *                       type: integer
 *                       example: 0
 *                     failedEmails:
 *                       type: array
 *                       items:
 *                         type: string
 *                         format: email
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy người dùng
 *       500:
 *         description: Lỗi server
 */
