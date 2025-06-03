const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const commentSchema = new Schema(
    {
        movieId: { 
            type: Schema.Types.ObjectId, 
            ref: "Movie"
        },
        movieSlug: {
            type: String,
            required: true
        },
        userId: { 
            type: Schema.Types.ObjectId, 
            ref: "User"
        },
        username: {
            type: String,
            required: true
        },
        content: {
            type: String,
            required: true
        },
        rating: {
            type: Number,
            min: 0,
            max: 10,
            default: 0
        },
        likes: {
            type: Number,
            default: 0
        },
        dislikes: {
            type: Number,
            default: 0
        },
        avatar: {
            type: String,
            default: ""
        },
        isAnonymous: {
            type: Boolean,
            default: false
        },
        anonymousId: {
            type: String,
            default: null
        },
        isDeleted: {
            type: Boolean,
            default: false
        },
        parentCommentId: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
            default: null
        }
    },
    { 
        timestamps: true,
        toJSON: { 
            virtuals: true,
            transform: function(doc, ret) {
                ret.id = ret._id;
                ret.date = new Date(ret.createdAt).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                delete ret._id;
                delete ret.__v;
                return ret;
            }
        }
    }
);

// Thêm index để tối ưu truy vấn
commentSchema.index({ movieSlug: 1 });
commentSchema.index({ userId: 1 });
commentSchema.index({ parentCommentId: 1 });

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;
