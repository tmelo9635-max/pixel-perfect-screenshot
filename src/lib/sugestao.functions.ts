import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LeadSchema = z.object({
  nome: z.string().trim().min(1).max(120),
  telefone: z.string().trim().max(40).optional().default(""),
  interesse: z.string().trim().max(200).optional().default(""),
  status: z.string().trim().max(60).optional().default(""),
  ultimoContato: z.string().trim().max(40).optional().default(""),
  anotacoes: z.string().trim().min(1).max(4000),
});

export type LeadInput = z.input<typeof LeadSchema>;

export const gerarSugestao = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => LeadSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, erro: "IA não configurada." };

    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");

    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const prompt = `Dados do lead:
- Nome: ${data.nome}
- Telefone: ${data.telefone || "não informado"}
- Interesse: ${data.interesse || "não informado"}
- Status atual: ${data.status || "não informado"}
- Último contato: ${data.ultimoContato || "não informado"}

Anotações do franqueado:
${data.anotacoes}`;

    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        system:
          "Você é um consultor comercial que ajuda franqueados a converter leads. Responda em português do Brasil, em Markdown simples, com: 1) **Quando** fazer o próximo contato (prazo concreto), 2) **Canal** recomendado (WhatsApp, ligação, e-mail ou visita) e por quê, 3) **Mensagem sugerida** pronta para enviar, personalizada com o nome e o contexto, 4) **Pontos de atenção** (até 3 itens curtos). Seja direto e prático.",
        prompt,
        providerOptions: {
          openai: {
            store: false,
            forceReasoning: true,
            reasoningEffort: "low",
            reasoningSummary: "auto",
            include: ["reasoning.encrypted_content"],
          },
        },
      });
      const texto = await result.text;
      if (!texto.trim()) return { ok: false as const, erro: "A IA não retornou uma sugestão." };
      return { ok: true as const, texto };
    } catch (e: unknown) {
      const status = (e as { statusCode?: number })?.statusCode;
      console.error(e);
      if (status === 429) return { ok: false as const, erro: "Muitas solicitações. Aguarde um pouco e tente novamente." };
      if (status === 402 || status === 403)
        return { ok: false as const, erro: "Créditos de IA esgotados ou bloqueados no workspace." };
      return { ok: false as const, erro: "Não foi possível gerar a sugestão agora." };
    }
  });
