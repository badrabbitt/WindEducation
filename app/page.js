// app/page.js
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RocketIcon } from "lucide-react";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center py-20 gap-8 text-center">
      <Card className="w-full max-w-lg shadow-xl rounded-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
            <RocketIcon className="h-7 w-7" /> Hệ thống Ôn thi Đại học
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            Nhấp <span className="font-semibold">“Bắt đầu”</span> để thử bài trắc nghiệm ngẫu nhiên.
          </p>
          <Link href="/quiz">
            <Button size="lg" className="w-full text-lg">Bắt đầu làm bài</Button>
          </Link>
        </CardContent>
      </Card>
      <Link href="/admin/login" className="text-sm underline text-muted-foreground hover:text-primary/80">
        Đăng nhập quản trị viên
      </Link>
    </main>
  );
}
