// src/middleware/auth.js

const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// Middleware kiểm tra JWT cơ bản: nếu token hợp lệ, gán req.user = { id, username, role }
async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "Thiếu header Authorization" });
  }

  // Format: "Bearer <token>"
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "Header Authorization không hợp lệ" });
  }

  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // payload chứa { userId, username, role, iat, exp }
    // Chúng ta có thể kiểm tra thêm trong DB nếu muốn, nhưng ở đây tạm chấp nhận payload
    req.user = {
      id: payload.userId,
      username: payload.username,
      role: payload.role,
    };
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token không hợp lệ hoặc đã hết hạn" });
  }
}

// Middleware kiểm tra role = ADMIN
function authorizeAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Chưa xác thực" });
  }
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Bạn không có quyền truy cập" });
  }
  next();
}

module.exports = {
  authenticateToken,
  authorizeAdmin,
};
