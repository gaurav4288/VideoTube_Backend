import { Types } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { User } from "../models/user.model.js";


const getAllVideo = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, query = '', sortBy = 'createdAt', sortType = 'desc', userId } = req.query;
        const validSortFields = ['createdAt', 'views', 'title'];
        if (!validSortFields.includes(sortBy)) {
            throw new ApiError(400, `Invalid sort field. Valid fields are: ${validSortFields.join(', ')}`);
        }
        if (isNaN(page) || isNaN(limit)) {
            throw new ApiError(400, "Page and limit must be valid numbers");
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const matchStage = {
            isPublished: true,
        };

        if (userId) {
            matchStage.owner = new Types.ObjectId(userId);
        }

        if (query) {
            matchStage.$or = [
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },

            ];
        }

        const sortStage = {
            [sortBy]: sortType === 'asc' ? 1 : -1
        };

        const result = await Video.aggregate([
            { $match: matchStage },
            {
                $facet: {
                    data: [
                        { $sort: sortStage },
                        { $skip: skip },
                        { $limit: parseInt(limit) },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'owner',
                                foreignField: '_id',
                                as: 'owner'
                            }
                        },
                        { $unwind: '$owner' },
                        {
                            $project: {
                                videoFile: 1,
                                thumbnail: 1,
                                title: 1,
                                description: 1,
                                duration: 1,
                                views: 1,
                                createdAt: 1,
                                owner: {
                                    _id: 1,
                                    username: 1,
                                    avatar: 1
                                }
                            }
                        }
                    ],
                    totalCount: [
                        { $count: 'count' }
                    ]
                }
            }
        ]);

        const videos = result[0].data;
        const totalDocs = result[0].totalCount[0]?.count || 0;
        const totalPages = Math.ceil(totalDocs / limit);


        if (!videos || videos.length === 0) {
            return res.status(200).json(new ApiResponse(200, [], "No videos found"));
        }

        const responseData = {
            docs: videos,
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
    } catch (error) {
        throw new ApiError(error.statusCode || 500, error.message || "Internal Server Error");
    }
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description, tags } = req.body
    const userID = req.user._id;

    if (!title || !description || !req.files?.videoFile || !req.files?.thumbnail) {
        throw new ApiError(400, "All fields are required");
    }
    const videoLocalPath = req.files?.videoFile[0]?.path;
    if (!videoLocalPath) {
        throw new ApiError(400, "video file is required");
    }
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail is required")
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath, "video");
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile || !thumbnail) {
        throw new ApiError(500, "Error uploading video");
    }
    const tagsArray = tags ? tags.match(/#\w+/g) || [] : [];
    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title,
        description,
        owner: userID,
        duration: videoFile.duration,
        tags: tagsArray
    });

    if (!video) {
        throw new ApiError(500, "Something went wrong while db call")
    }

    return res.status(201).json(
        new ApiResponse(200, { video, videoFile }, "video uploaded successfully")
    )

});

const getVideoById = asyncHandler(async (req, res) => {
    const videoId = req.params?.videoId;

    if (!videoId) {
        throw new ApiError(400, "videoId can't be empty");
    }

    // Fetch the video
    const video = await Video.findById(videoId).populate('owner', '_id username avatar');

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const user = await User.findById(req.user?._id); // Ensure req.user exists and is populated

    if (user) {
        const alreadyWatched = user.watchHistory.some(
            (id) => id.toString() === videoId.toString()
        );

        if (!alreadyWatched) {
            user.watchHistory.push(video._id); // Always use ObjectId
            await user.save();

            video.views = (video.views || 0) + 1;
            await video.save(); // Save after incrementing
        }
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video fetched successfully"));
});


const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const thumbnailLocalPath = req.file?.path;
    const { title, description } = req.body;

    if (!videoId) {
        throw new ApiError(400, "Video ID is required");
    }
    if (!thumbnailLocalPath || !title || !description) {
        throw new ApiError(400, "All fields (title, description, thumbnail) are required");
    }

    const video = await Video.findOne({ _id: videoId, owner: req.user?._id });
    if (!video) {
        throw new ApiError(404, "Video not found or you are not authorized to update it");
    }
    console.log(video);
    console.log(thumbnailLocalPath);

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail?.url) {
        throw new ApiError(500, "Error uploading thumbnail to Cloudinary");
    }

    // Save old thumbnail to delete later
    const oldThumbnail = video.thumbnail;

    video.title = title;
    video.description = description;
    video.thumbnail = thumbnail.url;
    video.tags = req.body.tags ? req.body.tags.match(/#\w+/g) || [] : [];
    video.views = 0; // Reset views on update, if needed

    const updatedVideo = await video.save();

    // Delete old thumbnail from cloudinary if exists
    if (oldThumbnail) {
        await deleteFromCloudinary(oldThumbnail);
    }

    return res.status(200).json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // Validate videoId
    if (!videoId || !Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "A valid videoId is required");
    }

    // Find and delete the video
    const video = await Video.findByIdAndDelete(
        {
            _id: videoId,
            owner: req.user?._id
        }
    );
    if (!video) {
        throw new ApiError(404, "Video not found or user not authorized to delete file");
    }

    // Delete video and thumbnail from Cloudinary
    try {
        await deleteFromCloudinary(video.videoFile, "video");
        await deleteFromCloudinary(video.thumbnail);
    } catch (cloudErr) {
        // Log but don't block deletion
        console.error("Cloudinary deletion error:", cloudErr);
    }

    // Delete related likes and comments
    await Like.deleteMany({ video: videoId });
    await Comment.deleteMany({ video: videoId });

    // Remove video from users' watchHistory
    await User.updateMany(
        { watchHistory: videoId },
        { $pull: { watchHistory: videoId } }
    );

    return res.status(200).json(
        new ApiResponse(200, { videoId }, "Video deleted successfully")
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const video = await Video.findById(videoId);
    if (video.owner != req.user?._id) {
        throw new ApiError(403, "You are not authorized to toggle publish status of this video");
    }

    if (!video) {
        throw new ApiError(404, "Video not found");
    }


    video.isPublished = !video.isPublished;

    await video.save();

    return res
        .status(200)
        .json(
            new ApiResponse(200, video, "Video publish status toggled successfully")
        );
});

const getVideoByTag = asyncHandler(async (req, res) => {
    const { tag } = req.params;

    if (!tag) {
        throw new ApiError(400, "Tag is required");
    }

    const videos = await Video.find({ tags: { $regex: tag, $options: 'i' }, isPublished: true })
        .populate('owner', '_id username avatar')
        .sort({ createdAt: -1 });

    if (!videos || videos.length === 0) {
        return res.status(200).json(new ApiResponse(200, [], "No videos found for this tag"));
    }

    return res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

export {
    getAllVideo,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    getVideoByTag,
}
