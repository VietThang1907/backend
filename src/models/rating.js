const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ratingSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        movieId: { type: Schema.Types.ObjectId, ref: "Movie", required: true },
        movieSlug: { type: String, required: true }, // Thêm movieSlug là bắt buộc
        rating: { type: Number, min: 0, max: 10, required: true },
    },
    { timestamps: true }
);

// Tạo unique index cho cặp userId và movieSlug
ratingSchema.index({ userId: 1, movieSlug: 1 }, { unique: true });

const Rating = mongoose.model("Rating", ratingSchema);

module.exports = Rating;
