import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/claudinary.js";

import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (user) => {
    try {
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        user.accessToken = accessToken;

        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access tokens.");
    }

};
const registerUser = asyncHandler(async (req, res, next) => {
    const { fullName, email, username, password } = req.body;

    if ([fullName, email, username, password].some(field => field === undefined || field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]      // $or is a operator here
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    if (!(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0)) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;


    let coverImageLocalPath;       // because it's optional, so it may be absent in req files
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    const avatar = avatarLocalPath && await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath && await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");  // remove password, refreshToken and get all rest info

    if (!createdUser) throw new ApiError(500, "Something went wrong while registering the user");

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully") // send 201 status code here ??
    );

});

const loginUser = asyncHandler(async (req, res, next) => {
    const { email, username, password } = req.body;

    if (!(email && username)) {
        throw new ApiError(400, "Username or Email is required.");
    }

    const user = await User.findOne({ $or: [{ email }, { username }] });

    if (!user) {
        throw new ApiError(400, "User Does not exists.");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(400, "Invalid Credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user);

    // const loggedInUser = await User.findByIdAndUpdate(user._id, { refreshToken }, { new: true }).select("-password -refreshToken");

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const cookieOptions = {
        httpOnly: true,
        secure: true,   // now frontend cant modify these cookies by these two options
    };

    return res.status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res, next) => {

    // error handling => if user not found 
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document from database
            }
        },
        {
            new: true       // gives new updated user data
        }
    );

    const cookieOptions = {
        httpOnly: true,
        secure: true,   // now frontend cant modify these cookies by these two options
    };

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged Out"));
});

const changeCurrentPassword = asyncHandler(async (req, res, next) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req?.user?._id);

    const isOldPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isOldPasswordCorrect) throw new ApiError(400, "Invalid old password");

    user.password = newPassword;
    await user.save({ validateBrforeSave: false });

    return res.status(200)
        .json(new ApiResponse(200, {}, "Password change successfully"));

});

const getCurrentUser = asyncHandler(async (req, res, next) => {
    // bcause by auth midleware user is injected in req if it's authenticated successfully
    return res.status(200)
        .json(new ApiResponse(200, req.user, "current user fetched successfully"));
});

// for file updates controllers must be different
const updateAccountDetails = asyncHandler(async (req, res, next) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) throw new ApiError(400, "All fields are required.");

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        { new: true }
    ).select("-password");

    return res.status(200)
        .json(new ApiResponse(200, user, "Account Details updated successfully"));
});


//  TODO: write a function to delete old image after uploading new one
const updateUserAvatar = asyncHandler(async (req, res, next) => {
    // multer middleware gives use file
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) throw new ApiError(400, "Avatar is required");

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar?.url) throw new ApiError(400, "Error while uploading a avatar");

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password");


    return res.status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully."));

});


const updateUserCoverImage = asyncHandler(async (req, res, next) => {
    // multer middleware gives use file
    const coverLocalPath = req.file?.path;
    if (!coverLocalPath) throw new ApiError(400, "Cover image is required");

    const coverImage = await uploadOnCloudinary(coverLocalPath);

    if (!coverImage?.url) throw new ApiError(400, "Error while uploading a cover image");

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password");

    return res.status(200)
        .json(new ApiResponse(200, user, "Cover Image updated successfully."));

});


const refreshAccessToken = asyncHandler(async (req, res, next) => {
    // send my refreshToken => i can access by cookies
    const incomingRefreshToken = req.cookies.refreshToken || red.body.refreshToken;
    if (!incomingRefreshToken) throw new ApiError(401, "UnAuthorized request");

    try {
        const decodedInfo = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedInfo?._id);

        if (!user) throw new ApiError(401, "Invalid refresh token");

        if (incomingRefreshToken !== user?.refreshToken) throw new ApiError(401, "refresh token is expired or used");

        const cookiesOptions = {
            httpOnly: true,
            serure: true,
        };

        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user);

        return res.status(200)
            .cookie("accessToken", accessToken, cookiesOptions)
            .cookie("refreshToken", refreshToken, cookiesOptions)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken },
                    "Access Token refreshed"
                )
            );
    } catch (error) {
        return new ApiError(401, error?.message || "refresh token refreshing failed.");
    }

});


const getUserChannelProfile = asyncHandler(async (res, req, next) => {
    const { username } = req.params;

    if (!username?.trim()) throw new ApiError(400, "username is missing");

    const channel = await User.aggregate({
        $match: {
            username: username.toLowerCase()
        }
    }, {
        $lookup: {                  // geting subscribers of user in form of array
            from: "subscriptions",
            localField: "_id",
            foreignField: "channel",
            as: "subscribers"
        }
    }, {
        $lookup: {          // getting the subscribed channels by user
            from: "subscriptions",
            localField: "_id",
            foreignField: "subscriber",
            as: "subscribedTo"
        }
    }, {
        $addFields: {
            subscribersCount: {
                $size: "$subscribers",          // size means count or length of list
            },
            channelIsSubscribedToCount: {
                $size: "$subscribedTo"
            },
            isSubscribed: {
                $cond: {            // cond => condition
                    if: { $in: { req.user?._id, "$subscribers.subscriber"} },     // in => present or not
                    then: true,             // if cond is true, exec then, is false exec else
                    else: false,
                }
            }
        }
    }, {
        $project: {
            fullName: 1, // 1 means true, 0 -> false
            username: 1,
            subscriberCount: 1,
            channelIsSubscribedToCount,
            isSubscribed: 1,
            avatar: 1,
            coverImage,
        }
    });

    if (!channel?.length) throw new ApiError(400, "channel does not exits");

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "User channel fetched successfully"));

});

const getWatchHistory = asyncHandler(async (res, req, next) => {
    const user = await User.aggregate({
        $match: {
            _id: new mongoose.Types.ObjectId(req.user._id)      // give object id instead of string
        }
    }, {
        $lookup: {
            from: "videos",
            localField: "watchHistory",
            foreignField: "_id",
            as: "watchHistory",
            pipeline: {             // nested pipeline / sub pipeline
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
                    pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                username: 1,
                                avatar: 1,
                            }
                        },{
                            $addFields: {
                                owner: {
                                    $first: "$owner"
                                }
                            }
                        }
                    ]
                }
            },
        }
    });

    return res
    .status(200)
    .json(new ApiResponse(200, user[0].watchHistory, "watch history fetched successfully"));

});

export {
    registerUser,
    loginUser,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    updateUserAvatar,
    updateUserCoverImage,
    updateAccountDetails,
    refreshAccessToken,
    getWatchHistory,
    getUserChannelProfile
};

/* user registration steps
get user details from frontend
validation for details username, password, name should not empty or incorrect
check user if already exists by email or username
check for avatar and cover imgage. avatar is required.
check for storage locally by multer and the check for successful upload in cloudnary.
cloudnary gives use url of images.
create a user object. create entry in db.
check for user creation.
remove password, tokens from response and return response to frontend.
*/


/* user login steps
get data from res body
get username or email for login
find the user if exist or not, if not exist throw error not exits else password checking..
generate access, refresh token,
send tokens with sercure cookies
and send response login successful
*/