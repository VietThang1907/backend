const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Schema cho lịch sử tìm kiếm
const searchHistorySchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    query: {
        type: String,
        required: true,
        trim: true
    },
    filters: {
        type: mongoose.Schema.Types.Mixed, // Thay đổi kiểu dữ liệu thành Mixed để có thể lưu bất kỳ kiểu dữ liệu nào
        default: {}
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true
});

// Đảm bảo mỗi người dùng chỉ có một bản ghi cho mỗi truy vấn tìm kiếm
// Điều này giúp tránh trùng lặp lịch sử tìm kiếm
searchHistorySchema.index({ user: 1, query: 1 }, { unique: true });

// Phương thức để cập nhật hoặc tạo mới lịch sử tìm kiếm
searchHistorySchema.statics.upsertSearchHistory = async function(userId, query, filters = {}) {
    if (!userId || !query) return null;
    
    const MAX_HISTORY_ITEMS = 8; // Giới hạn tối đa 8 mục lịch sử tìm kiếm

    try {
        // Sử dụng findOneAndUpdate với upsert: true để cập nhật nếu tồn tại, hoặc tạo mới nếu không tồn tại
        const updateDoc = {
            user: userId,
            query: query.trim(),
            filters,
            timestamp: new Date()
        };

        // Thực hiện upsert (cập nhật hoặc thêm mới)
        const updatedHistory = await this.findOneAndUpdate(
            { user: userId, query: query.trim() }, // điều kiện tìm kiếm
            updateDoc, 
            { upsert: true, new: true } // tùy chọn upsert và trả về document sau khi cập nhật
        );
        
        // Đếm số lượng mục lịch sử của người dùng
        const count = await this.countDocuments({ user: userId });
        
        // Nếu số lượng vượt quá giới hạn, xóa mục cũ nhất
        if (count > MAX_HISTORY_ITEMS) {
            // Tìm và xóa mục cũ nhất (sắp xếp theo thời gian tăng dần)
            const oldestItem = await this.findOne({ user: userId })
                .sort({ timestamp: 1 })
                .limit(1);
            
            if (oldestItem) {
                await this.findByIdAndDelete(oldestItem._id);
            }
        }
        
        return updatedHistory;
    } catch (error) {
        console.error('Error upserting search history:', error);
        return null;
    }
};

const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);
module.exports = SearchHistory;