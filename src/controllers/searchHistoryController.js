const SearchHistory = require('../models/searchHistory');
const responseHelper = require('../utils/responseHelper');

/**
 * Lưu lịch sử tìm kiếm của người dùng
 */
const saveSearchHistory = async (req, res) => {
    try {
        const { query, filters } = req.body;
        const userId = req.user._id || req.user.id; // Lấy từ JWT token

        // Kiểm tra xem query có phải là object hay không
        let searchQuery = '';
        if (typeof query === 'string') {
            searchQuery = query.trim();
            if (!searchQuery) {
                return responseHelper.badRequestResponse(res, 'Từ khóa tìm kiếm không được để trống');
            }
        } else if (typeof query === 'object' && query.query) {
            // Nếu query là object và có thuộc tính query
            searchQuery = query.query.trim();
            if (!searchQuery) {
                return responseHelper.badRequestResponse(res, 'Từ khóa tìm kiếm không được để trống');
            }
        } else {
            return responseHelper.badRequestResponse(res, 'Định dạng từ khóa tìm kiếm không hợp lệ');
        }

        // Chuẩn bị đối tượng filters
        const searchFilters = filters || {};

        // Sử dụng phương thức upsert để thêm hoặc cập nhật lịch sử tìm kiếm
        const savedItem = await SearchHistory.upsertSearchHistory(userId, searchQuery, searchFilters);

        return res.status(200).json({
            success: true,
            message: 'Đã lưu lịch sử tìm kiếm',
            savedItem // Trả về mục đã lưu để cập nhật UI ngay lập tức
        });
    } catch (error) {
        console.error('Error saving search history:', error);
        return responseHelper.serverErrorResponse(res, 'Lỗi khi lưu lịch sử tìm kiếm');
    }
};

/**
 * Lấy lịch sử tìm kiếm của người dùng
 */
const getUserSearchHistory = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id; // Lấy từ JWT token
        const limit = parseInt(req.query.limit) || 8; // Mặc định lấy 8 mục
        
        // Lấy lịch sử tìm kiếm mới nhất của người dùng
        const searchHistory = await SearchHistory
            .find({ user: userId })
            .sort({ timestamp: -1 })
            .limit(limit);
            
        // Đảm bảo trả về đúng định dạng mà frontend mong đợi
        return res.status(200).json({
            success: true,
            message: 'Lấy lịch sử tìm kiếm thành công',
            data: { searchHistory }
        });
    } catch (error) {
        console.error('Error fetching search history:', error);
        return responseHelper.serverErrorResponse(res, 'Lỗi khi lấy lịch sử tìm kiếm');
    }
};

/**
 * Xóa một mục trong lịch sử tìm kiếm
 */
const deleteSearchHistoryItem = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        const { id } = req.params; // ID của mục lịch sử cần xóa
        
        // Kiểm tra và xóa mục từ lịch sử
        const result = await SearchHistory.findOneAndDelete({
            _id: id,
            user: userId
        });
        
        if (!result) {
            return responseHelper.notFoundResponse(res, 'Không tìm thấy mục lịch sử hoặc không có quyền xóa');
        }
        
        return responseHelper.successResponse(res, 'Đã xóa mục lịch sử tìm kiếm');
    } catch (error) {
        console.error('Error deleting search history item:', error);
        return responseHelper.serverErrorResponse(res, 'Lỗi khi xóa lịch sử tìm kiếm');
    }
};

/**
 * Xóa toàn bộ lịch sử tìm kiếm của người dùng
 */
const clearSearchHistory = async (req, res) => {
    try {
        const userId = req.user._id || req.user.id;
        
        // Xóa tất cả lịch sử tìm kiếm của người dùng
        await SearchHistory.deleteMany({ user: userId });
        
        return responseHelper.successResponse(res, 'Đã xóa toàn bộ lịch sử tìm kiếm');
    } catch (error) {
        console.error('Error clearing search history:', error);
        return responseHelper.serverErrorResponse(res, 'Lỗi khi xóa lịch sử tìm kiếm');
    }
};

module.exports = {
    saveSearchHistory,
    getUserSearchHistory,
    deleteSearchHistoryItem,
    clearSearchHistory
};