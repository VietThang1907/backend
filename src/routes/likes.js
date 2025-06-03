const express = require('express');
const router = express.Router();
const commentLikeController = require('../controllers/commentLikeController');
const authMiddleware = require('../middlewares/authMiddleware');

// Tất cả các routes yêu cầu xác thực - sử dụng isAuthenticated thay vì verifyToken
// để đảm bảo req.user._id được thiết lập đúng
router.use(authMiddleware.isAuthenticated);

/**
 * @swagger
 * tags:
 *   name: Likes
 *   description: Quản lý like/dislike cho bình luận
 */

/**
 * @swagger
 * /api/likes:
 *   post:
 *     summary: Thêm hoặc xóa like/dislike cho bình luận
 *     tags: [Likes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - commentId
 *               - type
 *             properties:
 *               commentId:
 *                 type: string
 *                 description: ID của bình luận
 *               type:
 *                 type: string
 *                 enum: [like, dislike]
 *                 description: Loại tương tác (like hoặc dislike)
 *     responses:
 *       200:
 *         description: Thành công
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
 *                     action:
 *                       type: string
 *                       enum: [added, removed, changed]
 *                       description: Hành động đã thực hiện
 *                     likeCount:
 *                       type: number
 *                       description: Số lượng like mới
 *                     dislikeCount:
 *                       type: number
 *                       description: Số lượng dislike mới
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.post('/', commentLikeController.toggleLike);

/**
 * @swagger
 * /api/likes/status/{commentId}:
 *   get:
 *     summary: Kiểm tra trạng thái like/dislike của user đối với một bình luận
 *     tags: [Likes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của bình luận
 *     responses:
 *       200:
 *         description: Thành công
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
 *                     liked:
 *                       type: boolean
 *                       description: User đã like bình luận này chưa
 *                     disliked:
 *                       type: boolean
 *                       description: User đã dislike bình luận này chưa
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.get('/status/:commentId', commentLikeController.getLikeStatus);

/**
 * @swagger
 * /api/likes/user:
 *   get:
 *     summary: Lấy danh sách bình luận mà user đã like/dislike
 *     tags: [Likes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [like, dislike]
 *         description: Loại tương tác (like hoặc dislike)
 *     responses:
 *       200:
 *         description: Thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: ID của bản ghi like/dislike
 *                       userId:
 *                         type: string
 *                         description: ID của người dùng
 *                       commentId:
 *                         type: object
 *                         description: Dữ liệu bình luận
 *                       type:
 *                         type: string
 *                         enum: [like, dislike]
 *                         description: Loại tương tác
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 *       500:
 *         description: Lỗi server
 */
router.get('/user', commentLikeController.getUserLikes);

module.exports = router;