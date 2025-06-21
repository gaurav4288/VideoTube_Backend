import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getSubscribedChannels, getUserChannelSubscribers, toggleSubscription } from "../controllers/subscription.controller.js";


const router = Router();

router.get('/subscribers/:channelId', verifyJWT, getUserChannelSubscribers);
router.get('/subscribed-channels/:subscriberId', verifyJWT, getSubscribedChannels);
router.post('/subscribe/:channelId', verifyJWT, toggleSubscription);

export default router;

