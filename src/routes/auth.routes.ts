import express from "express";
import {
  register,
  login,
  me,
  forgotPassword,
  resetPassword
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, me);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
