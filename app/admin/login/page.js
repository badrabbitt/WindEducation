"use client";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/sonner";

export default function AdminLogin() {
  const [user, setUser] = useState("admin");
  const [pass, setPass] = useState("admin");
  const router = useRouter();
  const toast = useToast();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (user === "admin" && pass === "admin") router.push("/admin/dashboard");
    else toast.error("Sai tài khoản hoặc mật khẩu");
  };
  return (
    <main className="flex justify-center py-24">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle>Đăng nhập Admin</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <Input value={user} onChange={(e) => setUser(e.target.value)} placeholder="Tài khoản" required />
            <Input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Mật khẩu" required />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">Đăng nhập</Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
