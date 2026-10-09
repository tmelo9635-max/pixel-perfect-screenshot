import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { gerarSugestao } from "@/lib/sugestao.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Próximo contato com IA | Gestão de Leads" },
      { name: "description", content: "Informe os dados e anotações do lead e receba uma sugestão personalizada de próximo contato." },
      { property: "og:title", content: "Próximo contato com IA | Gestão de Leads" },
      { property: "og:description", content: "Sugestões personalizadas de próximo contato para franqueados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const campo =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

function Index() {
  const gerar = useServerFn(gerarSugestao);
  const [form, setForm] = useState({
    nome: "", telefone: "", interesse: "", status: "Novo", ultimoContato: "", anotacoes: "",
  });
  const [carregando, setCarregando] = useState(false);
  const [sugestao, setSugestao] = useState("");
  const [erro, setErro] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setSugestao(""); setCarregando(true);
    try {
      const r = await gerar({ data: form });
      if (r.ok) setSugestao(r.texto); else setErro(r.erro);
    } catch {
      setErro("Verifique os campos obrigatórios e tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="bg-primary px-6 py-5 text-primary-foreground">
        <h1 className="text-xl font-semibold">Sugestão de próximo contato</h1>
        <p className="text-sm opacity-90">Informe os dados do lead e suas anotações. A IA sugere quando, como e o que falar.</p>
      </header>
      <div className="mx-auto grid max-w-5xl gap-6 p-6 md:grid-cols-2">
        <form onSubmit={enviar} className="space-y-4 rounded-lg border border-border bg-card p-5">
          <div>
            <label className="mb-1 block text-sm font-medium">Nome do lead *</label>
            <input required className={campo} value={form.nome} onChange={set("nome")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Telefone</label>
              <input className={campo} value={form.telefone} onChange={set("telefone")} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Status</label>
              <select className={campo} value={form.status} onChange={set("status")}>
                {["Novo", "Em contato", "Visita agendada", "Proposta enviada", "Sem resposta"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Interesse</label>
              <input className={campo} placeholder="Ex.: plano anual" value={form.interesse} onChange={set("interesse")} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Último contato</label>
              <input type="date" className={campo} value={form.ultimoContato} onChange={set("ultimoContato")} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Anotações *</label>
            <textarea required rows={6} className={campo} placeholder="O que o lead disse, objeções, horários preferidos..." value={form.anotacoes} onChange={set("anotacoes")} />
          </div>
          <button disabled={carregando} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {carregando ? "Gerando sugestão..." : "Gerar sugestão"}
          </button>
        </form>
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-3 font-semibold">Sugestão</h2>
          {erro && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{erro}</p>}
          {!erro && !sugestao && <p className="text-sm text-muted-foreground">{carregando ? "Analisando o lead..." : "A sugestão aparecerá aqui."}</p>}
          {sugestao && <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{sugestao}</div>}
        </section>
      </div>
    </main>
  );
}
