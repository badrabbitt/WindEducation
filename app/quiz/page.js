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
const renderContent = (t) =>
  hasHTML(t) ? (
    <div
      className="break-words whitespace-normal"
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t) }}
    />
  ) : (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeRaw, rehypeKatex]}
      components={{
        inlineMath: ({ value }) => <MathJax dynamic>{`\\(${value}\\)`}</MathJax>,
        math: ({ value }) => <MathJax dynamic>{`\\[${value}\\]`}</MathJax>,
        p: ({ children }) => <p className="break-words whitespace-normal">{children}</p>,
      }}
    >
      {t}
    </ReactMarkdown>
  );

export default function QuizPage() {
  const [q, setQ] = useState(null);
  const [total, setTotal] = useState(0);
  const [chosen, setChosen] = useState([]);
  const [answerRes, setAnswerRes] = useState(null);
  const [hint, setHint] = useState("");
  const [loadingHint, setLoadingHint] = useState(false);
  const [qStart, setQStart] = useState(Date.now());
  const { toast } = useToast();

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

  async function checkAnswer() {
    if (!q) return;
    if (chosen.length === 0 && q.type !== "boolean") {
      toast.warning("You skipped the question!");
      return setAnswerRes({ correct: false });
    }
    try {
      let body;
      if (q.type === "single") {
        body = { questionId: q.id, selectedIndex: chosen[0] };
      } else if (q.type === "multi") {
        body = { questionId: q.id, selectedIndices: chosen };
      } else {
        body = { questionId: q.id, answer: chosen[0] };
      }

      const res = await fetch(`${BACKEND}/api/check-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setAnswerRes(data);

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

  async function next() {
    setTotal((n) => n + 1);
    await fetchNext();
  }

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

  async function finish() {
    // Nếu bạn có biến stat, thay thế đúng ở đây
    // const appear = stat.appear;
    // if (appear) {
    //   await fetch("/api/session-stats", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       appear,
    //       correctPct: +(stat.correct / appear).toFixed(3),
    //       wrongPct: +(stat.wrong / appear).toFixed(3),
    //       skip: stat.skip,
    //       avgTimeMs: Math.round(stat.totalTime / appear),
    //     }),
    //   }).catch(() => {});
    // }
    toast.success("Session saved");
    // Điều hướng sau khi lưu…
  }

  if (!q) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="p-10 text-center">Loading…</p>
      </div>
    );
  }

  const renderCorrect = () => {
    if (!answerRes) return null;
    if (q.type === "single" && answerRes.correctAnswer !== undefined) {
      return String.fromCharCode(65 + answerRes.correctAnswer);
    }
    if (q.type === "multi" && answerRes.correctIndices) {
      return answerRes.correctIndices
        .map((i) => String.fromCharCode(65 + i))
        .join(", ");
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
          <div className="break-words whitespace-normal">
            {renderContent(q.content.question)}
          </div>
          <Separator />

          {q.type !== "boolean"
            ? q.content.answers.map((a, i) => (
                <Button
                  key={i}
                  variant={chosen.includes(i) ? "secondary" : "outline"}
                  className="w-full text-left whitespace-normal break-words mb-2"
                  onClick={() =>
                    setChosen(
                      q.type === "single"
                        ? [i]
                        : chosen.includes(i)
                        ? chosen.filter((x) => x !== i)
                        : [...chosen, i]
                    )
                  }
                >
                  {renderContent(a.content)}
                </Button>
              ))
            : ["True", "False"].map((lbl, i) => (
                <Button
                  key={lbl}
                  variant={chosen[0] === !!i ? "secondary" : "outline"}
                  className="w-full text-left whitespace-normal break-words mb-2"
                  onClick={() => setChosen([!!i])}
                >
                  {lbl}
                </Button>
              ))}

          {hint && (
            <div className="prose prose-sm border p-3 bg-gray-50 rounded break-words whitespace-normal">
              <h4>AI Hint</h4>
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  p: ({ children }) => (
                    <p className="break-words whitespace-normal">{children}</p>
                  ),
                }}
              >
                {hint}
              </ReactMarkdown>
            </div>
          )}

          {answerRes && (
            <div
              className="p-3 text-sm rounded break-words whitespace-normal"
              style={{
                background: answerRes.correct ? "#d1fae5" : "#fde4e4",
              }}
            >
              {answerRes.correct ? "Correct!" : "Incorrect."}
              {renderCorrect() && (
                <>
                  &nbsp;Correct answer:&nbsp;
                  <strong>{renderCorrect()}</strong>
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
          <Button onClick={next} >
            Next
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
