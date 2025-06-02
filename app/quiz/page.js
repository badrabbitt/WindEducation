"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MathJax } from "better-react-mathjax";

// === static mock questions ===
const QUESTIONS = [
  {
    id: 1,
    stem: "Giải phương trình bậc hai $x^2 - 5x + 6 = 0$.",
    options: ["x = 2 hoặc x = 3", "x = -2 hoặc x = 3", "x = 1 hoặc x = 6", "Không có nghiệm"],
    correct: [0],
    type: "single"
  },
  {
    id: 2,
    stem: "Chọn tất cả các hàm số **lồi** trên $\\mathbb{R}$.",
    options: ["$f(x)=x^2$", "$f(x)=\\sqrt{x}$", "$f(x)=\\ln x$", "$f(x)=e^x$"],
    correct: [0, 3],
    type: "multi"
  }
];

export default function QuizPage() {
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState([]);
  const [showAns, setShowAns] = useState(false);

  const q = QUESTIONS[idx];

  /* helpers */
  const isCorrect = () => {
    return JSON.stringify(chosen.sort()) === JSON.stringify(q.correct.sort());
  };

  /* events */
  const handleOption = (i) => {
    if (q.type === "single") setChosen([i]);
    else {
      setChosen((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
    }
  };

  const handleNext = () => {
    setChosen([]);
    setShowAns(false);
    setIdx((prev) => Math.min(prev + 1, QUESTIONS.length - 1));
  };

  /* --- render --- */
  return (
    <main className="flex justify-center py-16 px-4">
      <Card className="w-full max-w-3xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">Câu {idx + 1} / {QUESTIONS.length}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MathJax dynamic>{q.stem}</MathJax>
          <Separator />
          <ul className="space-y-2">
            {q.options.map((opt, i) => (
              <li key={i}>
                <Button
                  variant={chosen.includes(i) ? "secondary" : "outline"}
                  onClick={() => handleOption(i)}
                  className="w-full flex justify-start"
                >
                  <span className="mr-2">{String.fromCharCode(65 + i)}.</span>
                  <MathJax dynamic>{opt}</MathJax>
                </Button>
              </li>
            ))}
          </ul>
          {showAns && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm">
              {isCorrect() ? "Chính xác!" : "Chưa đúng."} Đáp án: {q.correct.map((c) => String.fromCharCode(65 + c)).join(", ")}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setShowAns(true)} disabled={showAns || chosen.length === 0}>
            Xem đáp án
          </Button>
          {idx < QUESTIONS.length - 1 ? (
            <Button onClick={handleNext}>Câu tiếp</Button>
          ) : (
            <Button asChild>
              <a href="/result">Hoàn thành</a>
            </Button>
          )}
        </CardFooter>
      </Card>
    </main>
  );
}
