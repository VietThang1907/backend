const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require("mongoose-paginate-v2");

// Mô hình Subscription Package (Gói đăng ký)
const subscriptionPackageSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    durationDays: {
      type: Number,
      required: true,
    },
    features: [
      {
        type: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    discount: {
      type: Number,
      default: 0, // Phần trăm giảm giá, mặc định là 0%
    },
    accountTypeId: {
      type: Schema.Types.ObjectId,
      ref: "AccountType",
      required: true,
    },
  },
  { timestamps: true }
);

// Mô hình User Subscription (Đăng ký của người dùng)
const userSubscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    packageId: {
      type: Schema.Types.ObjectId,
      ref: "SubscriptionPackage",
      required: true,
    },
    startDate: {
      type: Date,
      // Not required for pending subscriptions
    },
    endDate: {
      type: Date,
      // Not required for pending subscriptions
    },
    isActive: {
      type: Boolean,
      default: false, // Mặc định là false cho đến khi được phê duyệt
    },
    status: {
      type: String,
      enum: ["pending", "active", "expired", "canceled", "cancelled", "rejected"],
      default: "pending",
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
    },
    renewalStatus: {
      type: String,
      enum: ["pending", "active", "canceled", "cancelled"],
      default: "pending",
    },
    autoRenewal: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejectedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    paymentConfirmed: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

// Tạo index để tìm kiếm hiệu quả
userSubscriptionSchema.index({ userId: 1 });
userSubscriptionSchema.index({ packageId: 1 });
userSubscriptionSchema.index({ endDate: 1 });
userSubscriptionSchema.index({ status: 1 });

// Add mongoose-paginate-v2 plugin to userSubscriptionSchema
userSubscriptionSchema.plugin(mongoosePaginate);

// Tạo các model
const SubscriptionPackage = mongoose.model(
  "SubscriptionPackage",
  subscriptionPackageSchema
);
const UserSubscription = mongoose.model(
  "UserSubscription",
  userSubscriptionSchema
);

module.exports = {
  SubscriptionPackage,
  UserSubscription,
};