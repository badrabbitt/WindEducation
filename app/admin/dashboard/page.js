"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/sonner";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Textarea,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  Separator,
} from "@/components/ui";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";import "katex/dist/katex.min.css";
import RichView from "@/components/RichView";
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "";

export default function Dashboard() {
    const router = useRouter();
    const toast = useToast();
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("quiz_admin_token")
        : null;
  
    const [tab, setTab] = useState("bank");
  
    /* -------- Question list (pagination) -------- */
    const [rows, setRows] = useState([]);
    const [page, setPage] = useState(1);
    const pageSize = 5;
    const [total, setTotal] = useState(0);
    const [loadingQ, setLoadingQ] = useState(false);
  
    /* -------- Stats list -------- */
    const [stats, setStats] = useState([]);
    const [loadingS, setLoadingS] = useState(false);
  
    /* -------- Dialog add question -------- */
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({
      stem: "",
      subject: "none",
      type: "single",
    });
    const [answers, setAnswers] = useState(
      Array(4).fill({ content: "", isCorrect: false })
    );
    const [useAI, setUseAI] = useState(false);
  
    /* ==================== FETCH HELPERS ==================== */
    async function authFetch(url, init = {}) {
      if (!token) return router.push("/admin/login");
      const res = await fetch(url, {
        ...init,
        headers: {
          ...(init.headers || {}),
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (res.status === 401) {
        localStorage.removeItem("quiz_admin_token");
        return router.push("/admin/login");
      }
      return res;
    }
  
    /* -------- load questions -------- */
    async function loadPage(p) {
      try {
        setLoadingQ(true);
        const res = await authFetch(
          `${BACKEND}/questions/list?page=${p}&pageSize=${pageSize}`
        );
        const data = await res.json();
        // Sort theo id tăng dần
        const sorted = data.questions.sort((a, b) => a.id - b.id);
        setRows(sorted);
        setTotal(data.total);
      } catch {
        toast.error("Load questions failed");
      } finally {
        setLoadingQ(false);
      }
    }
  
    /* -------- load stats -------- */
    async function loadStats() {
      try {
        setLoadingS(true);
        const res = await authFetch(`${BACKEND}/admin/session-stats`);
        const data = await res.json(); // array
        // Sort theo id tăng dần
        const sorted = data.sort((a, b) => a.id - b.id);
        setStats(sorted);
      } catch {
        toast.error("Load stats failed");
      } finally {
        setLoadingS(false);
      }
    }
  
    /* initial & on page change */
    useEffect(() => {
      if (tab === "bank") loadPage(page);
      if (tab === "stats") loadStats();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, page]);
  
    /* ==================== ADD QUESTION ==================== */
    async function handleSave() {
      if (!form.stem.trim()) return toast.error("Missing question");
      if (form.type !== "boolean") {
        const filled = answers.filter((a) => a.content.trim());
        if (filled.length < 2) return toast.error("Need ≥2 answers");
      }
  
      try {
        const body =
          form.type === "boolean"
            ? {
                content: { question: form.stem, isTrue: answers[0].isCorrect },
                subject: form.subject,
                type: "boolean",
                ai_check: useAI,
              }
            : {
                content: { question: form.stem, answers },
                subject: form.subject,
                type: form.type,
                ai_check: useAI,
              };
  
        const res = await authFetch(`${BACKEND}/questions/questions`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        toast.success(data.message || "Created");
        setOpen(false);
        setForm({ stem: "", subject: "none", type: "single" });
        setAnswers(Array(4).fill({ content: "", isCorrect: false }));
        loadPage(page);
      } catch {
        toast.error("Create failed");
      }
    }
  
    /* ==================== EXPORT CSV ==================== */
    function exportCSV() {
      if (stats.length === 0) return;
      const header = "id,correct_pct,wrong_pct,skip_count,avg_time_ms";
      const csv =
        header +
        "\n" +
        stats
          .map(
            (s) =>
              `${s.id},${s.correct_pct},${s.wrong_pct},${s.skip_count},${s.avg_time_ms}`
          )
          .join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `session-stats-page-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
  
    return (
      <main className="p-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Admin Dashboard</CardTitle>
          </CardHeader>
  
          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="bank">Bank</TabsTrigger>
                <TabsTrigger value="stats">Stats</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
  
              {/* ------------ BANK TAB ------------ */}
              <TabsContent value="bank" className="pt-6">
                <div className="flex justify-between mb-4">
                  <Button onClick={() => setOpen(true)}>Add</Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1 || loadingQ}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </Button>
                    <span className="self-center text-sm">
                      {page}/{maxPage}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === maxPage || loadingQ}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
  
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Question</TableHead>
                        <TableHead>Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((q) => (
                        <TableRow key={q.id}>
                          <TableCell>{q.id}</TableCell>
                          <TableCell>{q.subject}</TableCell>
                          <TableCell className="w-[340px]">
                            <div className="prose prose-sm">
                              {/** 
                                Giả sử `q.question` chứa MathML (ví dụ <math>…</math>) hoặc LaTeX (ví dụ `$x^4-3x^2+x+1$`), ReactMarkdown 
                                kèm remark-math + rehype-katex + rehype-raw sẽ render đúng */}
                              <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeRaw, rehypeKatex]}
                              >
                                {q.question}
                              </ReactMarkdown>
                            </div>
                          </TableCell>
                          <TableCell>{q.type}</TableCell>
                        </TableRow>
                      ))}
                      {!rows.length && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6">
                            {loadingQ ? "Loading…" : "No data"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
  
              {/* ------------ STATS TAB ------------ */}
              <TabsContent value="stats" className="pt-6">
                <div className="flex justify-end mb-2">
                  <Button
                    variant="secondary"
                    onClick={exportCSV}
                    disabled={!stats.length}
                  >
                    Export CSV
                  </Button>
                </div>
  
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Correct %</TableHead>
                        <TableHead>Wrong %</TableHead>
                        <TableHead>Skip</TableHead>
                        <TableHead>Avg&nbsp;Time&nbsp;(ms)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>{s.id}</TableCell>
                          <TableCell>{s.correct_pct}</TableCell>
                          <TableCell>{s.wrong_pct}</TableCell>
                          <TableCell>{s.skip_count}</TableCell>
                          <TableCell>{s.avg_time_ms}</TableCell>
                        </TableRow>
                      ))}
                      {!stats.length && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6">
                            {loadingS ? "Loading…" : "No data"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
  
              {/* ------------ SETTINGS TAB (placeholder) ------------ */}
              <TabsContent
                value="settings"
                className="pt-6 text-center text-muted-foreground"
              >
                <p>Settings coming soon…</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
  
        {/* ------------ ADD QUESTION DIALOG ------------ */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create Question</DialogTitle>
            </DialogHeader>
  
            <div className="grid gap-4 py-4">
              <Textarea
                rows={3}
                placeholder="Question text"
                value={form.stem}
                onChange={(e) => setForm({ ...form, stem: e.target.value })}
              />
  
              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={form.subject}
                  onValueChange={(v) => setForm({ ...form, subject: v })}
                >
                  <SelectTrigger>Subject: {form.subject}</SelectTrigger>
                  <SelectContent>
                    {[
                      "none",
                      "Toan",
                      "Ly",
                      "Hoa",
                      "Sinh",
                      "Van",
                      "Su",
                      "Dia",
                      "TiengAnh",
                    ].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
  
                <Select
                  value={form.type}
                  onValueChange={(v) => {
                    setForm({ ...form, type: v });
                    setAnswers(
                      v === "boolean"
                        ? [{ content: "boolean", isCorrect: false }]
                        : Array(4).fill({ content: "", isCorrect: false })
                    );
                  }}
                >
                  <SelectTrigger>Type: {form.type}</SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">single</SelectItem>
                    <SelectItem value="multi">multi</SelectItem>
                    <SelectItem value="boolean">boolean</SelectItem>
                  </SelectContent>
                </Select>
              </div>
  
              <Separator />
  
              {form.type !== "boolean" ? (
                answers.map((ans, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={ans.isCorrect}
                      onChange={(e) =>
                        setAnswers((arr) =>
                          arr.map((a, i) =>
                            i === idx
                              ? {
                                  content: a.content,
                                  isCorrect:
                                    form.type === "single"
                                      ? true
                                      : e.target.checked,
                                }
                              : form.type === "single"
                              ? { ...a, isCorrect: false }
                              : a
                          )
                        )
                      }
                      className="h-4 w-4"
                    />
                    <Textarea
                      rows={1}
                      placeholder={`Answer ${idx + 1}`}
                      value={ans.content}
                      onChange={(e) =>
                        setAnswers((arr) =>
                          arr.map((a, i) =>
                            i === idx ? { ...a, content: e.target.value } : a
                          )
                        )
                      }
                    />
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={answers[0]?.isCorrect || false}
                    onChange={(e) =>
                      setAnswers([{ content: "boolean", isCorrect: e.target.checked }])
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-sm">
                    Answer is{" "}
                    <b>{answers[0]?.isCorrect ? "True" : "False"}</b>
                  </span>
                </div>
              )}
  
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm select-none">Use AI check</span>
              </div>
            </div>
  
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    );
  }