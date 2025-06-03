const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const paymentSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      index: true,
    },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: "SubscriptionPackage",
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    method: {
      type: String,
      enum: ["credit_card", "bank_transfer", "e_wallet", "momo", "zalopay"],
      required: true,
    },
    transactionId: {
      type: String,
      sparse: true, // Cho phép null nhưng nếu có giá trị thì phải là unique
    },
    description: {
      type: String,
    },
    paymentDetails: {
      // Lưu thông tin chi tiết về thanh toán, tùy theo phương thức
      type: Schema.Types.Mixed,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejectionReason: {
      type: String,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Tạo index
paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ method: 1 });
paymentSchema.index({ approvalStatus: 1 });

const Payment = mongoose.model("Payment", paymentSchema);

module.exports = Payment;
