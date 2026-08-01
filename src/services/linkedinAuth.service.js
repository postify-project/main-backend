// src/services/linkedinAuth.service.js
import axios from "axios";
import { SocialAccount } from "../models/socialAccount.model.js";

/**
 * Refreshes an expired LinkedIn access token using the stored refresh token
 * @param {Object} account - MongoDB SocialAccount document
 * @returns {Promise<string>} Valid access token
 */
export async function getValidLinkedInToken(account) {
    // Check if token is still valid (with a 5-day safety margin)
    const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000;
    const isExpired =
        !account.expiresAt ||
        new Date(account.expiresAt).getTime() - fiveDaysInMs <= Date.now();

    if (!isExpired) {
        return account.accessToken;
    }

    // If no refresh token exists, throw error to prompt re-authentication
    if (!account.refreshToken) {
        throw new Error(
            "LinkedIn access token expired and no refresh token is available. Please reconnect your account."
        );
    }

    try {
        const params = new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: account.refreshToken,
            client_id: process.env.LINKEDIN_CLIENT_ID,
            client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        });

        const response = await axios.post(
            "https://www.linkedin.com/oauth/v2/accessToken",
            params.toString(),
            {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            }
        );

        const {
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
            expires_in,
        } = response.data;

        // Update database record with new tokens and expiration date
        account.accessToken = newAccessToken;
        if (newRefreshToken) {
            account.refreshToken = newRefreshToken;
        }
        account.expiresAt = new Date(Date.now() + expires_in * 1000);

        await account.save();

        return newAccessToken;
    } catch (error) {
        console.error(
            "Failed to refresh LinkedIn token:",
            error.response?.data || error.message
        );
        throw new Error(
            "LinkedIn authentication expired. Please reconnect your LinkedIn account."
        );
    }
}