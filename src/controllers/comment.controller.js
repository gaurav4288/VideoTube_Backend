import { set, Types } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { Like } from "../models/like.model.js";


const addComment = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const { videoId } = req.params;
    if (!content || !videoId) {
        throw new ApiError(400, "Content and video ID are required")
    }

    const newComment = await Comment.create({
        content,
        video: videoId,
        owner:
            req.user?._id
    });

    res.status(201).json(new ApiResponse(200, newComment, "Comment added Successfully"));
});

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const result = await Comment.aggregate([
        {
            $match: {
                video: new Types.ObjectId(videoId)
            }
        },
        {
            $facet: {
                data: [
                    { $sort: { createdAt: -1 } },
                    { $skip: skip },
                    { $limit: parseInt(limit) },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: 'owner'
                        }
                    },
                    {
                        $lookup: {
                            from: "likes",
                            localField: "_id",
                            foreignField: "comment",
                            as: "like",
                        }
                    },
                    {
                        $addFields: {
                            likescount: {
                                $size: '$like'
                            }
                        }

                    },
                    { $unwind: '$owner' },
                    {
                        $project: {
                            content: 1,
                            likescount: 1,
                            owner: {
                                _id: 1,
                                username: 1,
                                avatar: 1
                            }
                        }
                    },
                ],
                totalCount: [
                    { $count: 'count' }
                ]
            }
        }
    ]);

    const comment = result[0].data;
    const totalDocs = result[0].totalCount[0]?.count || 0;
    const totalPages = Math.ceil(totalDocs / limit);

    if (!comment || comment.length === 0) {
        return res.status(200).json(new ApiResponse(200, [], "No comment found"));
    }

    const responseData = {
        docs: comment,
        totalDocs,
        totalPages,
        page: parseInt(page),
        limit: parseInt(limit),
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
        prevPage: page > 1 ? page - 1 : null,
        nextPage: page < totalPages ? parseInt(page) + 1 : null
    };

    return res
        .status(200)
        .json(new ApiResponse(200, responseData, "fetched successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentID } = req.params;
    const { content } = req.body || {};
    if (!commentID) {
        throw new ApiError(400, "CommentID is required");
    }
    if (!content || content.length == 0) {
        throw new ApiError(400, "Content is required");
    }
    const comment = await Comment.findOneAndUpdate(
        {
            _id: commentID,
            owner: req.user?._id
        },
        {
            $set: {
                content: content
            }
        },
        {
            new: true
        }
    );


    if (!comment) {
        throw new ApiError(500, "Something went wrong while updating comment")
    }

    return res.status(201)
        .json(new ApiResponse(200, comment, "Comment updated Successfully"));

});

const deleteComment = asyncHandler(async (req, res) => {
    const { commentID } = req.params;
    if (!commentID) {
        throw new ApiError(400, "CommentID is required");
    }
    const comment = await Comment.findOneAndDelete({
        _id: commentID,
        owner: req.user?._id
    });
    //remove the comment from likes collection
    await Like.deleteMany({ comment: commentID, likedBy: req.user?._id });
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    return res.status(200)
        .json(new ApiResponse(200, comment, "Comment deleted Successfully"));
})

export {
    addComment,
    getVideoComments,
    updateComment,
    deleteComment
}