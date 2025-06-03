const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const likesSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // Người dùng thích bộ phim
        movieId: { type: Schema.Types.ObjectId, ref: "Movie", required: true }, // Bộ phim được thích
    },
    { timestamps: true }
);

const Likes = mongoose.model("Likes", likesSchema);

module.exports = Likes;
