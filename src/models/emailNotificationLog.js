// src/models/emailNotificationLog.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Mô hình lưu trữ lịch sử gửi thông báo email
 */
const emailNotificationLogSchema = new Schema(
    {
        subject: { type: String, required: true },
        message: { type: String, required: true },
        type: { type: String, enum: ['maintenance', 'custom'], required: true },
        userGroup: { type: String, enum: ['all', 'premium', 'free'], default: 'all' },
        sentBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        recipientCount: { type: Number, required: true },
        status: { type: String, enum: ['success', 'failed'], required: true },
        errorMessage: { type: String },
        metadata: { type: Schema.Types.Mixed } // Lưu trữ dữ liệu bổ sung như maintenanceTime, expectedDuration, v.v.
    },
    { timestamps: true }
);

const EmailNotificationLog = mongoose.model("EmailNotificationLog", emailNotificationLogSchema);

module.exports = EmailNotificationLog;
