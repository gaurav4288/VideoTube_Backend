import { Router } from "express";
import { deleteVideo, getAllVideo, getVideoById, publishAVideo, togglePublishStatus, updateVideo } from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";


const router = Router();

router.get('/getallvideo', getAllVideo);

//secure routes
router.post('/upload', verifyJWT, 
    upload.fields([
            {
                name: "videoFile",
                maxCount: 1
            }, 
            {
                name: "thumbnail",
                maxCount: 1
            }
        ]), 
        publishAVideo
);
router.get("/getbyid/:videoId", getVideoById);
router.post("/update/:videoId", upload.single("thumbnail"), verifyJWT, updateVideo);
router.delete("/delete/:videoId",verifyJWT, deleteVideo);
router.patch("/toggle-publish/:videoId", verifyJWT, togglePublishStatus);


export default router;