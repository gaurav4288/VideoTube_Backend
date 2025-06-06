import { exec } from "child_process";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import fs from 'fs';
import { promisify } from 'util';
import { json } from "stream/consumers";

const execPromise = promisify(exec);

// Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const getPublicIdFromUrl = (url) => {
  try {
    const parsedUrl = new URL(url);
    const parts = parsedUrl.pathname.split('/');
    const uploadIndex = parts.indexOf('upload');

    // Skip everything up to "upload" and the version
    const afterUploadParts = parts.slice(uploadIndex + 1);
    if (afterUploadParts[0].startsWith('v')) {
      afterUploadParts.shift(); // Remove version segment
    }

    // Join the rest and remove extension
    let publicId = afterUploadParts.join('/');
    publicId = publicId.replace(/\.[^/.]+$/, ''); // remove .jpg/.mp4

    return publicId;
  } catch (error) {
    console.error("❌ Failed to extract public_id:", error);
    return null;
  }
};

const uploadOnCloudinary = async (inputPath, type = 'image') => {
    const ext = path.extname(inputPath);
    const fileName = path.basename(inputPath, ext);
    const outputPath = path.join(path.dirname(inputPath), `${fileName}_compressed${ext}`);

    const stats = fs.statSync(inputPath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    const shouldCompress =
        (type === 'video' && fileSizeInMB > 100) ||
        (type === 'image' && fileSizeInMB > 10);

    try {
        if (shouldCompress) {
            console.log(`Compressing ${type}...`);
            const compressCommand = type === 'video'
                ? `ffmpeg -i "${inputPath}" -vcodec libx264 -crf 28 "${outputPath}" -y`
                : `ffmpeg -i "${inputPath}" -vf scale=iw/2:-1 "${outputPath}" -q:v 5 -y`; // basic image compression

            await execPromise(compressCommand);

            if (!fs.existsSync(outputPath)) {
                throw new Error("Compression failed: output file not found");
            }
        }

        const uploadPath = shouldCompress ? outputPath : inputPath;
        console.log("Uploading to Cloudinary...");
        const result = await cloudinary.uploader.upload(uploadPath, {
            resource_type: type,
        });

        console.log("Uploaded to Cloudinary:", result.secure_url);

        // Cleanup
        shouldCompress && fs.unlinkSync(outputPath);
        fs.unlinkSync(inputPath);

        return {
            url: result.secure_url,
            duration: result.duration,
        };
    } catch (err) {
        if(inputPath) fs.unlinkSync(inputPath);
        console.error("Error in uploadOnCloudinary:", JSON.stringify(err.message));
        throw err;
    }
};

const deleteFromCloudinary = async (url, type = "image") => {
    const publicId = getPublicIdFromUrl(url);
    if (!publicId) {
        console.error("Invalid URL or failed to extract public_id");
        return false;
    }

    try {
        console.log("Attempting delete with public_id:", publicId);
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: type, // 'video' or 'image'
        });

        if (result.result === "ok") {
            console.log("Deleted from Cloudinary:", result);
            return true;
        } else {
            console.warn("Deletion failed or file not found:", result);
            return false;
        }
    } catch (error) {
        console.error("Cloudinary deletion error:", error);
        return false;
    }
};



export { uploadOnCloudinary, deleteFromCloudinary};