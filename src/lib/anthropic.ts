import Anthropic from "@anthropic-ai/sdk";

export function createAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export const CONTENT_MODEL = "claude-opus-4-8";
