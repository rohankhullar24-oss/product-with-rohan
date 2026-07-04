export type ShotType =
  | "product_sense"
  | "guesstimate"
  | "behavioral"
  | "metrics_analytics"
  | "prioritization"
  | "root_cause_analysis"
  | "strategy_gtm"
  | "product_critique";

export const SHOT_TYPES: ShotType[] = [
  "product_sense",
  "guesstimate",
  "behavioral",
  "metrics_analytics",
  "prioritization",
  "root_cause_analysis",
  "strategy_gtm",
  "product_critique",
];

export const SHOT_TYPE_LABELS: Record<ShotType, string> = {
  product_sense: "Product Sense",
  guesstimate: "Guesstimate",
  behavioral: "Behavioral",
  metrics_analytics: "Metrics & Analytics",
  prioritization: "Prioritization",
  root_cause_analysis: "Root Cause Analysis",
  strategy_gtm: "Strategy / GTM",
  product_critique: "Product Critique",
};

export type NewsCategory = "ai" | "corporate" | "jobs";

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  source_url: string | null;
  category: NewsCategory;
  published_date: string;
  created_at: string;
};

export type ShotQuestion = {
  id: string;
  type: ShotType;
  domain: string | null;
  question: string;
  answer_markdown: string;
  created_at: string;
};
