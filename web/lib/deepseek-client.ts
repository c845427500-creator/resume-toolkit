import { buildOptimizePrompt, buildStarExperiencePrompt, buildCardOptimizePrompt, buildSelfEvalPrompt, buildAutoPolishPrompt, buildDirectedPolishPrompt, buildDirectedPolishReasonPrompt } from "./prompts";

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

export interface AiBullet {
  original: string;
  issues: string;
  quantify: string;
  rewritten: string;
  reason: string;
}

export async function optimizeCard(
  apiKey: string,
  cardText: string
): Promise<AiBullet[] | null> {
  const { systemPrompt, userPrompt } = buildCardOptimizePrompt(cardText);
  const result = await fetchDeepSeek(apiKey, systemPrompt, userPrompt, 0.3, 4000);
  if (!result) return null;

  try {
    const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : result.trim();
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) return parsed as AiBullet[];
    return null;
  } catch {
    return null;
  }
}

export async function optimizeSingleBullet(
  apiKey: string,
  bulletText: string
): Promise<AiBullet | null> {
  const { systemPrompt, userPrompt } = buildCardOptimizePrompt(bulletText);
  const result = await fetchDeepSeek(apiKey, systemPrompt, userPrompt, 0.3, 2000);
  if (!result) return null;

  try {
    const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : result.trim();
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed[0] as AiBullet;
    return null;
  } catch {
    return null;
  }
}

export interface AiSelfEval {
  issues: string;
  quantify: string;
  rewritten: string;
  reason: string;
}

export interface PolishReasonResult {
  rewritten: string;
  reason: string;
}

export async function polishText(
  apiKey: string,
  text: string,
  requirement?: string
): Promise<string | null> {
  const { systemPrompt, userPrompt } = requirement
    ? buildDirectedPolishPrompt(text, requirement)
    : buildAutoPolishPrompt(text);
  return fetchDeepSeek(apiKey, systemPrompt, userPrompt, 0.3, 4000);
}

export async function polishTextWithReason(
  apiKey: string,
  text: string,
  requirement: string
): Promise<PolishReasonResult | null> {
  const { systemPrompt, userPrompt } = buildDirectedPolishReasonPrompt(text, requirement);
  const result = await fetchDeepSeek(apiKey, systemPrompt, userPrompt, 0.3, 4000);
  if (!result) return null;

  try {
    const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : result.trim();
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed.rewritten === "string") return parsed as PolishReasonResult;
    return null;
  } catch {
    return null;
  }
}

export async function optimizeSelfEval(
  apiKey: string,
  selfEvalText: string
): Promise<AiSelfEval | null> {
  const { systemPrompt, userPrompt } = buildSelfEvalPrompt(selfEvalText);
  const result = await fetchDeepSeek(apiKey, systemPrompt, userPrompt, 0.3, 4000);
  if (!result) return null;

  try {
    const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : result.trim();
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed.rewritten === "string") return parsed as AiSelfEval;
    return null;
  } catch {
    return null;
  }
}
