// src/routes/admin.js

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken, authorizeAdmin } = require("../middleware/auth");

const prisma = new PrismaClient();
const router = express.Router();

// Tất cả route trong file này đều cần có cả authenticateToken + authorizeAdmin
router.use(authenticateToken, authorizeAdmin);

// GET /admin/users -> trả về danh sách user (chỉ admin mới xem được)
router.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return res.json({ users });
  } catch (err) {
    console.error("Lỗi khi lấy danh sách user:", err);
    return res.status(500).json({ error: "Lỗi server." });
  }
});

// Ví dụ thêm: GET /admin/protected
router.get("/protected", (req, res) => {
  res.json({
    message: "Đây là trang admin chỉ admin mới truy cập được.",
    yourInfo: req.user, // thông tin token giải mã
  });
});

router.get(
    "/session-stats",
    authenticateToken,
    authorizeAdmin,
    async (req, res) => {
      try {
        const stats = await prisma.sessionStat.findMany({
          select: {
            id:          true,
            correct_pct: true,
            wrong_pct:   true,
            skip_count:  true,
            avg_time_ms: true,
          },
          orderBy: { id: "desc" }, // sắp xếp theo id giảm dần (mới nhất trước) – tuỳ chọn
        });
  
        return res.json(stats);
      } catch (err) {
        console.error("Lỗi GET /admin/session-stats:", err);
        return res.status(500).json({ error: "Lỗi server." });
      }
    }
  );
  

module.exports = router;
