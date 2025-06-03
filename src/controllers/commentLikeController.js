const CommentLike = require('../models/commentLike');
const Comment = require('../models/comment');
const mongoose = require('mongoose');

// Service để thực hiện các thao tác với like/dislike
const commentLikeService = {
    // Tạo hoặc cập nhật like/dislike
    async toggleLike(userId, commentId, type) {
        try {
            // Kiểm tra xem comment có tồn tại không
            const comment = await Comment.findById(commentId);
            if (!comment) {
                return { success: false, message: "Bình luận không tồn tại" };
            }

            // Kiểm tra xem user đã like/dislike comment này chưa
            const existingLike = await CommentLike.findOne({
                userId,
                commentId
            });

            let action = "added"; // Trạng thái mặc định: thêm mới

            if (existingLike) {
                if (existingLike.type === type) {
                    // Nếu user đã like và nhấn like lần nữa (hoặc đã dislike và nhấn dislike lần nữa) -> Xóa
                    await CommentLike.deleteOne({ _id: existingLike._id });
                    action = "removed";
                } else {
                    // Nếu user đã like và nhấn dislike (hoặc ngược lại) -> Cập nhật
                    existingLike.type = type;
                    await existingLike.save();
                    action = "changed";
                }
            } else {
                // Nếu chưa có -> Tạo mới
                await CommentLike.create({
                    userId,
                    commentId,
                    type
                });
            }

            // Đếm số lượng like/dislike của comment
            const likeCount = await CommentLike.countDocuments({
                commentId,
                type: "like"
            });

            const dislikeCount = await CommentLike.countDocuments({
                commentId,
                type: "dislike"
            });

            // Cập nhật số lượng like/dislike vào comment
            await Comment.findByIdAndUpdate(commentId, {
                likes: likeCount,
                dislikes: dislikeCount
            });

            return {
                success: true,
                action,
                likeCount,
                dislikeCount
            };
        } catch (error) {
            console.error("Lỗi khi toggle like/dislike:", error);
            return { success: false, message: error.message };
        }
    },

    // Lấy danh sách comment mà user đã like/dislike
    async getUserLikes(userId, type) {
        try {
            const userLikes = await CommentLike.find({
                userId,
                type
            }).populate("commentId");
            
            return {
                success: true,
                data: userLikes
            };
        } catch (error) {
            console.error("Lỗi khi lấy danh sách like/dislike của user:", error);
            return { success: false, message: error.message };
        }
    },

    // Kiểm tra user đã like/dislike comment chưa
    async checkUserLikeStatus(userId, commentId) {
        try {
            const like = await CommentLike.findOne({
                userId,
                commentId
            });
            
            return {
                success: true,
                liked: like ? like.type === "like" : false,
                disliked: like ? like.type === "dislike" : false
            };
        } catch (error) {
            console.error("Lỗi khi kiểm tra trạng thái like/dislike:", error);
            return { success: false, message: error.message };
        }
    }
};

// Controller để xử lý các request API
const commentLikeController = {
    // API để like/dislike comment
    async toggleLike(req, res) {
        try {
            const { commentId, type } = req.body;
            
            // Kiểm tra và lấy userId từ request theo nhiều cách có thể
            let userId;
            if (req.user && req.user._id) {
                // Cách thông thường khi sử dụng middleware auth
                userId = req.user._id;
            } else if (req.userId) {
                // Trường hợp middleware lưu trực tiếp vào req.userId
                userId = req.userId;
            } else if (req.headers.authorization) {
                // Debug: Nếu token tồn tại nhưng không giải mã thành công
                console.log("Token tồn tại nhưng không giải mã thành user");
                return res.status(401).json({
                    success: false,
                    message: "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại"
                });
            } else {
                // Không tìm thấy thông tin người dùng
                return res.status(401).json({
                    success: false,
                    message: "Bạn cần đăng nhập để thực hiện hành động này"
                });
            }

            // Validate input
            if (!commentId || !type) {
                return res.status(400).json({
                    success: false,
                    message: "Thiếu thông tin commentId hoặc type"
                });
            }

            if (!["like", "dislike"].includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: "Type phải là 'like' hoặc 'dislike'"
                });
            }

            // Log để debug
            console.log("Sending request to toggle like with userId:", userId);

            const result = await commentLikeService.toggleLike(userId, commentId, type);
            
            if (result.success) {
                return res.status(200).json({
                    success: true,
                    data: {
                        action: result.action,
                        likeCount: result.likeCount,
                        dislikeCount: result.dislikeCount
                    }
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: result.message
                });
            }
        } catch (error) {
            console.error("Lỗi khi xử lý like/dislike:", error);
            return res.status(500).json({
                success: false,
                message: "Lỗi hệ thống khi xử lý like/dislike"
            });
        }
    },

    // API để lấy trạng thái like/dislike của user đối với comment
    async getLikeStatus(req, res) {
        try {
            const { commentId } = req.params;
            // Kiểm tra và lấy userId từ request theo nhiều cách có thể
            let userId;
            if (req.user && req.user._id) {
                userId = req.user._id;
            } else if (req.userId) {
                userId = req.userId;
            } else {
                return res.status(401).json({
                    success: false,
                    message: "Bạn cần đăng nhập để thực hiện hành động này"
                });
            }

            const result = await commentLikeService.checkUserLikeStatus(userId, commentId);
            
            if (result.success) {
                return res.status(200).json({
                    success: true,
                    data: {
                        liked: result.liked,
                        disliked: result.disliked
                    }
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: result.message
                });
            }
        } catch (error) {
            console.error("Lỗi khi lấy trạng thái like/dislike:", error);
            return res.status(500).json({
                success: false,
                message: "Lỗi hệ thống khi lấy trạng thái like/dislike"
            });
        }
    },

    // API để lấy danh sách comment mà user đã like/dislike
    async getUserLikes(req, res) {
        try {
            const { type } = req.query;
            // Kiểm tra và lấy userId từ request theo nhiều cách có thể
            let userId;
            if (req.user && req.user._id) {
                userId = req.user._id;
            } else if (req.userId) {
                userId = req.userId;
            } else {
                return res.status(401).json({
                    success: false,
                    message: "Bạn cần đăng nhập để thực hiện hành động này"
                });
            }

            if (!type || !["like", "dislike"].includes(type)) {
                return res.status(400).json({
                    success: false,
                    message: "Type không hợp lệ, phải là 'like' hoặc 'dislike'"
                });
            }

            const result = await commentLikeService.getUserLikes(userId, type);
            
            if (result.success) {
                return res.status(200).json({
                    success: true,
                    data: result.data
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: result.message
                });
            }
        } catch (error) {
            console.error("Lỗi khi lấy danh sách like/dislike của user:", error);
            return res.status(500).json({
                success: false,
                message: "Lỗi hệ thống khi lấy danh sách like/dislike"
            });
        }
    }
};

module.exports = commentLikeController;