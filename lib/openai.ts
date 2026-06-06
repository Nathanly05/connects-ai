import OpenAI from "openai";

export const defaultChatModel = process.env.OPENAI_MODEL || "gpt-5-mini";

export function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("请先配置 OPENAI_API_KEY。");
  }

  return new OpenAI({
    apiKey
  });
}
