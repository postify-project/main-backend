// import mongoose from "mongoose"

// export const mongoDB = () =>{

// const URI = process.env.MONGODB_URI
// mongoose.connect(URI)
// .then(()=>console.log("mongoDB connected"))
// .catch((error)=>console.log(" mongoDb not connected!", error.message))

// }


import mongoose from "mongoose";

// Connection pooling state track karne ke liye variable (Vercel optimization)
let isConnected = false;

export const mongoDB = async () => {
  const URI = process.env.MONGODB_URI;

  if (!URI) {
    console.log("Error: MONGODB_URI is missing!");
    return;
  }

  // Agar pehle se connected hai toh dubara connection mat banao
  if (isConnected) {
    console.log("=> Using existing mongoDB connection");
    return;
  }

  try {
    // async/await ke sath sahi wait setup
    const db = await mongoose.connect(URI);
    isConnected = db.connections[0].readyState;
    console.log("mongoDB connected successfully");
  } catch (error) {
    console.log("mongoDb not connected!", error.message);
    throw error;
  }
};