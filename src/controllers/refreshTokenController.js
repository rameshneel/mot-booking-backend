import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found."); // Using ApiError
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    ); // Using ApiError
  }
};

export const refreshToken = asyncHandler(async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    console.log("refreshToken", refreshToken);

    if (!refreshToken) {
      return res.status(401).json(new ApiError(401, "Refresh token not found"));
    }
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.id);
    console.log("user", user);

    if (!user) {
      return res.status(403).json(new ApiError(403, "User not found"));
    }
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefereshTokens(user._id);

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 2 * 60 * 1000,
    });

    res.json(
      new ApiResponse(
        200,
        { authenticated: true },
        "Token refreshed successfully"
      )
    );
  } catch (error) {
    console.error("Error in refreshToken:", error);
    res.status(403).json(new ApiError(403, "Invalid refresh token"));
  }
});

export const apiProtect = asyncHandler(async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;
    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ApiError(401, "Invalid Access Token");
    }
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { authenticated: true },
          "User authenticated successfully"
        )
      );
  } catch (error) {
    next(error);
  }
});

// // refreshTokenController.js
// import jwt from "jsonwebtoken";
// import { User } from "../models/user.model.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import { ApiError } from "../utils/ApiError.js";
// import { ApiResponse } from "../utils/ApiResponse.js";

// const generateAccessAndRefereshTokens = async (userId) => {
//   try {
//     const user = await User.findById(userId);
//     const accessToken = user.generateAccessToken();
//     const refreshToken = user.generateRefreshToken();

//     user.refreshToken = refreshToken;
//     await user.save({ validateBeforeSave: false });

//     return { accessToken, refreshToken };
//   } catch (error) {
//     throw new ApiError(
//       500,
//       "Something went wrong while generating referesh and access token"
//     );
//   }
// };

// export const refreshToken = asyncHandler(async (req, res) => {
//   try {
//     const refreshToken = req.cookies.refreshToken;
//     if (!refreshToken) {
//       return res.status(401).json({ message: "Refresh token not found" });
//     }
//     const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
//     const user = await User.findById(decoded.id);

//     if (!user) {
//       return res.status(403).json({ message: "User not found" });
//     }
//     const { accessToken, refreshToken: newRefreshToken } =
//       await generateAccessAndRefereshTokens(user._id);

//     res.cookie("accessToken", accessToken, {
//       httpOnly: true,
//       secure: true,
//       sameSite: "None",
//       maxAge: 2 * 60 * 1000,
//     });

//     res.json({ message: "Token refreshed successfully" });
//   } catch (error) {
//     console.error("Error in refreshToken:", error);
//     res.status(403).json({ message: "Invalid refresh token" });
//   }
// });
// export const apiProtect = asyncHandler(async (req, res, next) => {
//   try {
//     const token = req.cookies?.accessToken;
//     if (!token) {
//       throw new ApiError(401, "Unauthorized request");
//     }
//     const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
//     const user = await User.findById(decodedToken?._id).select(
//       "-password -refreshToken"
//     );
//     if (!user) {
//       throw new ApiError(401, "Invalid Access Token");
//     }
//     res.status(200).json({
//       authenticated: true,
//       message: "User authenticated successfully",
//     });
//   } catch (error) {
//     next(error);
//   }
// });
