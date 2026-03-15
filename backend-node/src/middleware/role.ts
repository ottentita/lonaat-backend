import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

export function authorizeRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes((req.user.role || '').toString())) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
