import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    // try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");  // skip Bearer and space and just store the token

        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        const decodedInfo = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedInfo?._id).select("-password -refreshToken");

        if (!user) throw new ApiError(401, "Invalid Access Token");

        req.user = user;
        next();
    // }
    // catch (error) {
    //     throw new ApiError(401, error?.message || "Invalid access token");
    // }
});



/*
accessToken => only storage to user side
refreshToken or sessionStorage => also stored in database

if accessToken expires :
    newAccessToken = refreshAccessToken(refreshToken)

if refreshToken sendByUser and storedInDatabase is same:
    give new accessToken to user through cookies
    refreshToken => may be updated for extra security
*/