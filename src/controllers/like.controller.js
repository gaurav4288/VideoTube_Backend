import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const userId = req.user?._id;
    if (!videoId) {
        throw new ApiError(400, "Video ID is required");
    }
    const existingLike = await Like.findOne({ video: videoId, likedBy: userId });
    if (existingLike) {
        // If like exists, remove it
        await Like.deleteOne({ _id: existingLike._id });
        return res.status(200).json(new ApiResponse(200, null, "Video unliked successfully"));
    } else {
        // If like does not exist, create it
        const newLike = new Like({
            video: videoId,
            likedBy: userId
        });
        await newLike.save();
        return res.status(201).json(new ApiResponse(201, newLike, "Video liked successfully"));
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const userId = req.user?._id;
    if (!commentId) {
        throw new ApiError(400, "Comment ID is required");
    }
    const existingLike = await Like.findOne({ comment: commentId, likedBy: userId });
    if (existingLike) {
        // If like exists, remove it
        await Like.deleteOne({ _id: existingLike._id });
        return res.status(200).json(new ApiResponse(200, null, "Comment unliked successfully"));
    } else {
        // If like does not exist, create it
        const newLike = new Like({
            comment: commentId,
            likedBy: userId
        });
        await newLike.save();
        return res.status(201).json(new ApiResponse(201, newLike, "Comment liked successfully"));
    }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    const userId = req.user?._id;
    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required");
    }
    const existingLike = await Like.findOne({ tweet: tweetId, likedBy: userId });
    if (existingLike) {
        // If like exists, remove it
        await Like.deleteOne({ _id: existingLike._id });
        return res.status(200).json(new ApiResponse(200, null, "Tweet unliked successfully"));
    } else {
        // If like does not exist, create it
        const newLike = new Like({
            tweet: tweetId,
            likedBy: userId
        });
        await newLike.save();
        return res.status(201).json(new ApiResponse(201, newLike, "Tweet liked successfully"));
    }
})

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    const likedVideos = await Like.find({ likedBy: userId, video: { $exists: true } })
        .populate({
            path: "video",
            select: "title description thumbnail duration views",
            populate: {
                path: "owner",
                select: "username avatar"
            }
        });

    res.status(200).json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"));
});


export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,    
    getLikedVideos
}
