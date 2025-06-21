import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body;
    const userId = req.user?._id;
    if(!name || !description) {
        throw new ApiError(400, "Name and description are required in playlist creation");
    }
    const playlist = await Playlist.create({
        name,
        description,
        owner: userId
    })
    if(!playlist) {
        throw new ApiError(500, "Failed to create playlist");
    }

    return res
        .status(200)
        .json(new ApiResponse(200,playlist, "Playlist created successfully"))
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {channelId} = req.params;
    if(!channelId) {
        throw new ApiError(400, "Channel ID is required to get playlists");
    }

    const playlists = await Playlist.find({owner: channelId}).select('-videos');
    if(!playlists || playlists.length === 0) {
        throw new ApiError(404, "No playlists found for this channel");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, playlists, "Playlists fetched successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if(!playlistId) {
        throw new ApiError(400, "Playlist ID is required to get playlists");
    }
    const playlist = await Playlist.findById(playlistId).populate({
        path: "videos",
        select: "thumbnail videoFile title description createdAt"
    }).populate("owner", "username");
    if(!playlist) {
        throw new ApiError(404, "Playlist not found");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));

})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!playlistId || !videoId) {
        throw new ApiError(400, "Playlist ID and Video ID are required");
    }

    const playlist = await Playlist.findById(playlistId);
    if(!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    playlist.videos.push(videoId);
    await playlist.save();

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Video added to playlist successfully"));
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!playlistId || !videoId) {
        throw new ApiError(400, "Playlist ID and Video ID are required");
    }

    const playlist = await Playlist.findById(playlistId);
    if(!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    playlist.videos.pull(videoId);
    await playlist.save();

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Video removed from playlist successfully"));
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params;
    if(!playlistId) {
        throw new ApiError(400, "Playlist ID is required");
    } 
    const deleted = await Playlist.findByIdAndDelete(playlistId);
    if(!deleted) {
        throw new ApiError(404, "playlist not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
    
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params;
    const {name, description} = req.body || {};
    if(!playlistId) {
        throw new ApiError(400, "Playlist ID is required");
    } 
    if(!name || !description) {
        throw new ApiError(400, "Fields musn't be empty");
    }
    const updatedplaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name: name,
                description: description
            }
        }
    )
    if(!updatedplaylist) {
        throw new ApiError(404, "Playlist not found");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, updatedplaylist, "Playlist updated successfully"));

});


export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
}