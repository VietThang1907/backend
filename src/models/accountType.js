const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Mô hình AccountType
const accountTypeSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: true
        }, // Tên loại tài khoản (e.g., VIP, Normal)
        description: {
            type: String,
            default: null
        }, // Mô tả loại tài khoản
    },
    { timestamps: true } // Tự động thêm `createdAt` và `updatedAt`
);

// Export mô hình AccountType
const AccountType = mongoose.model("AccountType", accountTypeSchema);

module.exports = AccountType;
