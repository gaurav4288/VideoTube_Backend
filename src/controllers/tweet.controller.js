import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;
    if(!content) {
        throw new ApiError(400, "No content found");
    }
    const tweet = await Tweet.create({
        content,
        owner: req.user?._id,
    })
    if(!tweet) {
        throw new ApiError(500, "something went wrong while creating tweet");
    }

    return res
            .status(200)
            .json(new ApiResponse(201, tweet, "tweet created Successfully"))
});

const getUserTweets = asyncHandler(async (req, res) => {
    const userId = req.params.userId;
    if(!userId) {
        throw new ApiError(400, "No userId found");
    }
    const tweets = await Tweet.find({ owner: userId })
        .populate("owner", "username avatar")
        .sort({ createdAt: -1 });

    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "User tweets fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;

    if (!tweetId || !content) {
        throw new ApiError(400, "Tweet ID and content are required");
    }

    const tweet = await Tweet.findByIdAndUpdate(
        tweetId,
        { content },
        { new: true }
    );

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is required");
    }

    const tweet = await Tweet.findByIdAndDelete({
        _id: tweetId,
        owner: req.user?._id
    });

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Tweet deleted successfully"));
});




export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}