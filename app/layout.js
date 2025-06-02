// app/layout.jsx
import "./globals.css";
import { Inter } from "next/font/google";
import { MathJaxContext } from "better-react-mathjax";
import { ToasterProvider } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  const mathJaxConfig = {
    loader: { load: ["[tex]/ams", "[tex]/boldsymbol"] },
    tex: {
      packages: { "[+]": ["ams"] },
      inlineMath: [["$", "$"], ["\\(", "\\)"]],
    },
  };

  return (
    <html lang="vi">
      <body
        className={`${inter.className} bg-gradient-to-b from-slate-50 to-slate-100 min-h-screen`}
      >
        <MathJaxContext config={mathJaxConfig}>
          {/* Sonner toaster */}
          <ToasterProvider />
          {children}
        </MathJaxContext>
      </body>
    </html>
  );
}
