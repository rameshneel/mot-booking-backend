// routes/auth.js
import express from "express";
import {
  refreshToken,
  apiProtect,
} from "../controllers/refreshTokenController.js";
const router = express.Router();

router.post("/refresh-token", refreshToken);
router.get("/check-auth", apiProtect);

export default router;
