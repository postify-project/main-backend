import axios from 'axios';
import { cloudinaryUploader } from '../config/cloudinary.js';
import { SocialAccount } from '../models/socialAccount.model.js'; // Named import

// 1️⃣ Step 1: Facebook OAuth Link Generate Karna
export const getFacebookAuthUrl = (req, res) => {
  const appId = process.env.FACEBOOK_APP_ID;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
  
  const scope = [
    'public_profile',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts'
  ].join(',');

  // 💥 ADDED: auth_type=rerequest (forces account selection/re-auth)
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&auth_type=rerequest&response_type=code&state=${req.user._id || req.user.id}`;

  return res.status(200).json({ 
    success: true, 
    url: authUrl 
  });
};

// 2️⃣ Step 2: Facebook OAuth Callback (Tokens Exchange & DB Save)
export const facebookCallback = async (req, res) => {
  try {
    const { code, state: userId } = req.query;

    if (!code) {
      return res.status(400).json({ success: false, message: "Authorization code missing." });
    }

    // 1. Exchange Short-lived Token
    const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        redirect_uri: process.env.FACEBOOK_REDIRECT_URI,
        code
      }
    });

    const shortLivedToken = tokenRes.data.access_token;

    // 2. Exchange Long-lived Token
    const longLivedRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        fb_exchange_token: shortLivedToken
      }
    });

    const longLivedUserToken = longLivedRes.data.access_token;

    // 3. Fetch Managed Facebook Pages
    const pagesRes = await axios.get(`https://graph.facebook.com/v19.0/me/accounts?access_token=${longLivedUserToken}`);
    const pages = pagesRes.data.data;

    if (!pages || pages.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No Facebook Pages found. Please create a Facebook Page first."
      });
    }

    const primaryPage = pages[0];

    // 4. Save/Update in SocialAccount Collection
    const savedAccount = await SocialAccount.findOneAndUpdate(
      { user: userId, platform: 'facebook' },
      {
        user: userId,
        platform: 'facebook',
        platformAccountId: primaryPage.id,     // Page ID
        accountName: primaryPage.name,          // Page Name
        accessToken: primaryPage.access_token,  // Page Access Token
        isActive: true,                          // 💥 ADDED: Active status flag
      },
      { upsert: true, new: true }
    );

    // 🎯 Direct Response Screen
    return res.status(200).json({
      success: true,
      message: "Facebook account connected and saved to DB successfully!",
      connectedAccount: savedAccount
    });

  } catch (error) {
    console.error("Facebook Connect Error:", error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to connect Facebook",
      error: error.response?.data || error.message
    });
  }
};

// 3️⃣ Step 3: Create Facebook Post (Support Text, Image & Video)
export const createFacebookPost = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { caption } = req.body;
    const file = req.file;

    // 💥 ADDED: At least Caption OR File is required
    if (!caption && !file) {
      return res.status(400).json({ 
        success: false, 
        message: "Please provide a caption or upload media to post." 
      });
    }

    // 1. Fetch Facebook Account from SocialAccount Schema
    const fbAccount = await SocialAccount.findOne({ 
      user: userId, 
      platform: "facebook" 
    });

    if (!fbAccount || !fbAccount.accessToken || !fbAccount.platformAccountId) {
      return res.status(400).json({ 
        success: false, 
        message: "Facebook page is not connected. Please connect Facebook first." 
      });
    }

    let fbResponse;
    let mediaUrl = null;

    // 2. Handle Media Post vs Text-Only Post
    if (file) {
      // Upload Buffer to Cloudinary
      const cloudinaryResult = await cloudinaryUploader(file.buffer, file.mimetype);
      mediaUrl = cloudinaryResult.secure_url;

      const isVideo = file.mimetype.startsWith('video');

      if (isVideo) {
        // Video Post
        fbResponse = await axios.post(
          `https://graph.facebook.com/v19.0/${fbAccount.platformAccountId}/videos`,
          {
            file_url: mediaUrl,
            description: caption || '',
            access_token: fbAccount.accessToken
          }
        );
      } else {
        // Photo Post
        fbResponse = await axios.post(
          `https://graph.facebook.com/v19.0/${fbAccount.platformAccountId}/photos`,
          {
            url: mediaUrl,
            caption: caption || '',
            access_token: fbAccount.accessToken
          }
        );
      }
    } else {
      // 💥 ADDED: Text-Only Feed Post
      fbResponse = await axios.post(
        `https://graph.facebook.com/v19.0/${fbAccount.platformAccountId}/feed`,
        {
          message: caption,
          access_token: fbAccount.accessToken
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: file ? `${file.mimetype.startsWith('video') ? 'Video' : 'Image'} posted successfully!` : 'Text post published successfully!',
      facebookPostId: fbResponse.data.id || fbResponse.data.post_id,
      mediaUrl: mediaUrl
    });

  } catch (error) {
    console.error("Facebook Post Error:", error.response?.data || error.message);

    // 💥 ADDED: Auto-Detect Revoked / Expired Token
    const fbError = error.response?.data?.error;
    if (fbError && (fbError.code === 190 || fbError.type === 'OAuthException')) {
      await SocialAccount.findOneAndUpdate(
        { user: req.user._id || req.user.id, platform: "facebook" },
        { isActive: false }
      );
      return res.status(401).json({
        success: false,
        message: "Facebook access token expired or revoked. Please reconnect your account."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create Facebook post",
      error: error.response?.data || error.message
    });
  }
};