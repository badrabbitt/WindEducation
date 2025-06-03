/* ------------------------------------------------------------------
   Quiz Page  – Next JS 14  (client component)
   · Lấy câu hỏi từ GET /api/question  (Redis queue)
   · Ghi log mỗi câu POST /api/interactions
   · Cuối phiên gửi POST /api/session-stats
------------------------------------------------------------------*/
"use client";
export const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || ""; 

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import { MathJax } from "better-react-mathjax";
import { useToast } from "@/components/ui/sonner";
import "katex/dist/katex.min.css";

const hasHTML = (t) => /<[^>]+>/.test(t.trim());
const render = (t) =>
  hasHTML(t) ? (
    <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t) }} />
  ) : (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeRaw, rehypeKatex]}
      components={{
        inlineMath: ({ value }) => <MathJax dynamic>{`\\(${value}\\)`}</MathJax>,
        math: ({ value }) => <MathJax dynamic>{`\\[${value}\\]`}</MathJax>,
      }}
    >
      {t}
    </ReactMarkdown>
  );

/* ---------- component ---------- */
export default function QuizPage() {
    /* ---------- state ---------- */
    const [q, setQ] = useState(null);
    const [total, setTotal] = useState(0);
  
    const [chosen, setChosen] = useState([]);
    const [answerRes, setAnswerRes] = useState(null);   // {correct, correctIndices|correctAnswer|correctValue}
    const [hint, setHint] = useState("");
    const [loadingHint, setLoadingHint] = useState(false);
  
    const [qStart, setQStart] = useState(Date.now());
    const { toast } = useToast();
  
    /* ---------- lấy câu hỏi đầu tiên ---------- */
    useEffect(() => {
      fetchNext();
    }, []);
  
    async function fetchNext() {
      try {
        const r = await fetch(`${BACKEND}/api/question`, { cache: "no-store" });
        const { question } = await r.json();
        setQ(question);
        setChosen([]);
        setAnswerRes(null);
        setHint("");
        setQStart(Date.now());
      } catch {
        toast.error("Cannot load question");
      }
    }
  
    /* ---------- gửi đáp án để chấm ---------- */
    async function checkAnswer() {
      if (!q) return;
      if (chosen.length === 0 && q.type !== "boolean") {
        toast.warning("You skipped the question!");
        return setAnswerRes({ correct: false });
      }
      try {
        const body =
          q.type === "single"
            ? { questionId: q.id, selectedIndex: chosen[0] }
            : q.type === "multi"
            ? { questionId: q.id, selectedIndices: chosen }
            : { questionId: q.id, answer: chosen[0] }; // boolean
  
        const res = await fetch(`${BACKEND}/api/check-answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        setAnswerRes(data);
  
        /* log interaction */
        await fetch(`${BACKEND}/api/interactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: q.id,
            correct: data.correct,
            skipped: chosen.length === 0,
            latency: Date.now() - qStart,
          }),
        }).catch(() => {});
  
      } catch {
        toast.error("Check-answer failed");
      }
    }
  
    /* ---------- nút Next ---------- */
    async function next() {
      setTotal((n) => n + 1);
      await fetchNext();
    }
  
  /* ---------- gợi ý AI ---------- */
  async function loadHint() {
    if (loadingHint) return;
    try {
      setLoadingHint(true);
      const r = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stem: q.content.question }),
      });
      if (!r.ok) throw new Error();
      const { markdown } = await r.json();
      setHint(markdown);
    } catch {
      toast.error("AI hint failed");
    } finally {
      setLoadingHint(false);
    }
  }
  
      /* ---------- finish session ---------- */
  async function finish() {
    const appear = stat.appear;
    if (appear) {
      await fetch("/api/session-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appear,
          correctPct: +(stat.correct / appear).toFixed(3),
          wrongPct: +(stat.wrong / appear).toFixed(3),
          skip: stat.skip,
          avgTimeMs: Math.round(stat.totalTime / appear),
        }),
      }).catch(() => {});
    }
    toast.success("Session saved");
    // điều hướng kết quả…
  }
    if (!q) return <p className="p-10 text-center">Loading…</p>;
  
    /* ---------- helper hiển thị đáp án đúng ---------- */
    const renderCorrect = () => {
      if (!answerRes) return null;
      if (q.type === "single" && answerRes.correctAnswer !== undefined) {
        return String.fromCharCode(65 + answerRes.correctAnswer);
      }
      if (q.type === "multi" && answerRes.correctIndices) {
        return answerRes.correctIndices.map((i) => String.fromCharCode(65 + i)).join(", ");
      }
      if (q.type === "boolean" && answerRes.correctValue !== undefined) {
        return answerRes.correctValue ? "True" : "False";
      }
      return "";
    };
    
    return (
      <main className="flex justify-center py-14 px-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Question</CardTitle>
          </CardHeader>
  
          <CardContent className="space-y-4">
            {render(q.content.question)}
            <Separator />
  
            {q.type !== "boolean"
              ? q.content.answers.map((a, i) => (
                  <Button
                    key={i}
                    variant={chosen.includes(i) ? "secondary" : "outline"}
                    className="w-full justify-start mb-2"
                    onClick={() =>
                      setChosen(
                        q.type === "single" ? [i] : chosen.includes(i)
                          ? chosen.filter((x) => x !== i)
                          : [...chosen, i]
                      )
                    }
                  >
                    {render(a.content)}
                  </Button>
                ))
              : ["True", "False"].map((lbl, i) => (
                  <Button
                    key={lbl}
                    variant={chosen[0] === !!i ? "secondary" : "outline"}
                    className="w-full justify-start mb-2"
                    onClick={() => setChosen([!!i])}
                  >
                    {lbl}
                  </Button>
                ))}
  
            {hint && (
              <div className="prose prose-sm border p-3 bg-gray-50 rounded">
                <h4>AI Hint</h4>
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {hint}
                </ReactMarkdown>
              </div>
            )}
  
            {answerRes && (
              <div className="p-3 text-sm rounded "
                   style={{ background: answerRes.correct ? "#d1fae5" : "#fde4e4" }}>
                {answerRes.correct ? "Correct!" : "Incorrect."}
                {renderCorrect() && (
                  <>
                    &nbsp;Correct answer:&nbsp;<strong>{renderCorrect()}</strong>
                  </>
                )}
              </div>
            )}
          </CardContent>
  
          <CardFooter className="flex justify-between gap-3 flex-wrap">
            <div className="flex gap-2">
              <Button variant="secondary" onClick={loadHint} disabled={loadingHint}>
                {loadingHint ? "Loading…" : "AI Hint"}
              </Button>
              <Button
                variant="outline"
                onClick={checkAnswer}
                disabled={chosen.length === 0 || answerRes}
              >
                Submit &amp; Show
              </Button>
            </div>
            <Button onClick={next} disabled={!answerRes}>
              Next
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }