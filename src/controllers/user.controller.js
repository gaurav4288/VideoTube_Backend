import { response } from 'express';
import {User} from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js'
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';


const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    const {username, email, fullName, password} = req.body;

    // validation - not empty
    if(
        [fullName, email, username, password].some( (field) => 
        field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields required", )
    }

    //check if user already exist: username, email
    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })
    if(existedUser) {
        throw new ApiError(409, "User Already exist");
    }

    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.avatar[0]?.path;
    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    //upload them to cloudinary, avatar 
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    // create user object - create entry in 
    // db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        username: username.toLowerCase(),
        password,
        coverImage: coverImage?.url || "",
        email
    });

    // remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // check for user creation
    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user");
    }

    //return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfulyy!")
    )
})

export {registerUser}