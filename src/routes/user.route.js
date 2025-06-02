import { Router } from "express";
import { loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, getCurrentUser, changeCurrentPassword, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register",
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }, 
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)
router.post("/login", loginUser);

//secure routes
router.post("/logout",verifyJWT, logoutUser);
router.post("/refresh-token", refreshAccessToken);
router.get("/current-user", verifyJWT, getCurrentUser);
router.put("/update-account", verifyJWT, updateAccountDetails);
router.put("/change-password", verifyJWT, changeCurrentPassword);
router.put("/update-avatar", verifyJWT, upload.single("avatar"), updateUserAvatar);
router.put("/update-cover-image", verifyJWT, upload.single("coverImage"), updateUserCoverImage);
router.get("/history", verifyJWT , getWatchHistory);
router.get("/channel/:username", verifyJWT, getUserChannelProfile);






//export
export default router;