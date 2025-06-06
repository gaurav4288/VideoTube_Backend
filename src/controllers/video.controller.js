import { Types } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import Fuse from "fuse.js";


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

        let videos = result[0].data;
        if (!videos || videos.length === 0) {
            return res.status(200).json(new ApiResponse(200, [], "No videos found"));
        }

        // Fuzzy search with Fuse.js if query is present
        const trimmedQuery = query.trim();
        if (trimmedQuery) {
            const fuse = new Fuse(videos, {
                keys: ["title", "description"],
                threshold: 0.6 // adjust for fuzziness
            });
            videos = fuse.search(trimmedQuery).map(res => res.item);
        }

        const totalDocs = videos.length || 0;
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
    const { title, description } = req.body
    const userID = req.user._id;

    if (!title || !description) {
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

    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title,
        description,
        owner: userID,
        duration: videoFile.duration,
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
    const video = await Video.aggregate([
        { $match: { _id: new Types.ObjectId(videoId) } },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "comments",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails"
                        }
                    },
                    {
                        $addFields: {
                            owner: { $arrayElemAt: ["$ownerDetails", 0] }
                        }
                    },
                    {
                        $project: {
                            content: 1,
                            createdAt: 1,
                            owner: {
                                _id: "$owner._id",
                                username: "$owner.username",
                                avatar: "$owner.avatar"
                            }
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "owner",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "users",
                let: { videoId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $in: ["$$videoId", "$watchHistory"] }
                        }
                    },
                    { $count: "count" }
                ],
                as: "views"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                commentCount: {
                    $size: "$comments"
                },
                subscribersCount: {
                    $size: "$subscribers"
                },
                views: { 
                    $ifNull: [{ $arrayElemAt: ["$views.count", 0] }, 0] 
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                },
                owner: { $arrayElemAt: ["$ownerDetails", 0] }
            }
        },
        {
            $project: {
                videoFile: 1,
                thumbnail: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                createdAt: 1,
                likesCount: 1,
                commentCount: 1,
                subscribersCount: 1,
                isSubscribed: 1,
                comments: 1,
                owner: {
                    _id: "$owner._id",
                    username: "$owner.username",
                    avatar: "$owner.avatar"
                }
            }
        }
    ])

    if (!video?.length) {
        throw new ApiError(404, "Video not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video[0], "Video fetched successfully"));
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

    const updatedVideo = await video.save();

    // Delete old thumbnail from cloudinary if exists
    if (oldThumbnail) {
        await deleteFromCloudinary(oldThumbnail);
    }

    return res.status(200).json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});



export {
    getAllVideo,
    publishAVideo,
    getVideoById,
    updateVideo,
}
