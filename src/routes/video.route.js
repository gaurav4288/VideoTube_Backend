import { Router } from "express";
import { getAllVideo, publishAVideo } from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";


const router = Router();

router.get('/getallvideo', getAllVideo);
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


export default router;