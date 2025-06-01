import { v2 as cloudinary } from "cloudinary";
import fs from 'fs';


// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //uplaod file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto'
        })
        // Safely delete file after upload
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        //file has been uploaded successfully
        console.log("File uploaded on cloudinary", response.url);
        return response;
    } catch (error) {
        console.error("Cloudinary Upload Error:", error);

        // Try to clean up even on error
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return null;
    }
}

const deleteFromCloudinary = async (url) => {
    cloudinary.uploader.destroy(url, (error, result) => {
        if (error) {
            console.error("Error deleting from Cloudinary:", error);
            return false;
        }
        console.log("File deleted from Cloudinary:", result);
        return true;
    });
}

export { uploadOnCloudinary, deleteFromCloudinary };