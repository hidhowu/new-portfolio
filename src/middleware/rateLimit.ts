import rateLimit from "express-rate-limit";

const isDev = process.env.NODE_ENV !== "production";

// In development: no rate limiting at all — prevents constant lockouts during dev
// In production: strict limits apply
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 0 : 10, // 0 = unlimited in express-rate-limit v7
  skip: () => isDev,
  message: { error: "Too many login attempts. Please wait 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

export const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 0 : 300,
  skip: () => isDev,
  message: { error: "Too many requests." },
  standardHeaders: true,
  legacyHeaders: false,
});
