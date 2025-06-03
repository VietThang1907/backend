const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const AccountType = require("./accountType"); // Import mô hình AccountType

// Mô hình User
const userSchema = new Schema(
    {
        fullname: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: function() {
            // Password only required if not using social login
            return !this.googleId && !this.facebookId;
        } },
        address: { type: String, default: null },
        phone: { type: String, default: null },
        date_of_birth: { type: Date, default: null },
        avatar: { type: String, default: "/img/avatar.png" }, // Thêm trường avatar với giá trị mặc định
        cloudinaryPublicId: { type: String, default: null }, // Thêm trường lưu trữ public_id của Cloudinary
        bio: { type: String, default: "" }, // Thêm trường bio
        favoriteGenres: [{ type: String }], // Thêm mảng thể loại yêu thích
        role_id: { type: Schema.Types.ObjectId, ref: "Role", required: true }, // Liên kết tới Role
        accountTypeId: {
            type: Schema.Types.ObjectId,
            ref: "AccountType",
            required: true
        }, // Liên kết tới AccountType
        
        // Thêm các trường cho xác thực qua mạng xã hội
        googleId: { type: String, default: null },
        facebookId: { type: String, default: null },
        isVerified: { type: Boolean, default: false }, // Trạng thái xác thực email
        isActive: { type: Boolean, default: true }, // Trạng thái hoạt động của tài khoản (true: đang hoạt động, false: bị khóa)
        
        // Trường cho reset mật khẩu
        resetPasswordToken: { type: String, default: null },
        resetPasswordExpires: { type: Date, default: null }
    },
    { timestamps: true }
);

// Export mô hình User
const User = mongoose.model("User", userSchema);

module.exports = User;
