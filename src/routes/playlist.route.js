import { Router } from "express";
import { addVideoToPlaylist, createPlaylist, deletePlaylist, getPlaylistById, getUserPlaylists, removeVideoFromPlaylist, updatePlaylist } from "../controllers/playlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();
router.use(verifyJWT);

router.post("/", createPlaylist);
router.get("/channel/:channelId", getUserPlaylists);

router.get("/:playlistId", getPlaylistById);
router.patch("/:playlistId", updatePlaylist);
router.delete("/:playlistId", deletePlaylist);

router.patch("/:playlistId/videos/:videoId", addVideoToPlaylist);
router.patch("/:playlistId/videos/:videoId", removeVideoFromPlaylist);


export default router;
