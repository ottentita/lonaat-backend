import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { deductTokens } from "../services/token.service";

export function requireTokens(amount: number) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Admin bypass: unlimited tokens
      if (req.user.isAdmin) {
        return next();
      }

      await deductTokens(Number(req.user.id), amount);
      next();
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  };
}
