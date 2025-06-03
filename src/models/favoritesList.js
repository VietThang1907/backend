const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const favoritesListSchema = new Schema(
    {
        userId: { 
            type: Schema.Types.ObjectId, 
            ref: "User", 
            required: true,
            index: true // Thêm index để cải thiện hiệu suất truy vấn
        },
        movieIds: [{ 
            type: Schema.Types.ObjectId, 
            ref: "Movie" 
        }] // Mảng các bộ phim yêu thích
    },
    { timestamps: true }
);

// Thêm index duy nhất để đảm bảo không có trùng lặp movieId cho cùng một người dùng
favoritesListSchema.index({ userId: 1, "movieIds": 1 }, { unique: true });

// Phương thức kiểm tra phim đã có trong danh sách yêu thích chưa
favoritesListSchema.methods.hasMovie = function(movieId) {
    return this.movieIds.includes(movieId);
};

// Phương thức thêm phim vào danh sách yêu thích
favoritesListSchema.methods.addMovie = function(movieId) {
    if (!this.hasMovie(movieId)) {
        this.movieIds.push(movieId);
    }
    return this;
};

// Phương thức xóa phim khỏi danh sách yêu thích
favoritesListSchema.methods.removeMovie = function(movieId) {
    this.movieIds = this.movieIds.filter(id => id.toString() !== movieId.toString());
    return this;
};

const FavoritesList = mongoose.model("FavoritesList", favoritesListSchema);

module.exports = FavoritesList;
