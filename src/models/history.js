const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const historySchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        movieId: { type: Schema.Types.ObjectId, ref: "Movie" },
        movieSlug: { type: String, required: true },
        movieData: {
            name: String,
            origin_name: String,
            thumb_url: String,
            year: String,
            category: [String],
            episode: Number,
            duration: String,
            quality: String,
            type: { type: String, enum: ['movie', 'series', 'tv', 'hoathinh', 'tvshow'] }
        },
        watchedAt: { type: Date, default: Date.now },
        // Thêm các trường để theo dõi thời gian xem
        watchDuration: { type: Number, default: 0 }, // Thời gian xem tính bằng giây
        watchSessions: [{ 
            startTime: { type: Date },
            endTime: { type: Date },
            duration: { type: Number, default: 0 } // Thời gian xem từng phiên tính bằng giây
        }],
        lastPosition: { type: Number, default: 0 }, // Vị trí cuối cùng xem đến (giây)
        completed: { type: Boolean, default: false }, // Đánh dấu đã xem hết phim
        episode: { type: Number, default: 1 } // Tập phim đang xem (cho phim bộ)
    },
    { timestamps: true }
);

const History = mongoose.model("History", historySchema);

module.exports = History;
