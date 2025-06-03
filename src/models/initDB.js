const mongoose = require("mongoose");
const Role = require("./role");
const User = require("./user");
const Movie = require("./movie");
const Category = require("./category");
const Comment = require("./comment");
const History = require("./history");
const Payment = require("./payment");
const Rating = require("./rating");
const Watchlist = require("./watchlist");
const Likes = require("./likes");
const FavoritesList = require("./favoritesList");
const AccountType = require("./accountType");

const createSlug = (title) => {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-') // Thay thế ký tự không phải chữ cái hoặc số bằng dấu gạch nối
        .replace(/-+/g, '-') // Loại bỏ dấu gạch nối dư thừa
        .replace(/^-+/, '') // Loại bỏ dấu gạch nối ở đầu
        .replace(/-+$/, ''); // Loại bỏ dấu gạch nối ở cuối
};

const initDatabase = async () => {
    try {
        // 🟢 Kết nối MongoDB (nếu chưa kết nối)
        await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/netflix-clone", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log("✅ Kết nối MongoDB thành công!");

        // 🟢 Kiểm tra nếu bảng roles chưa có dữ liệu thì thêm mới
        const roles = ["Admin", "User", "Moderator"];
        for (let i = 0; i < roles.length; i++) {
            const existingRole = await Role.findOne({ name: roles[i] });
            if (!existingRole) {
                const role = new Role({ name: roles[i] });
                await role.save();
                console.log(`✅ Vai trò '${roles[i]}' đã được thêm!`);
            }
        }

        // 🟢 Kiểm tra và thêm dữ liệu vào bảng AccountType (Optional)
        const accountTypes = ["Normal", "VIP"];
        for (let i = 0; i < accountTypes.length; i++) {
            const existingAccountType = await AccountType.findOne({ name: accountTypes[i] });
            if (!existingAccountType) {
                const accountType = new AccountType({ name: accountTypes[i] });
                await accountType.save();
                console.log(`✅ Loại tài khoản '${accountTypes[i]}' đã được thêm!`);
            }
        }

        // 🟢 Tạo người dùng mặc định (nếu chưa có)
        const adminRole = await Role.findOne({ name: "Admin" });
        const userRole = await Role.findOne({ name: "User" });
        const normalAccountType = await AccountType.findOne({ name: "Normal" });
        const vipAccountType = await AccountType.findOne({ name: "VIP" });

        const existingAdmin = await User.findOne({ email: "admin@netflixclone.com" });
        let adminUser;
        if (!existingAdmin) {
            adminUser = new User({
                fullname: "Admin User",
                email: "admin@netflixclone.com",
                password: "adminpassword",  // Mật khẩu đã mã hóa trong ứng dụng thực tế
                role_id: adminRole._id,
                accountTypeId: vipAccountType._id, // Tạo Admin với loại tài khoản VIP
            });
            await adminUser.save();
            console.log("✅ Người dùng Admin đã được tạo!");
        } else {
            adminUser = existingAdmin;
        }

        const existingUser = await User.findOne({ email: "user@netflixclone.com" });
        let normalUser;
        if (!existingUser) {
            normalUser = new User({
                fullname: "Normal User",
                email: "user@netflixclone.com",
                password: "userpassword",  // Mật khẩu đã mã hóa trong ứng dụng thực tế
                role_id: userRole._id,
                accountTypeId: normalAccountType._id, // Tạo User với loại tài khoản Normal
            });
            await normalUser.save();
            console.log("✅ Người dùng User đã được tạo!");
        } else {
            normalUser = existingUser;
        }

        // 🟢 Kiểm tra và thêm dữ liệu vào bảng Category
        const categories = ["Action", "Comedy", "Drama", "Horror", "Romance"];
        for (let i = 0; i < categories.length; i++) {
            const existingCategory = await Category.findOne({ name: categories[i] });
            if (!existingCategory) {
                const category = new Category({ name: categories[i] });
                await category.save();
                console.log(`✅ Thể loại '${categories[i]}' đã được thêm!`);
            }
        }

        // 🟢 Kiểm tra và thêm dữ liệu vào bảng Movie (tạo một bộ phim mẫu)
        const existingMovie = await Movie.findOne({ title: "Sample Movie" });
        let movie;
        if (!existingMovie) {
            movie = new Movie({
                title: "Sample Movie",
                description: "This is a sample movie.",
                releaseDate: new Date(),
                genre: "Action",
                language: "English",
                duration: 120,
                rating: 8.5,
                imageUrl: "https://via.placeholder.com/150",
                videoUrl: "https://via.placeholder.com/150",
                category_id: (await Category.findOne({ name: "Action" }))._id, // Liên kết với thể loại Action
                slug: createSlug("Sample Movie"),  // Tạo slug từ title
            });
            await movie.save();
            console.log("✅ Bộ phim mẫu đã được tạo!");
        } else {
            movie = existingMovie;
        }

        // 🟢 Kiểm tra và thêm dữ liệu vào bảng Comment (sử dụng ObjectId của bộ phim)
        const existingComment = await Comment.findOne({ content: "Great movie!" });
        if (!existingComment) {
            const comment = new Comment({
                userId: adminUser._id,
                movieId: movie._id, // Sử dụng ObjectId của bộ phim
                content: "Great movie!",
                rating: 9,
            });
            await comment.save();
            console.log("✅ Bình luận đã được thêm!");
        }

        // 🟢 Kiểm tra và thêm dữ liệu vào bảng History
        const existingHistory = await History.findOne({ userId: adminUser._id, movieId: movie._id });
        if (!existingHistory) {
            const history = new History({
                userId: adminUser._id,
                movieId: movie._id,  // Thêm ObjectId của bộ phim vào lịch sử
            });
            await history.save();
            console.log("✅ Lịch sử xem đã được thêm!");
        }

        // 🟢 Kiểm tra và thêm dữ liệu vào bảng Rating
        const existingRating = await Rating.findOne({ userId: adminUser._id, movieId: movie._id });
        if (!existingRating) {
            const rating = new Rating({
                userId: adminUser._id,
                movieId: movie._id,
                rating: 8,
            });
            await rating.save();
            console.log("✅ Đánh giá đã được thêm!");
        }

        // 🟢 Kiểm tra và thêm dữ liệu vào bảng Watchlist
        const existingWatchlist = await Watchlist.findOne({ userId: adminUser._id });
        if (!existingWatchlist) {
            const watchlist = new Watchlist({
                userId: adminUser._id,
                movieIds: [movie._id], // Thêm ObjectId của bộ phim vào danh sách xem
            });
            await watchlist.save();
            console.log("✅ Danh sách xem đã được thêm!");
        }

        // 🟢 Kiểm tra và thêm dữ liệu vào bảng Likes (Lượt thích)
        const existingLike = await Likes.findOne({ userId: adminUser._id, movieId: movie._id });
        if (!existingLike) {
            const like = new Likes({
                userId: adminUser._id,
                movieId: movie._id,
            });
            await like.save();
            console.log("✅ Lượt thích đã được thêm!");
        }

        // 🟢 Kiểm tra và thêm dữ liệu vào bảng FavoritesList (Danh sách yêu thích)
        const existingFavoritesList = await FavoritesList.findOne({ userId: adminUser._id });
        if (!existingFavoritesList) {
            const favoritesList = new FavoritesList({
                userId: adminUser._id,
                movieIds: [movie._id], // Thêm ObjectId của bộ phim vào danh sách yêu thích
            });
            await favoritesList.save();
            console.log("✅ Danh sách yêu thích đã được thêm!");
        }

        // 🎉 Database sẵn sàng
        console.log("🎉 MongoDB database đã sẵn sàng!");
    } catch (error) {
        console.error("❌ Lỗi khi khởi tạo database:", error);
    }
};

// Chạy khởi tạo database
initDatabase();
