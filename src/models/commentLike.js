const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const commentLikeSchema = new Schema(
    {
        userId: { 
            type: Schema.Types.ObjectId, 
            ref: "User", 
            required: true 
        },
        commentId: { 
            type: Schema.Types.ObjectId, 
            ref: "Comment", 
            required: true 
        },
        type: { 
            type: String, 
            enum: ["like", "dislike"], 
            required: true 
        }
    },
    { timestamps: true }
);

// Đảm bảo một user chỉ có thể like hoặc dislike một comment một lần
commentLikeSchema.index({ userId: 1, commentId: 1 }, { unique: true });

const CommentLike = mongoose.model("CommentLike", commentLikeSchema);

module.exports = CommentLike;