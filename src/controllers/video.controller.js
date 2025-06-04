import { Video } from "../models/video.model";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";

const getAllVideo = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, query = '', sortBy = 'createdAt', sortType = 'desc', userId } = req.query;
        if (isNaN(page) || isNaN(limit)) {
          throw new ApiError(400, "Page and limit must be valid numbers");
        }
    
        const skip = (parseInt(page) - 1) * parseInt(limit);
    
        const matchStage = {
            isPublished: true,
        };
    
        if (query) {
            matchStage.$or = [
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ];
        }
    
        if (userId) {
            matchStage.owner = userId;
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




export {
    getAllVideo,
}
