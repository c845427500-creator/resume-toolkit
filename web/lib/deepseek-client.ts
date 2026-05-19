"use client";

import { buildOptimizePrompt, buildStarExperiencePrompt } from "./prompts";

async function fetchDeepSeek(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.3,
  maxTokens = 4000
): Promise<string | null> {
  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

export async function optimizeResume(
  apiKey: string,
  jdText: string,
  resumeText: string
): Promise<string | null> {
  const { systemPrompt, userPrompt } = buildOptimizePrompt(jdText, resumeText);
  return fetchDeepSeek(apiKey, systemPrompt, userPrompt, 0.3, 4000);
}

export async function generateExperience(
  apiKey: string,
  answers: { situation: string; task: string; action: string; result: string }
): Promise<string | null> {
  const { systemPrompt, userPrompt } = buildStarExperiencePrompt(answers);
  return fetchDeepSeek(apiKey, systemPrompt, userPrompt, 0.7, 500);
}
