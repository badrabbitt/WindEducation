// src/routes/auth.js

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
const JWT_EXPIRES_IN = "4h"; // token có hiệu lực 4 giờ; có thể điều chỉnh tùy nhu cầu

// POST /auth/login
// Body: { username, password }
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Vui lòng cung cấp username và password." });
  }

  try {
    // Tìm user theo username
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(401).json({ error: "Username hoặc password không đúng." });
    }

    // So sánh password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Username hoặc password không đúng." });
    }

    // Tạo JWT payload
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    // Ký token
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({
      message: "Đăng nhập thành công.",
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Lỗi khi đăng nhập:", err);
    return res.status(500).json({ error: "Lỗi server." });
  }
});

module.exports = router;
