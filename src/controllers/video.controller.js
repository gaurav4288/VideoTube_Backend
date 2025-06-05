import { Types } from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
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

})




export {
    getAllVideo,
    publishAVideo,
}
