import { Metadata } from "next";
import StockAnalyzer from "@/components/StockAnalyzer";

export const metadata: Metadata = {
  title: "Indian Stock Analyzer | Fundamental Analysis Tool",
  description: "Interactive fundamental analysis tool for Indian stocks with AI-powered scoring. Analyze P/E, ROE, debt ratios, profit margins for investment decisions.",
  keywords: ["stock analyzer", "Indian stocks", "fundamental analysis", "investment tool"],
  openGraph: {
    type: "website",
    url: "https://productwithrohan.online/projects/stock-analyzer",
    title: "Indian Stock Analyzer",
    description: "Fundamental analysis tool for Indian stocks with AI-powered scoring.",
  },
};

export default function StockAnalyzerPage() {
  return <StockAnalyzer />;
}
