"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/sonner";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || ""; // .env.example → NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

export default function AdminLogin() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      const res = await fetch(`${BACKEND}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) throw new Error("Invalid credentials");
      const data = await res.json(); // { message, token, user }

      // Lưu token (localStorage / cookie)
      localStorage.setItem("quiz_admin_token", data.token);
      toast.success(data.message || "Đăng nhập thành công");
      router.push("/admin/dashboard");
    } catch (err) {
      toast.error("Sai tài khoản hoặc mật khẩu");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex justify-center py-24">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle>Admin Login</CardTitle>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <Input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
