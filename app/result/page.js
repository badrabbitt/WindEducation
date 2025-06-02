import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Result() {
  return (
    <main className="flex justify-center py-20">
      <Card className="w-full max-w-lg text-center shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Bạn đã hoàn thành!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">Điểm của bạn: <span className="font-semibold">8 / 10</span></p>
          <Button asChild size="lg" className="w-full">
            <Link href="/">Làm lại</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}