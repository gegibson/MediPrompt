import { NextResponse } from "next/server";

import { buildGuidance, type GuidanceSections } from "@/lib/wizard/engine/buildGuidance";
import type { Answers } from "@/lib/wizard/schema/types";
import { wizardTemplates, type WizardTemplateId } from "@/lib/wizard/templates";

const OPENAI_ENDPOINT = process.env.OPENAI_API_BASE_URL
  ? `${process.env.OPENAI_API_BASE_URL.replace(/\/$/, "")}/chat/completions`
  : "https://api.openai.com/v1/chat/completions";

const DEFAULT_MODEL = process.env.OPENAI_WIZARD_MODEL ?? "gpt-4o-mini";

const normaliseStringArray = (value: unknown, fallback: string[]): string[] => {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const cleaned = value
    .map((item) => (typeof item === "string" ? item.trim() : String(item)))
    .filter((item) => item.length > 0);

  return cleaned.length > 0 ? cleaned : fallback;
};

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const {
    templateId,
    answers,
    role,
    goal,
    redFlags = [],
  } = body as {
    templateId?: WizardTemplateId;
    answers?: Answers;
    role?: string;
    goal?: string;
    redFlags?: string[];
  };

  if (!templateId || typeof templateId !== "string") {
    return NextResponse.json({ error: "templateId is required." }, { status: 400 });
  }

  if (!answers || typeof answers !== "object") {
    return NextResponse.json({ error: "answers are required." }, { status: 400 });
  }

  if (!role || typeof role !== "string") {
    return NextResponse.json({ error: "role is required." }, { status: 400 });
  }

  if (!goal || typeof goal !== "string") {
    return NextResponse.json({ error: "goal is required." }, { status: 400 });
  }

  const template = wizardTemplates[templateId];

  if (!template) {
    return NextResponse.json({ error: "Unknown triage template." }, { status: 404 });
  }

  const plan = buildGuidance({
    template,
    answers,
    role,
    goal,
    redFlags,
  });

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Guidance engine is not configured.",
        sections: plan.fallback,
        payload: {
          systemPrompt: plan.systemPrompt,
          userPrompt: plan.userPrompt,
          model: null,
        },
      },
      { status: 501 },
    );
  }

  let sections: GuidanceSections = plan.fallback;

  try {
    const completionResponse = await fetch(OPENAI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.2,
        messages: [
          { role: "system", content: plan.systemPrompt },
          { role: "user", content: plan.userPrompt },
        ],
        response_format: plan.responseFormat,
      }),
    });

    const completionJson = await completionResponse.json();

    if (!completionResponse.ok) {
      console.error("[Wizard] Guidance completion failed", completionJson);
      return NextResponse.json(
        {
          error: "Guidance model request failed.",
          sections: plan.fallback,
          payload: {
            systemPrompt: plan.systemPrompt,
            userPrompt: plan.userPrompt,
            model: DEFAULT_MODEL,
          },
        },
        { status: 502 },
      );
    }

    let content = completionJson?.choices?.[0]?.message?.content;

    if (Array.isArray(content)) {
      const textPart = content.find((part: { type?: string }) => part.type === "text");
      content = textPart?.text ?? textPart?.content ?? "";
    }

    if (typeof content === "string" && content.trim().length > 0) {
      try {
        const parsed = JSON.parse(content) as Partial<GuidanceSections>;

        sections = {
          title: (parsed.title ?? plan.fallback.title).toString().trim(),
          summary: (parsed.summary ?? plan.fallback.summary).toString().trim(),
          watch_for: normaliseStringArray(parsed.watch_for, plan.fallback.watch_for),
          guidance: normaliseStringArray(parsed.guidance, plan.fallback.guidance),
          doctor_prep: normaliseStringArray(parsed.doctor_prep, plan.fallback.doctor_prep),
          safety_reminder: (parsed.safety_reminder ?? plan.fallback.safety_reminder)
            .toString()
            .trim(),
        };
      } catch (error) {
        console.warn("[Wizard] Unable to parse guidance JSON", error, content);
        sections = plan.fallback;
      }
    }
  } catch (error) {
    console.error("[Wizard] Guidance request error", error);
    return NextResponse.json(
      {
        error: "Guidance model request encountered an error.",
        sections: plan.fallback,
        payload: {
          systemPrompt: plan.systemPrompt,
          userPrompt: plan.userPrompt,
          model: DEFAULT_MODEL,
        },
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    sections,
    payload: {
      systemPrompt: plan.systemPrompt,
      userPrompt: plan.userPrompt,
      model: DEFAULT_MODEL,
    },
  });
}
