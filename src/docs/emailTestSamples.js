// src/docs/emailTestSamples.js
/**
 * @swagger
 * components:
 *   examples:
 *     MaintenanceNotification:
 *       summary: Mẫu thông báo bảo trì
 *       value:
 *         subject: "Thông báo bảo trì hệ thống xem phim Movie Streaming"
 *         message: "Chúng tôi sẽ tiến hành bảo trì hệ thống để nâng cấp và cải thiện chất lượng dịch vụ. Trong thời gian này, hệ thống sẽ tạm ngưng hoạt động."
 *         maintenanceTime: "2025-05-30 23:00"
 *         expectedDuration: "2 giờ"
 *         userGroup: "all"
 *     
 *     CustomNotification:
 *       summary: Mẫu thông báo tùy chỉnh
 *       value:
 *         subject: "Phim mới tháng 5 - Movie Streaming"
 *         message: "Chúng tôi vừa cập nhật các bộ phim bom tấn của tháng 5. Hãy đăng nhập để xem ngay!"
 *         userGroup: "all"
 *     
 *     BulkEmail:
 *       summary: Mẫu gửi email hàng loạt
 *       value:
 *         subject: "Ưu đãi dành riêng cho thành viên Movie Streaming"
 *         message: "Nhân dịp kỷ niệm 1 năm thành lập, chúng tôi gửi tặng bạn voucher giảm 30% khi đăng ký gói Premium."
 *         userGroup: "free"
 *         batchSize: 50
 *     
 *     SendToUsers:
 *       summary: Mẫu gửi email đến người dùng được chọn
 *       value:
 *         subject: "Thông báo đặc biệt dành cho bạn"
 *         message: "Cảm ơn bạn đã đồng hành cùng Movie Streaming. Chúng tôi muốn gửi tặng bạn 1 tháng dùng thử gói Premium."
 *         userIds: ["60d0fe4f5311236168a109ca", "60d0fe4f5311236168a109cb"]
 *         batchSize: 20
 *     
 *     SendToEmails:
 *       summary: Mẫu gửi email đến danh sách email
 *       value:
 *         subject: "Mời bạn tham gia Movie Streaming"
 *         message: "Bạn đã được mời tham gia nền tảng xem phim Movie Streaming. Đăng ký ngay hôm nay để nhận 1 tháng dùng thử miễn phí."
 *         emails: ["user1@example.com", "user2@example.com"]
 *         batchSize: 50
 */

/**
 * @swagger
 * /api/admin/notifications/send-maintenance:
 *   post:
 *     requestBody:
 *       content:
 *         application/json:
 *           examples:
 *             maintenanceSample:
 *               $ref: '#/components/examples/MaintenanceNotification'
 */

/**
 * @swagger
 * /api/admin/notifications/send-custom:
 *   post:
 *     requestBody:
 *       content:
 *         application/json:
 *           examples:
 *             customSample:
 *               $ref: '#/components/examples/CustomNotification'
 */

/**
 * @swagger
 * /api/admin/notifications/send-bulk:
 *   post:
 *     requestBody:
 *       content:
 *         application/json:
 *           examples:
 *             bulkSample:
 *               $ref: '#/components/examples/BulkEmail'
 */

/**
 * @swagger
 * /api/admin/notifications/send-to-users:
 *   post:
 *     requestBody:
 *       content:
 *         application/json:
 *           examples:
 *             usersSample:
 *               $ref: '#/components/examples/SendToUsers'
 */

/**
 * @swagger
 * /api/admin/notifications/send-to-emails:
 *   post:
 *     requestBody:
 *       content:
 *         application/json:
 *           examples:
 *             emailsSample:
 *               $ref: '#/components/examples/SendToEmails'
 */
