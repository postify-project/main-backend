import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      trim: true,
      // Required ONLY if the user is NOT signing up via OAuth
      required: [
        function () {
          return !this.googleId && !this.facebookId;
        },
        "Phone number is required",
      ],
    },
    password: {
      type: String,
      // Required ONLY if the user is NOT signing up via OAuth
      required: [
        function () {
          return !this.googleId && !this.facebookId;
        },
        "Password is required",
      ],
    },
    // 🆔 OAuth Provider IDs
    googleId: {
      type: String,
      default: null,
    },
    facebookId: {
      type: String,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    roles: {
      type: [String],
      default: ["USER"],
    },
    // 👤 Profile Fields
    imageUrl: {
      type: String,
      default:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
    },
    bio: {
      type: String,
      maxLength: 160,
      default: "",
    },
    // 🔗 Connected Social Accounts (Publishing tokens)
    connectedAccounts: {
      linkedin: { 
        accessToken: { type: String, default: null }, 
        accountId: { type: String, default: null }, 
        profileName: { type: String, default: null } 
      },
      facebook: { 
        accessToken: { type: String, default: null }, // Facebook Page Access Token
        pageId: { type: String, default: null }, 
        pageName: { type: String, default: null } 
      },
      instagram: { 
        accessToken: { type: String, default: null }, 
        accountId: { type: String, default: null }, 
        username: { type: String, default: null } 
      },
      linkedin: { accessToken: String, accountId: String, profileName: String },
      facebook: { accessToken: String, pageId: String, pageName: String },
      instagram: { accessToken: String, accountId: String, username: String },
    },
  },
  {
    timestamps: true,
  }
);

export const UserModel = model("User", userSchema);