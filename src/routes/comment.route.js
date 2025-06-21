import { Router } from "express";
import { addComment, deleteComment, getVideoComments, updateComment } from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();


router.get("/:videoId", getVideoComments);
router.post("/:videoId", verifyJWT, addComment);
router.patch("/:commentID", verifyJWT, updateComment);
router.delete("/:commentID", verifyJWT, deleteComment);

export default router;