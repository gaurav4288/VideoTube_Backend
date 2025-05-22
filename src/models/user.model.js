import mongoose, {Schema} from "mongoose";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const userSchema = new Schema({

    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    email : {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    avatar: {
        type: String, //clodinary url
        required: true,
    },
    coverImage: {
        type: String, //clodinary url
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
    },
    wathHistory: {
        type: Schema.Types.ObjectId,
        ref: "Video",
    },
    refreshToken: {
        type:String,
    }
}, {timestamps: true});

// pre operation on password to insert in db on modification
userSchema.pre("save", async function (next) {
    if(!this.isModified('password')) return next();

    this.password = bcrypt.hash(this.password, 10);
    next();
}); 
//method to check password given by user is correct
userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password);
}

// method for access tokens
userSchema.methods.generateAccessToken = async function() {
    jwt.sign(
    {
        _id:this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    })
}
//method for refresh token
userSchema.methods.generateRefreshToken = async function() {
    jwt.sign(
    {
        _id:this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    })
}


export const User = mongoose.model('User', userSchema);