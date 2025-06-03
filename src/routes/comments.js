const express = require('express');
const Comment = require('../models/comment');
const Movie = require('../models/movie');
const { isAuthenticated } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * /api/comments:
 *   get:
 *     summary: Get comments for a movie
 *     tags: [Comments]
 *     parameters:
 *       - in: query
 *         name: movieSlug
 *         schema:
 *           type: string
 *         required: true
 *         description: The movie slug
 *     responses:
 *       200:
 *         description: List of comments
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
    try {
        const { movieSlug } = req.query;

        if (!movieSlug) {
            return res.status(400).json({ error: 'Movie slug is required' });
        }

        // Find movie by slug
        const movie = await Movie.findOne({ slug: movieSlug });
        
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        // Find comments for the movie
        const comments = await Comment.find({ movieId: movie._id })
            .populate('userId', 'fullname avatar')
            .sort({ createdAt: -1 });

        // Transform comments for frontend
        const formattedComments = comments.map(comment => ({
            id: comment._id,
            username: comment.isAnonymous ? 'Người ẩn danh' : (comment.userId ? comment.userId.fullname : 'Người dùng'),
            // Luôn sử dụng avatar mặc định cho bình luận ẩn danh, bất kể có userId hay không
            avatar: comment.isAnonymous ? '/img/user-avatar.png' : (comment.userId ? comment.userId.avatar : '/img/user-avatar.png'),
            content: comment.content,
            date: comment.createdAt.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            rating: comment.rating,
            likes: comment.likes || 0,
            dislikes: comment.dislikes || 0,
            isAnonymous: comment.isAnonymous || false
        }));

        res.status(200).json({ comments: formattedComments });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @swagger
 * /api/comments:
 *   post:
 *     summary: Add a comment to a movie
 *     tags: [Comments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               movieSlug:
 *                 type: string
 *               comment:
 *                 type: object
 *                 properties:
 *                   content:
 *                     type: string
 *                   rating:
 *                     type: number
 *     responses:
 *       200:
 *         description: Comment added successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', isAuthenticated, async (req, res) => {
    try {
        const { movieSlug, comment } = req.body;
        
        if (!movieSlug || !comment || !comment.content) {
            return res.status(400).json({ error: 'Movie slug and comment content are required' });
        }

        // Find movie by slug
        const movie = await Movie.findOne({ slug: movieSlug });
        
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        // Create the comment
        const newComment = new Comment({
            userId: req.user._id,
            movieId: movie._id,
            movieSlug: movieSlug, // Thêm trường movieSlug
            username: req.user.fullname || 'Anonymous', // Thêm trường username
            content: comment.content,
            rating: comment.rating || 5, // Default rating if not provided
            avatar: req.user.avatar || '/img/user-avatar.png', // Thêm trường avatar
            isAnonymous: false
        });

        await newComment.save();

        // Return formatted comment
        const formattedComment = {
            id: newComment._id,
            username: req.user.fullname || 'Anonymous',
            avatar: req.user.avatar || '/img/user-avatar.png',
            content: newComment.content,
            date: newComment.createdAt.toLocaleDateString('vi-VN'),
            rating: newComment.rating,
            likes: 0,
            dislikes: 0
        };

        res.status(200).json({ comment: formattedComment, message: 'Comment added successfully' });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @swagger
 * /api/comments/anonymous:
 *   post:
 *     summary: Add an anonymous comment to a movie
 *     tags: [Comments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               movieSlug:
 *                 type: string
 *               comment:
 *                 type: object
 *                 properties:
 *                   content:
 *                     type: string
 *                   rating:
 *                     type: number
 *     responses:
 *       200:
 *         description: Anonymous comment added successfully
 *       500:
 *         description: Server error
 */
router.post('/anonymous', async (req, res) => {
    try {
        const { movieSlug, comment, userId } = req.body;
        
        if (!movieSlug || !comment || !comment.content) {
            return res.status(400).json({ error: 'Movie slug and comment content are required' });
        }

        // Find movie by slug
        const movie = await Movie.findOne({ slug: movieSlug });
        
        if (!movie) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        // Create the anonymous comment - lưu userId nếu có
        const newComment = new Comment({
            movieId: movie._id,
            movieSlug: movieSlug,
            userId: userId || null, // Lưu userId nếu có
            username: 'Người ẩn danh',
            content: comment.content,
            rating: comment.rating || 5,
            avatar: '/img/user-avatar.png',
            isAnonymous: true // Giữ isAnonymous là true
        });

        await newComment.save();

        // Return formatted comment
        const formattedComment = {
            id: newComment._id,
            username: 'Người ẩn danh',
            avatar: '/img/user-avatar.png',
            content: newComment.content,
            date: newComment.createdAt.toLocaleDateString('vi-VN'),
            rating: newComment.rating,
            likes: 0,
            dislikes: 0,
            isAnonymous: true,
            userId: userId || null // Trả về userId nếu có
        };

        res.status(200).json({ comment: formattedComment, message: 'Comment added successfully' });
    } catch (error) {
        console.error('Error adding anonymous comment:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not the comment owner
 *       500:
 *         description: Server error
 */
router.delete('/:id', isAuthenticated, async (req, res) => {
    try {
        const commentId = req.params.id;
        
        // Find the comment
        const comment = await Comment.findById(commentId);
        
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        
        // Check if user is the comment owner
        if (comment.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Not authorized to delete this comment' });
        }
        
        // Check if 1 minute has passed since comment creation
        const commentCreatedAt = new Date(comment.createdAt);
        const currentTime = new Date();
        const timeDifferenceInMinutes = (currentTime - commentCreatedAt) / (1000 * 60);
        
        if (timeDifferenceInMinutes < 1) {
            return res.status(403).json({ 
                error: 'Bạn cần đợi ít nhất 1 phút sau khi đăng bình luận mới có thể xóa'
            });
        }
        
        // Delete the comment
        await Comment.findByIdAndDelete(commentId);
        
        res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * @swagger
 * /api/comments/anonymous/{id}:
 *   delete:
 *     summary: Delete an anonymous comment by ID
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Comment ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID that identifies the user who created the comment
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       403:
 *         description: Forbidden - invalid userId
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Server error
 */
router.delete('/anonymous/:id', async (req, res) => {
    try {
        const commentId = req.params.id;
        const providedUserId = req.query.userId;
        
        // Find the comment
        const comment = await Comment.findById(commentId);
        
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        
        // Verify the comment is anonymous
        if (!comment.isAnonymous) {
            return res.status(403).json({ error: 'This is not an anonymous comment' });
        }
        
        // Kiểm tra xem người dùng có quyền xóa bình luận không
        let isAuthorized = false;
        
        // Nếu bình luận có userId và trùng với providedUserId
        if (providedUserId && comment.userId && comment.userId.toString() === providedUserId) {
            isAuthorized = true;
        }
        
        // Hỗ trợ các phương thức cũ để tương thích ngược
        if (!isAuthorized && commentId === req.query.anonymousId) {
            isAuthorized = true;
        }
        
        // Nếu không có quyền xóa
        if (!isAuthorized) {
            return res.status(403).json({ 
                error: 'Bạn không có quyền xóa bình luận này.' 
            });
        }
        
        // Check if 1 minute has passed since comment creation
        const commentCreatedAt = new Date(comment.createdAt);
        const currentTime = new Date();
        const timeDifferenceInMinutes = (currentTime - commentCreatedAt) / (1000 * 60);
        
        if (timeDifferenceInMinutes < 1) {
            return res.status(403).json({ 
                error: 'Bạn cần đợi ít nhất 1 phút sau khi đăng bình luận mới có thể xóa'
            });
        }
        
        // Delete the comment
        await Comment.findByIdAndDelete(commentId);
        
        res.status(200).json({ message: 'Bình luận đã được xóa thành công' });
    } catch (error) {
        console.error('Error deleting anonymous comment:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;