// prisma/seed.js

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const username = "admin";
  const rawPassword = "admin";

  // Kiểm tra nếu user "admin" đã tồn tại thì bỏ qua
  const existing = await prisma.user.findUnique({
    where: { username },
  });

  if (existing) {
    console.log("User admin đã tồn tại, không tạo lại.");
    return;
  }

  // Mã hóa mật khẩu
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  // Tạo tài khoản admin
  await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log("Đã tạo tài khoản admin / admin");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
