import { createAnthropicClient, CONTENT_MODEL } from "@/lib/anthropic";
import { SHOT_TYPE_LABELS, type ShotType } from "@/types/database";

const SHOT_QUESTION_SCHEMA = {
  type: "object" as const,
  properties: {
    domain: {
      type: "string",
      description:
        "Short domain/industry label for the scenario (e.g. 'B2B SaaS', 'ride-sharing'). Empty string if not applicable to this question type.",
    },
    question: { type: "string" },
    answer_markdown: {
      type: "string",
      description:
        "A full, detailed, framework-based answer in markdown with headers, matching the style of a real product-management interview prep resource.",
    },
  },
  required: ["domain", "question", "answer_markdown"],
  additionalProperties: false,
};

type GeneratedShot = {
  domain: string;
  question: string;
  answer_markdown: string;
};

const TYPE_PROMPTS: Record<ShotType, string> = {
  product_sense:
    "Product Sense: design or improve a product for a fresh, specific domain not commonly used in interview prep. Do NOT use food delivery. Pick something distinctive (e.g. elder care, agricultural supply chains, museum ticketing, freight logistics).",
  guesstimate:
    "Guesstimate: a market-sizing question with a fully worked numeric answer showing every assumption and the arithmetic.",
  behavioral:
    "Behavioral: a generic, structured behavioral prompt (e.g. about ambiguity, conflicting stakeholders, incomplete data, a failure) with a STAR-framework model answer that is NOT tied to any specific person's biography — it should read as a template any PM could adapt with their own story.",
  metrics_analytics:
    "Metrics & Analytics: a scenario where a core metric needs to be measured or a drop needs debugging, with a structured diagnostic answer.",
  prioritization:
    "Prioritization: a scenario with several competing feature requests, worked through RICE, ICE, or MoSCoW with a concrete example.",
  root_cause_analysis:
    "Root Cause Analysis: a metric spike or drop scenario requiring structured diagnosis.",
  strategy_gtm:
    "Strategy / GTM: a launch strategy, market entry, or B2B vs B2C positioning question.",
  product_critique:
    "Product Critique: critique a real, named product (any product except food delivery apps) with a structured framework (what it solves, what works, what's broken, prioritized fix).",
};

export async function generateShotQuestion(type: ShotType): Promise<GeneratedShot> {
  const client = createAnthropicClient();

  const response = await client.messages.create({
    model: CONTENT_MODEL,
    max_tokens: 4096,
    output_config: {
      format: { type: "json_schema", schema: SHOT_QUESTION_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: `You are writing content for "Product Shots," a daily product-management practice question app. Write ONE new ${SHOT_TYPE_LABELS[type]} question for today's rotation.

${TYPE_PROMPTS[type]}

The answer must be thorough and genuinely useful for interview prep — use headers, frameworks, and concrete numbers/examples where relevant. Do not reference any specific real person's career history.`,
      },
    ],
  });

  const jsonBlock = response.content.find((b) => b.type === "text");
  if (!jsonBlock || jsonBlock.type !== "text") {
    throw new Error("No text content returned from model");
  }

  const parsed = JSON.parse(jsonBlock.text) as GeneratedShot;
  return parsed;
}
