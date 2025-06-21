import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    if (!channelId) {
        throw new ApiError(400, "Channel ID is required.");
    }

    if (req.user?._id.toString() === channelId.toString()) {
        throw new ApiError(400, "You cannot subscribe to your own channel");
    }
    const subscriberId = req.user._id;
    if (!subscriberId) {
        throw new ApiError(400, "Subscriber ID is required.");
    }

    const existingSubscription = await Subscription.findOne({
        subscriber: subscriberId,
        channel: channelId,
    });

    if (existingSubscription) {
        // Remove the existing subscription (unsubscribe)
        await Subscription.findByIdAndDelete(existingSubscription._id);
        return res
            .status(200)
            .json(new ApiResponse(200, {}, "Unsubscribed successfully"));
    }

    await Subscription.create({ subscriber: subscriberId, channel: channelId });
    return res
        .status(201)
        .json(new ApiResponse(201, {}, "Subscribed successfully"));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if(!channelId) {
        throw new ApiError(400, "Channel ID is required.");
    }
    const subscribers = await Subscription.find({channel: channelId})
        .populate("subscriber", "avatar username")
        .sort({createdAt: -1});
    if(!subscribers) {
        throw new ApiError(400, "No channel Availabe with this Id");
    }

    return res
        .status(200)
        .json(new ApiResponse(201, subscribers, "Subcriber fetched successfully"));
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    if(!subscriberId) {
        throw new ApiError(400, "Subscriber ID is required.");
    }

    const channelSubscribed = await Subscription.find({subscriber: subscriberId}).populate("channel", "avatar username _id");
    if(!channelSubscribed) {
        throw new ApiError(400, "No channel Available with this Id");
    }
    return res
        .status(200)
        .json(new ApiResponse(201, channelSubscribed, "Subscribed channels fetched successfully"));
})


export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}