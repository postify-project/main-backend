import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

// Cloudinary initialization
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const cloudinaryUploader = cloudinary.uploader;

// 💥 ADDED: Upload Buffer (Memory Storage) to Cloudinary
export const uploadBufferToCloudinary = (buffer, mimetype) => {
  return new Promise((resolve, reject) => {
    const isVideo = mimetype.startsWith("video");
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: isVideo ? "video" : "auto" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

export { cloudinary, cloudinaryUploader };