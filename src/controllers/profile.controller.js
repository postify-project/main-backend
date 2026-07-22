import { cloudinaryUploader } from "../config/cloudinary.js"; // Cloudinary config uploader
import { UserModel } from "../models/user.model.js";

export const getProfileData = async (req, res) => {
    try {
        // protectRoute aapko user ki id 'req.user.id' ya 'req.userId' mein deta hai (apne middleware ke hisab se use karein)
        const userId = req.userId || req.user?.id;

        const user = await UserModel.findById(userId).select("-password");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        console.error("Error fetching profile:", error.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
}


export const profileUpdate = async (req, res) => {
  try {
    const userId = req.userId || req.user?.id;
    const { name, phoneNumber, bio } = req.body;

    const fieldsToUpdate = {};
    if (name) fieldsToUpdate.name = name;
    if (phoneNumber) fieldsToUpdate.phoneNumber = phoneNumber;
    if (bio !== undefined) fieldsToUpdate.bio = bio;

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: fieldsToUpdate },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error.message);
    res.status(500).json({ success: false, message: error.message || "Server Error" });
  }
}


export const uploadProfileImage = async (req, res) => {
    const userId = req.userId || req.user?.id;

    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select an image to upload."
            });
        }

        // 1. Helper function to upload RAM Buffer using your existing `cloudinaryUploader`
        const uploadFromBuffer = (buffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinaryUploader.upload_stream(
                    { folder: "social_media_profiles" },
                    (error, result) => {
                        if (result) resolve(result);
                        else reject(error);
                    }
                );
                stream.end(buffer); // Pushes the buffer from memory to Cloudinary
            });
        };

        // 2. Upload directly from req.file.buffer
        const imageRes = await uploadFromBuffer(req.file.buffer);

        console.log("Cloudinary URL generated:", imageRes.secure_url);

        // 3. Save secure_url to user's database document
        const updatedUser = await UserModel.findByIdAndUpdate(
            userId,
            { imageUrl: imageRes.secure_url },
            { new: true }
        ).select("-password");

        return res.status(200).json({
            success: true,
            message: "Image uploaded and database updated!",
            url: imageRes.secure_url,
            data: updatedUser
        });

    } catch (error) {
        console.error("Error uploading image:", error.message);
        return res.status(500).json({
            success: false,
            message: "Image upload failed. Server Error."
        });
    }
    // Note: No finally block needed! RAM automatically clears after the request cycle.
};