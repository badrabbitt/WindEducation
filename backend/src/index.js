// src/index.js

require("dotenv").config();
const express = require("express");
const cors = require("cors");           // <-- import cors
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const questionRoutes = require("./routes/question");
const userRoutes = require("./routes/user");


const app = express();

// 1. Cho phép CORS (mặc định cho tất cả origin)
//    Nếu cần giới hạn origin, thay `cors()` bằng { origin: ["http://localhost:3000"] }
app.use(cors());

// 2. Middleware parse JSON
app.use(express.json());

// 3. Các route
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/questions", questionRoutes);
app.use("/api", userRoutes);


app.get("/", (req, res) => {
  res.json({ message: "Server đang chạy ổn định." });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server đang lắng nghe cổng ${PORT}`);
});
