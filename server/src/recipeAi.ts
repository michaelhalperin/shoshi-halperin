import { z } from "zod";

const parsedRecipeSchema = z.object({
  titleEn: z.string().min(1),
  titleHe: z.string().min(1),
  descriptionEn: z.string().min(1),
  descriptionHe: z.string().min(1),
  ingredientsEn: z.string().min(1),
  ingredientsHe: z.string().min(1),
  stepsEn: z.string().min(1),
  stepsHe: z.string().min(1),
});

export type ParsedRecipeContent = z.infer<typeof parsedRecipeSchema>;

function normalizeLines(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*[-•*]\s*/, "").replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean)
    .join("\n");
}

function normalizePlain(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function isRecipeAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export async function parseRecipeContent(rawText: string): Promise<ParsedRecipeContent> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("AI is not configured");
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error("Recipe content is empty");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You structure recipe content for a bilingual cooking website (English + Hebrew).

Given free-form text that may include ingredients and/or preparation steps in any format or language, return JSON with exactly these keys:
- titleEn: short recipe title in English (no more than ~8 words)
- titleHe: short recipe title in Hebrew
- descriptionEn: 1–2 sentence recipe-card description in English
- descriptionHe: 1–2 sentence recipe-card description in Hebrew
- ingredientsEn: newline-separated ingredient lines in English (one ingredient per line, no bullets or numbers)
- ingredientsHe: newline-separated ingredient lines in Hebrew (one ingredient per line, no bullets or numbers)
- stepsEn: newline-separated preparation steps in English (one step per line, no numbers)
- stepsHe: newline-separated preparation steps in Hebrew (one step per line, no numbers)

Rules:
- Titles and descriptions must stay faithful to the source. Never invent a dish type, flavor, or ingredient that is not in the text (e.g. do not call it "coffee cake" / "עוגת קפה" unless coffee is actually an ingredient or the source explicitly says coffee cake).
- If the source already has a title (often the first line), keep that name and translate it accurately. Example: "עוגה בחושה עם אוכמניות" → titleHe stays that idea, titleEn = "Blueberry Stir Cake" or "Blueberry Pound Cake", NOT "Blueberry Coffee Cake".
- Drop author/chef credits from the title (e.g. "/שושי הלפרין") but keep the dish name.
- Descriptions may be lightly polished, but must only mention flavors and methods present in the recipe.
- Separate ingredients from steps even if the input mixes them or uses headings like "Ingredients" / "Steps" / "לבלילה".
- Keep the real cooking order in steps (mix batter → pour into pan → add toppings → bake → optional finishing). Do not move toppings before pouring into the pan if the source pours first.
- Preserve oven details exactly when present (temperature, turbo/fan, time, toothpick test).
- If only one language is provided, translate naturally to the other language.
- Preserve quantities and measurements accurately.
- Do not include titles, descriptions, or section headings inside ingredientsEn/ingredientsHe/stepsEn/stepsHe.
- Each ingredient/step line must be a complete, self-contained item or step.`,
        },
        {
          role: "user",
          content: trimmed,
        },
      ],
    }),
  });

  const data = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? "AI request failed");
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("AI returned an empty response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI returned invalid JSON");
  }

  const result = parsedRecipeSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("AI returned an incomplete recipe structure");
  }

  return {
    titleEn: normalizePlain(result.data.titleEn),
    titleHe: normalizePlain(result.data.titleHe),
    descriptionEn: normalizePlain(result.data.descriptionEn),
    descriptionHe: normalizePlain(result.data.descriptionHe),
    ingredientsEn: normalizeLines(result.data.ingredientsEn),
    ingredientsHe: normalizeLines(result.data.ingredientsHe),
    stepsEn: normalizeLines(result.data.stepsEn),
    stepsHe: normalizeLines(result.data.stepsHe),
  };
}
