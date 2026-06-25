import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  channel: z.enum(["email", "sms"]),
  scene: z.string().min(1).max(40),
  tone: z.enum(["formal", "friendly", "concise"]).default("friendly"),
  language: z.enum(["zh", "en"]).default("zh"),
  extra: z.string().max(500).optional(),
  /** 我方公司 / 个人 信息（供 system prompt 参考） */
  myCompany: z.string().max(120).optional(),
  myName: z.string().max(40).optional(),
  /** 示例收件方（用于让模型知道占位符的语义） */
  sampleEnterprise: z.string().max(120).optional(),
});

export const generateAiContent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured");

    const isEmail = data.channel === "email";
    const langName = data.language === "zh" ? "中文" : "English";
    const toneMap = { formal: "正式商务", friendly: "友好诚恳", concise: "简洁直接" } as const;

    const systemPrompt = [
      `你是一名资深 B2B 外贸出海销售文案专家，正在为「${data.myCompany ?? "我方公司"}」撰写${
        isEmail ? "开发/跟进邮件" : "营销短信"
      }。`,
      `语言: ${langName}；语气: ${toneMap[data.tone]}。`,
      `在文案中合理使用以下占位符（保留花括号原样，发送时会被替换）：`,
      `{企业名} {联系人名} {行业} {城市} {我的公司} {我的姓名}`,
      isEmail
        ? `严格输出 JSON：{"subject": "邮件主题（≤60字）","content": "邮件正文（纯文本，含换行）"}。不要解释，不要 Markdown。`
        : `严格输出 JSON：{"content": "短信内容（${data.language === "zh" ? "≤140 字" : "≤300 chars"}，不含署名和退订）"}。不要解释，不要 Markdown。`,
    ].join("\n");

    const userPrompt = [
      `场景: ${data.scene}`,
      data.extra ? `补充要求: ${data.extra}` : "",
      data.sampleEnterprise ? `示例目标客户: ${data.sampleEnterprise}` : "",
      data.myName ? `落款署名: ${data.myName}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      if (resp.status === 429) throw new Error("AI 调用频繁，请稍后再试");
      if (resp.status === 402) throw new Error("AI 额度不足，请联系管理员充值");
      throw new Error(`AI 生成失败：${resp.status} ${text.slice(0, 200)}`);
    }
    const json = (await resp.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    let parsed: { subject?: string; content?: string } = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      // 兜底：模型未严格输出 JSON 时，把全文当作正文
      parsed = { content: raw };
    }
    return {
      subject: isEmail ? parsed.subject ?? "" : undefined,
      content: parsed.content ?? "",
    };
  });