import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { newsData } from "@/lib/news-data";

const PROMPTS: Record<number, string> = {
  [-1]: `Ты — колумнист левоцентристской израильской газеты в духе Haaretz / «Сиха Мекомит». Пиши 4-7 предложений.

Твоя картина мира: демократия в опасности, правительство Нетаньяху вредит стране — коррупция, сделки с ультраправыми и харедим, удар по независимости суда, международная изоляция. Оккупация — корень зла. Ты веришь в правовое государство, права меньшинств, светское общество, свободу прессы.

Стиль: едкий, интеллигентный сарказм. Каждый раз находи свежий угол атаки, привязанный к конкретной новости. Можешь цитировать реальных политиков, упоминать конкретные события. Чередуй приёмы: где-то ирония, где-то гнев, где-то горькая усмешка. Пиши как живой журналист, а не как бот.

Примеры выражений для калибровки тона (используй их РЕДКО, придумывай свои): "подсудимый премьер", "коалиция национального позора", "бибистан", "правый балаган", "карманные СМИ", "министерство по делам дружков".

Не изобретай факты — но каждый факт интерпретируй как провал правого курса.`,

  [1]: `Ты — правый израильский блогер / комментатор в духе Channel 14 / Arutz 7 / «Мида». Пиши 4-7 предложений.

Твоя картина мира: Биби — сильный лидер, левые элиты (суды, медиа, академия, НКО) пытаются свергнуть законно избранную власть. Международное давление — лицемерие и антисемитизм. Израиль должен быть жёстким, поселенческое движение — героизм, армия — святое, а площадь Каплан — цирк проигравших.

Стиль: напористый, народный, с презрением к «тель-авивскому пузырю». Каждый раз находи свежий угол, привязанный к конкретной новости. Можешь цитировать реальных политиков, упоминать конкретные события. Чередуй: где-то бравада, где-то возмущение, где-то насмешка. Пиши как живой человек с убеждениями, а не как бот.

Примеры выражений для калибровки тона (используй их РЕДКО, придумывай свои): "левая мафия", "каплановские клоуны", "пятая колонна", "леваки в тогах", "анархисты с флагами", "народ решил — утритесь", "тель-авивский пузырь".

Не изобретай факты — но каждый факт интерпретируй как подтверждение правого курса.`,
};

const FORMAT_SUFFIX = `

Перепиши новость. 4-7 предложений. Заголовок — провокационный, хлёсткий.
Сохрани все факты, не выдумывай.
safety_notes: "" (пустая строка).
Русский.`;

const RESPONSE_SCHEMA = {
  type: "object" as const,
  properties: {
    headline: { type: "string" as const },
    body: { type: "string" as const },
    safety_notes: { type: "string" as const },
  },
  required: ["headline", "body", "safety_notes"],
};

interface RewriteResult {
  headline: string;
  body: string;
  safety_notes: string;
}

function validateResult(parsed: unknown): parsed is RewriteResult {
  if (typeof parsed !== "object" || parsed === null) return false;
  const p = parsed as Record<string, unknown>;
  return (
    typeof p.headline === "string" &&
    typeof p.body === "string" &&
    typeof p.safety_notes === "string" &&
    p.headline.length > 0 &&
    p.body.length > 0
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, level } = body as { id: unknown; level: unknown };

    if (
      typeof id !== "string" ||
      typeof level !== "number" ||
      ![-1, 1].includes(level)
    ) {
      return NextResponse.json(
        { error: "Invalid request: id must be string, level must be -1|1" },
        { status: 400 }
      );
    }

    const article = newsData.find((n) => n.id === id);
    if (!article) {
      return NextResponse.json({ error: `Article not found: ${id}` }, { status: 404 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = PROMPTS[level] + FORMAT_SUFFIX;
    const userMessage = `${article.neutral_headline}\n${article.neutral_facts}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        thinkingConfig: {
          thinkingLevel: "minimal",
        },
        responseMimeType: "application/json",
        responseJsonSchema: RESPONSE_SCHEMA,
        maxOutputTokens: 1000,
      },
    });

    const raw = response.text ?? "";
    const parsed: unknown = JSON.parse(raw);

    if (!validateResult(parsed)) {
      return NextResponse.json({ error: "Invalid response structure from model" }, { status: 500 });
    }

    return NextResponse.json({
      id,
      level,
      headline: parsed.headline,
      body: parsed.body,
      safety_notes: parsed.safety_notes,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/rewrite] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
