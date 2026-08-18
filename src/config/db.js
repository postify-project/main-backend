// import mongoose from "mongoose"

// export const mongoDB = () =>{

// const URI = process.env.MONGODB_URI
// mongoose.connect(URI)
// .then(()=>console.log("mongoDB connected"))
// .catch((error)=>console.log(" mongoDb not connected!", error.message))

// }


import mongoose from "mongoose";

/**
 * MongoDB connection helper optimized for Serverless (Vercel) & Local environments.
 * Reuses existing connection pools across serverless function invocations.
 */
export const mongoDB = async () => {
  const URI = process.env.MONGODB_URI;

  if (!URI) {
    console.error("❌ Error: MONGODB_URI is missing from environment variables!");
    return;
  }

  // readyState: 1 = connected, 2 = connecting
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (mongoose.connection.readyState === 2) {
    console.log("⏳ MongoDB connection in progress, waiting...");
    await new Promise((resolve) => {
      mongoose.connection.once("connected", resolve);
    });
    return;
  }

  try {
    await mongoose.connect(URI, {
      bufferCommands: false, // Prevents long hanging requests if DB is down
    });
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }
};