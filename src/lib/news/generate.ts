import { createAnthropicClient, CONTENT_MODEL } from "@/lib/anthropic";
import type { NewsCategory } from "@/types/database";

const NEWS_SCHEMA = {
  type: "object" as const,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          source_url: { type: "string" },
          category: { type: "string", enum: ["ai", "corporate", "jobs"] },
          published_date: {
            type: "string",
            description: "ISO date (YYYY-MM-DD) of the source article",
          },
        },
        required: ["title", "summary", "source_url", "category", "published_date"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

export type GeneratedNewsItem = {
  title: string;
  summary: string;
  source_url: string;
  category: NewsCategory;
  published_date: string;
};

export async function generateNewsItems(): Promise<GeneratedNewsItem[]> {
  const client = createAnthropicClient();

  const response = await client.messages.create({
    model: CONTENT_MODEL,
    max_tokens: 8192,
    tools: [{ type: "web_search_20260209", name: "web_search" }],
    output_config: {
      format: { type: "json_schema", schema: NEWS_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: `Search the web for 3-5 genuinely current news stories from the last 1-2 days that a product manager would want to know about, across these categories:
- "ai": notable AI model releases, research, or industry shifts relevant to product work
- "corporate": major corporate/business news relevant to tech and product orgs
- "jobs": layoffs, hiring trends, or job-market shifts in tech/product roles

For each item, use a real source URL from your search results, a one-paragraph summary in your own words, and the actual publication date. Prefer a mix across the three categories rather than all one category. Only include stories you actually found via search — do not invent items.`,
      },
    ],
  });

  const jsonBlock = [...response.content].reverse().find((b) => b.type === "text");
  if (!jsonBlock || jsonBlock.type !== "text") {
    throw new Error("No text content returned from model");
  }

  const parsed = JSON.parse(jsonBlock.text) as { items: GeneratedNewsItem[] };
  return parsed.items;
}
