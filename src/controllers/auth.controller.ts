import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../prisma";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

// REGISTER
export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({
      error: "Password must be at least 6 characters"
    });
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return res.status(400).json({ error: "User already exists" });
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, password: hashed }
  });

  res.json({ message: "User created successfully" });
};

// LOGIN
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token });
};

// GET CURRENT USER
export const me = async (req: any, res: Response) => {
  res.json({ user: req.user });
};

// FORGOT PASSWORD
export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = crypto.randomBytes(32).toString("hex");

    await prisma.user.update({
      where: { email },
      data: {
        resetToken: token,
        resetTokenExpiry: new Date(Date.now() + 3600000)
      }
    });

    console.log("RESET TOKEN:", token);
  }

  res.json({
    message: "If an account exists, a reset link has been sent."
  });
};

// RESET PASSWORD
export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() }
    }
  });

  if (!user) {
    return res.status(400).json({ error: "Invalid or expired token" });
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      resetToken: null,
      resetTokenExpiry: null
    }
  });

  res.json({ message: "Password reset successful" });
};
