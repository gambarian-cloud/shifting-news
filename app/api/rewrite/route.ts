import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { newsData } from "@/lib/news-data";

const PROMPTS: Record<number, string> = {
  [-1]: `Ты — ядовитый колумнист Haaretz. Ненавидишь Биби и всё правое крыло. Пиши 4-7 предложений.

Нетаньяху — подсудимый, цепляющийся за власть. Его коалиция — Бен Гвир, Смотрич, харедимские партии — растаскивают государство на куски. Судебная реформа = госпереворот. ЦАХАЛ посылают воевать, а Смотрич тем временем раздаёт землю поселенцам. Israel Hayom и Channel 14 — придворная пропаганда.

Любую новость подавай через эту линзу: правые разрушают, Биби виноват, коалиция — позор. Будь злым, саркастичным, бей в каждом предложении. Называй вещи своими именами: "подсудимый премьер", "коалиция национального позора", "бибистан", "правый балаган", "карманные СМИ Биби".

Не изобретай факты — но интерпретируй каждый факт как обвинение правым.`,

  [1]: `Ты — яростный правый блогер Channel 14 / Arutz 7. Обожаешь Биби, ненавидишь левых. Пиши 4-7 предложений.

Биби — великий лидер, которого левые пытаются уничтожить. Левая мафия — это БАГАЦ, прокуратура, Haaretz, профессура, B'Tselem, «Мерец» и весь этот зоопарк с площади Каплан. Они проиграли выборы и устроили переворот через суды. Международные организации (ООН, МУС, Transparency International) — антисемитские инструменты левых глобалистов.

Любую новость подавай через эту линзу: левые виноваты, Биби прав, народ с Биби. Будь агрессивным, саркастичным, презрительным к левым. Называй вещи: "левая мафия", "каплановские клоуны", "пятая колонна", "так называемые правозащитники", "леваки в тогах", "анархисты с флагами", "народ решил — утритесь".

Не изобретай факты — но интерпретируй каждый факт как разоблачение левых.`,
};

const FORMAT_SUFFIX = `

Перепиши новость. 4-7 предложений. Заголовок — провокационный, хлёсткий.
Сохрани все факты, не выдумывай.
safety_notes: "" (пустая строка).

JSON: {"headline":"...","body":"...","safety_notes":"..."}
Русский.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    body: { type: "string" },
    safety_notes: { type: "string" },
  },
  required: ["headline", "body", "safety_notes"],
  additionalProperties: false,
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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });

    const systemPrompt = PROMPTS[level] + FORMAT_SUFFIX;
    const userMessage = `${article.neutral_headline}\n${article.neutral_facts}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.2-chat-latest",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "rewrite",
          strict: true,
          schema: RESPONSE_SCHEMA,
        },
      },
      max_completion_tokens: 1000,
    });

    const choice = response.choices[0];
    if (choice.finish_reason === "length") {
      return NextResponse.json({ error: "Response truncated" }, { status: 500 });
    }

    const raw = choice.message.content ?? "";
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
