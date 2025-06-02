"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select";
import { MathJax } from "better-react-mathjax";
import { useToast } from "@/components/ui/sonner";

const initBank = [
  { id: 1, subject: "Toán", stem: "$x^2 - 5x + 6 = 0$", type: "single", level: "Nhận biết", appear: 12, correct: 9, wrong: 2, skip: 1, avgTime: "20s" },
  { id: 2, subject: "Toán", stem: "Hàm số $e^x$ lồi trên $\\mathbb{R}$", type: "multi", level: "Thông hiểu", appear: 8, correct: 3, wrong: 4, skip: 1, avgTime: "35s" }
];

export default function Dashboard() {
  const [questions, setQuestions] = useState(initBank);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ stem: "", subject: "Toán", type: "single", level: "Nhận biết" });
  const toast = useToast();

  const handleCreate = () => {
    if (!form.stem.trim()) return toast.error("Thiếu nội dung câu hỏi");
    setQuestions((q) => [...q, { ...form, id: Date.now(), appear: 0, correct: 0, wrong: 0, skip: 0, avgTime: "-" }]);
    setOpen(false);
    setForm({ stem: "", subject: "Toán", type: "single", level: "Nhận biết" });
    toast.success("Đã thêm câu hỏi mới");
  };

  return (
    <main className="p-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Bảng điều khiển</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="bank">
            <TabsList>
              <TabsTrigger value="bank">Ngân hàng câu hỏi</TabsTrigger>
              <TabsTrigger value="stats">Thống kê</TabsTrigger>
              <TabsTrigger value="settings">Cài đặt</TabsTrigger>
            </TabsList>

            <TabsContent value="bank" className="pt-6">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setOpen(true)}>Thêm câu hỏi</Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Môn</TableHead>
                      <TableHead>Câu hỏi</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead>Mức độ</TableHead>
                      <TableHead>Lượt xuất</TableHead>
                      <TableHead>% đúng</TableHead>
                      <TableHead>% sai</TableHead>
                      <TableHead>Bỏ qua</TableHead>
                      <TableHead>Avg time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map((q) => (
                      <TableRow key={q.id} className="align-top">
                        <TableCell>{q.id}</TableCell>
                        <TableCell>{q.subject}</TableCell>
                        <TableCell className="w-[300px]">
                          <MathJax dynamic>{q.stem}</MathJax>
                        </TableCell>
                        <TableCell>{q.type}</TableCell>
                        <TableCell>{q.level}</TableCell>
                        <TableCell>{q.appear}</TableCell>
                        <TableCell>{((q.correct / Math.max(1, q.appear)) * 100).toFixed(0)}%</TableCell>
                        <TableCell>{((q.wrong / Math.max(1, q.appear)) * 100).toFixed(0)}%</TableCell>
                        <TableCell>{q.skip}</TableCell>
                        <TableCell>{q.avgTime}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="stats" className="pt-6 text-center text-muted-foreground">
              <p>Bản demo – biểu đồ thống kê sẽ hiển thị ở đây.</p>
            </TabsContent>

            <TabsContent value="settings" className="pt-6 text-center text-muted-foreground">
              <p>Tùy chọn hệ thống (đang phát triển).</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialog thêm câu hỏi */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Thêm câu hỏi</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <Textarea
              rows={3}
              placeholder="Nội dung câu hỏi – hỗ trợ LaTeX"
              value={form.stem}
              onChange={(e) => setForm({ ...form, stem: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select value={form.subject} onValueChange={(v) => setForm({ ...form, subject: v })}>
                <SelectTrigger>Môn: {form.subject}</SelectTrigger>
                <SelectContent>
                  {['Toán', 'Lý', 'Hoá', 'Sinh', 'Anh'].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>Loại: {form.type}</SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Một đáp án</SelectItem>
                  <SelectItem value="multi">Nhiều đáp án</SelectItem>
                  <SelectItem value="boolean">Đúng/Sai</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger>Mức độ: {form.level}</SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nhận biết">Nhận biết</SelectItem>
                  <SelectItem value="Thông hiểu">Thông hiểu</SelectItem>
                  <SelectItem value="Vận dụng">Vận dụng</SelectItem>
                  <SelectItem value="Vận dụng cao">Vận dụng cao</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Huỷ</Button>
            <Button onClick={handleCreate}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
