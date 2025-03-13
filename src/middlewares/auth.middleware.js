import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

// import { User } from "../models/user.model";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token = req.cookies?.accessToken;
    // ||req.header("Authorization")?.replace("Bearer ", "")
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

    req.user = user;
    next();
  } catch (error) {
    //   console.log("for auth ", error);
    //   throw new ApiError(401, error?.message || "Invalid access token");
    next(error);
  }
});

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

// export const verifyJWT = asyncHandler(async (req, res, next) => {
//   try {
//     const accessToken = req.cookies?.accessToken;
//     if (!accessToken) {
//       return handleRefreshToken(req, res, next);
//     }
//     let decodedToken;
//     try {
//       decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
//     } catch (error) {
//       if (error.name === "TokenExpiredError") {
//         return handleRefreshToken(req, res, next);
//       }
//       throw new ApiError(401, "Invalid Access Token");
//     }
//     const user = await User.findById(decodedToken?._id).select(
//       "-password -refreshToken"
//     );
//     if (!user) {
//       throw new ApiError(401, "Invalid Access Token");
//     }
//     req.user = user;
//     next();
//   } catch (error) {
//     next(error);
//   }
// });

// const handleRefreshToken = asyncHandler(async (req, res, next) => {
//   const refreshToken = req.cookies?.refreshToken;
//   if (!refreshToken) {
//     throw new ApiError(401, "No refresh token provided, please log in again");
//   }
//   const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
//   const user = await User.findById(decoded.id);
//   if (!user || user.refreshToken !== refreshToken) {
//     throw new ApiError(403, "Invalid refresh token");
//   }
//   const { accessToken, refreshToken: newRefreshToken } =
//     await generateAccessAndRefereshTokens(user._id);
//   res.cookie("accessToken", accessToken, {
//     httpOnly: true,
//     secure: true,
//     sameSite: "None",
//     maxAge: 1 * 60 * 1000,
//   });
//   res.cookie("refreshToken", newRefreshToken, {
//     httpOnly: true,
//     secure: true,
//     sameSite: "None",
//     // maxAge: 7 * 24 * 60 * 60 * 1000,
//     maxAge: 2 * 60 * 1000,
//   });
//   req.user = user;
//   next();
// });
