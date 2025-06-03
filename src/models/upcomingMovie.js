// models/upcomingMovie.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Import các hàm từ elasticsearchService
const { indexDocument, deleteDocument } = require('../services/elasticsearchService');

const upcomingMovieSchema = new Schema({
    tmdb: {
        type: {
            type: String,  // Loại phim (ví dụ: tv, movie)
            default: null
        },
        id: { type: String, default: '' },
        season: { type: Number, default: null },
        vote_average: { type: Number, default: 0 },
        vote_count: { type: Number, default: 0 }
    },
    imdb: {
        id: { type: String, default: '' }
    },
    created: {
        time: { type: Date, default: Date.now }
    },
    modified: {
        time: { type: Date, default: Date.now }
    },
    name: { type: String, required: true },
    origin_name: { type: String, required: true },
    content: { type: String, required: true },
    type: { type: String, default: 'series' },
    status: { type: String, default: 'upcoming' },
    thumb_url: { type: String, default: '' },
    trailer_url: { type: String, default: '' },
    time: { type: String, default: '' },
    quality: { type: String, default: '' },
    lang: { type: String, default: '' },
    notify: { type: String, default: '' },
    showtimes: { type: String, default: '' },
    slug: { type: String, required: true, unique: true },
    year: { type: Number, required: true },
    actor: [{ type: String }],
    director: [{ type: String }],
    category: [
        {
            id: { type: String },
            name: { type: String },
            slug: { type: String }
        }
    ],
    country: [
        {
            id: { type: String },
            name: { type: String },
            slug: { type: String }
        }
    ],
    is_copyright: { type: Boolean, default: false },
    chieurap: { type: Boolean, default: true },
    poster_url: { type: String, default: '' },
    sub_docquyen: { type: Boolean, default: false },
    isHidden: { type: Boolean, default: false },
    release_date: { type: Date, required: true }, // Ngày dự kiến phát hành
    is_released: { type: Boolean, default: false } // Đánh dấu đã phát hành chưa
}, {timestamps: true});

// Middleware Hooks cho Elasticsearch Sync
// =========================================================

// Hook được gọi SAU KHI một document được lưu thành công (create hoặc update bằng .save())
upcomingMovieSchema.post('save', async function(doc, next) {
    // Kiểm tra xem document đã có _isNew được đặt trong quá trình xử lý trước đó
    const isNewDoc = doc._isNew !== false; // Nếu không có _isNew hoặc _isNew === true thì coi như là mới
    
    if (isNewDoc) {
        console.log(`[ES Sync] UpcomingMovie saved (${doc._id}), indexing...`);
        try {
            // Gọi hàm indexDocument từ service, truyền vào plain object
            await indexDocument(doc.toObject(), 'upcoming_movies');
        } catch (error) {
            console.error(`[ES Sync] Error indexing upcoming movie ${doc._id} after save:`, error);
            // Không nên ném lỗi ở đây để tránh làm hỏng luồng chính
        }
    } else {
        console.log(`[ES Sync] UpcomingMovie already exists (${doc._id}), skipping indexing...`);
    }
    next(); // Tiếp tục middleware chain (nếu có)
});

// Hook được gọi SAU KHI một document được cập nhật thành công bằng findOneAndUpdate
upcomingMovieSchema.post('findOneAndUpdate', async function(result) {
    if (result) {
        console.log(`[ES Sync] UpcomingMovie updated via findOneAndUpdate (${result._id}), re-indexing...`);
        try {
            const updatedDoc = await this.model.findById(result._id);
            if (updatedDoc) {
                await indexDocument(updatedDoc.toObject(), 'upcoming_movies');
            } else {
                 console.warn(`[ES Sync] Could not find document ${result._id} after findOneAndUpdate to re-index.`);
            }
        } catch (error) {
            console.error(`[ES Sync] Error re-indexing upcoming movie ${result._id} after findOneAndUpdate:`, error);
        }
    }
});

// Hook được gọi SAU KHI một document bị xóa thành công bằng findOneAndDelete
upcomingMovieSchema.post('findOneAndDelete', async function(doc, next) {
    if (doc) {
        console.log(`[ES Sync] UpcomingMovie deleted via findOneAndDelete (${doc._id}), deleting from index...`);
        try {
            await deleteDocument(doc._id, 'upcoming_movies');
        } catch (error) {
            console.error(`[ES Sync] Error deleting upcoming movie ${doc._id} from index after findOneAndDelete:`, error);
        }
    }
    next();
});

// Hook cho deleteOne (Query Middleware)
upcomingMovieSchema.post('deleteOne', { document: false, query: true }, async function(res) {
    const filter = this.getFilter();
    if (filter && filter._id) {
         console.log(`[ES Sync] deleteOne hook triggered for ID (${filter._id}), attempting delete from index...`);
         try {
             await deleteDocument(filter._id, 'upcoming_movies');
         } catch (error) {
             console.error(`[ES Sync] Error deleting upcoming movie ${filter._id} from index after deleteOne:`, error);
         }
    } else {
         console.warn('[ES Sync] deleteOne hook triggered with complex filter. Manual ES deletion might be needed:', filter);
    }
});

// Hook cho deleteMany (Query Middleware)
upcomingMovieSchema.post('deleteMany', { document: false, query: true }, async function(res) {
    console.warn('[ES Sync] deleteMany hook triggered. Manual ES deletion is highly recommended for bulk deletes:', this.getFilter());
});
// =========================================================

const UpcomingMovie = mongoose.model('UpcomingMovie', upcomingMovieSchema);
module.exports = UpcomingMovie;