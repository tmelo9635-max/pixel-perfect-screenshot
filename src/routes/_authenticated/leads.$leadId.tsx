import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { gerarSugestao } from "@/lib/sugestao.functions";

const STATUS = ["Novo", "Em contato", "Visita agendada", "Proposta enviada", "Sem resposta"];

const leadQuery = (id: string) =>
  queryOptions({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data: lead, error } = await supabase.from("leads").select("*").eq("id", id).single();
      if (error) throw error;
      const [anot, perfis, unidade] = await Promise.all([
        supabase
          .from("anotacoes_lead")
          .select("id, autor_id, texto, criado_em")
          .eq("lead_id", id)
          .order("criado_em", { ascending: false }),
        supabase.from("profiles").select("id, email"),
        supabase.from("unidades").select("nome").eq("id", lead.unidade_id).maybeSingle(),
      ]);
      return {
        lead,
        anotacoes: anot.data ?? [],
        emails: Object.fromEntries((perfis.data ?? []).map((p) => [p.id, p.email])) as Record<string, string>,
        unidade: unidade.data?.nome ?? null,
      };
    },
  });

export const Route = createFileRoute("/_authenticated/leads/$leadId")({
  head: () => ({
    meta: [
      { title: "Detalhe do lead | Gestão de Leads" },
      { name: "description", content: "Veja e atualize os dados do lead, anote o que falou e receba uma sugestão de próximo contato com IA." },
      { property: "og:title", content: "Detalhe do lead | Gestão de Leads" },
      { property: "og:description", content: "Histórico do lead e sugestão de próximo contato." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ params, context }) => context.queryClient.ensureQueryData(leadQuery(params.leadId)),
  component: LeadDetalhePage,
});

const campo =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

function LeadDetalhePage() {
  const { leadId } = Route.useParams();
  const { data } = useSuspenseQuery(leadQuery(leadId));
  const qc = useQueryClient();
  const gerar = useServerFn(gerarSugestao);
  const [novoTexto, setNovoTexto] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const [sugestao, setSugestao] = useState("");
  const [gerando, setGerando] = useState(false);
  const [erroSugestao, setErroSugestao] = useState("");

  const { lead, anotacoes, emails, unidade } = data;
  const atualizar = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["lead", leadId] }),
    qc.invalidateQueries({ queryKey: ["leads"] }),
  ]);

  async function trocarStatus(status: string) {
    const { error } = await supabase.from("leads").update({ status }).eq("id", lead.id);
    if (error) { setMsg("Não foi possível salvar o status."); return; }
    await atualizar();
  }

  async function salvarAnotacao(e: React.FormEvent) {
    e.preventDefault();
    if (!novoTexto.trim()) return;
    setSalvando(true); setMsg("");
    const { error } = await supabase.from("anotacoes_lead").insert({ lead_id: lead.id, autor_id: (await supabase.auth.getUser()).data.user?.id ?? "", texto: novoTexto.trim() });
    if (error) { setMsg("Não foi possível salvar a anotação."); } else { setNovoTexto(""); await atualizar(); }
    setSalvando(false);
  }

  async function gerar() {
    setErroSugestao(""); setSugestao(""); setGerando(true);
    try {
      const anotacaoTexto = anotacoes.map((a) => `[${new Date(a.criado_em).toLocaleDateString("pt-BR")}] ${a.texto}`).join("\n");
      const r = await gerar({
        data: {
          nome: lead.nome, telefone: lead.telefone, interesse: lead.interesse,
          status: lead.status, ultimoContato: anotacoes[0] ? anotacoes[0].criado_em.slice(0, 10) : "",
          anotacoes: anotacaoTexto || "Sem anotações anteriores.",
        },
      });
      if (r.ok) setSugestao(r.texto); else setErroSugestao(r.erro);
    } catch {
      setErroSugestao("Não foi possível gerar a sugestão agora.");
    } finally { setGerando(false); }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <Link to="/leads" className="inline-block text-sm text-primary underline">← Voltar aos leads</Link>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">{lead.nome}</h1>
              <p className="text-sm text-muted-foreground">{unidade ?? "Unidade não definida"} · cadastrado em {new Date(lead.criado_em).toLocaleDateString("pt-BR")}</p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Status</span>
              <select className={campo} value={lead.status} onChange={(e) => trocarStatus(e.target.value)}>
                {STATUS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Telefone</dt><dd className="font-medium">{lead.telefone || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Cidade</dt><dd className="font-medium">{lead.cidade || "—"}</dd></div>
            <div><dt className="text-muted-foreground">Interesse</dt><dd className="font-medium">{lead.interesse || "—"}</dd></div>
          </dl>
          {msg && <p className="mt-3 text-sm text-destructive">{msg}</p>}
        </div>

        <section className="rounded-lg border border-border bg-card p-6">
          <h2 className="mb-3 font-semibold">Anotações</h2>
          <form onSubmit={salvarAnotacao} className="mb-5 space-y-2">
            <textarea rows={3} className={campo + " w-full"} placeholder="O que falou com o lead, objeções, próximos passos..." value={novoTexto} onChange={(e) => setNovoTexto(e.target.value)} />
            <button disabled={salvando || !novoTexto.trim()} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              Salvar anotação
            </button>
          </form>
          <ul className="space-y-3">
            {anotacoes.map((a) => (
              <li key={a.id} className="rounded-md border border-border bg-background p-3">
                <p className="text-sm leading-relaxed">{a.texto}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(a.criado_em).toLocaleString("pt-BR")} · {emails[a.autor_id] ?? "—"}
                </p>
              </li>
            ))}
            {anotacoes.length === 0 && <li className="text-sm text-muted-foreground">Nenhuma anotação ainda.</li>}
          </ul>
        </section>

        <section className="rounded-lg border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Sugestão de próximo contato</h2>
            <button onClick={gerar} disabled={gerando} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {gerando ? "Gerando..." : "Gerar sugestão"}
            </button>
          </div>
          {erroSugestao && <p className="mt-3 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{erroSugestao}</p>}
          {!erroSugestao && !sugestao && <p className="mt-3 text-sm text-muted-foreground">{gerando ? "Analisando o lead..." : "Clique em Gerar sugestão para a IA sugerir quando, como e o que falar."}</p>}
          {sugestao && <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{sugestao}</div>}
        </section>
      </div>
    </AppShell>
  );
}
