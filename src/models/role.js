const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Mô hình Role
const roleSchema = new Schema({
    name: { type: String, required: true },
}, { timestamps: true }); // Tự động thêm `createdAt` và `updatedAt`

// Export mô hình Role
const Role = mongoose.model("Role", roleSchema);

module.exports = Role;
