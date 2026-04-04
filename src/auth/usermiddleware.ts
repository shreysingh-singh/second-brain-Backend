import jwt from "jsonwebtoken";
import { JWT_SECRECT } from "../config.js";
import type { NextFunction } from "express";

export const usermiddleware = (req: any, res: any, next: NextFunction) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ msg: "No token provided" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRECT) as any;

    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(403).json({ msg: "Invalid token" }); 
  }
};