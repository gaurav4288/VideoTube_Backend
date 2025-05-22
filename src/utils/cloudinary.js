import { v2 as cloudinary } from "cloudinary";
import fs from 'fs';


// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_SECRET_KEY
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        //uplaod file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type:'auto'
        })
        //file has been uploaded successfully
        console.log("File uploaded on cloudinary", response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath); //remove the locally saved temporary file as the upload operation failed
        return null;
    }
}

export {uploadOnCloudinary}