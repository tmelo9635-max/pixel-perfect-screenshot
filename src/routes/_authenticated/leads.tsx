import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const leadsQuery = queryOptions({
  queryKey: ["leads"],
  queryFn: async () => {
    const [leads, unidades, papeis] = await Promise.all([
      supabase.from("leads").select("*").order("criado_em", { ascending: false }),
      supabase.from("unidades").select("*").order("nome"),
      supabase.auth.getUser().then(({ data: u }) =>
        supabase.from("user_roles").select("role, redes(nome), unidades(nome)").eq("user_id", u.user?.id ?? "").order("role")),
    ]);
    if (leads.error) throw leads.error;
    return { leads: leads.data, unidades: unidades.data ?? [], papeis: papeis.data ?? [] };
  },
});

export const Route = createFileRoute("/_authenticated/leads")({
  head: () => ({
    meta: [
      { title: "Leads | Gestão de Leads" },
      { name: "description", content: "Lista de leads da sua rede e unidade com filtros por unidade, status e cidade." },
      { property: "og:title", content: "Leads | Gestão de Leads" },
      { property: "og:description", content: "Acompanhe os leads da sua rede." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(leadsQuery),
  component: LeadsPage,
});

const STATUS = ["Novo", "Em contato", "Visita agendada", "Proposta enviada", "Sem resposta"];
const campo = "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

function LeadsPage() {
  const { data } = useSuspenseQuery(leadsQuery);
  const navigate = useNavigate();
  const [unidade, setUnidade] = useState("");
  const [status, setStatus] = useState("");
  const [cidade, setCidade] = useState("");

  const nomeUnidade = useMemo(() => Object.fromEntries(data.unidades.map((u) => [u.id, u.nome])), [data.unidades]);
  const cidades = useMemo(() => [...new Set(data.leads.map((l) => l.cidade).filter(Boolean))].sort(), [data.leads]);
  const filtrados = data.leads.filter(
    (l) => (!unidade || l.unidade_id === unidade) && (!status || l.status === status) && (!cidade || l.cidade === cidade),
  );
  const papel = data.papeis[0] as { role: string; redes: { nome: string } | null; unidades: { nome: string } | null } | undefined;

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="flex items-center justify-between bg-primary px-6 py-4 text-primary-foreground">
        <div>
          <h1 className="text-xl font-semibold">Leads</h1>
          <p className="text-sm opacity-90">
            {papel
              ? `${papel.role === "admin" ? "Admin" : "Franqueado"} · ${papel.redes?.nome ?? ""}${papel.unidades ? " · " + papel.unidades.nome : ""}`
              : "Sem rede vinculada"}
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link to="/" className="underline">Sugestão com IA</Link>
          {papel?.role === "admin" && <Link to="/equipe" className="underline">Equipe</Link>}
          <button onClick={sair} className="underline">Sair</button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-4 p-6">
        {!papel && (
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            Sua conta ainda não está vinculada a uma rede ou unidade. Peça ao administrador para liberar seu acesso.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <select className={campo} value={unidade} onChange={(e) => setUnidade(e.target.value)}>
            <option value="">Todas as unidades</option>
            {data.unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
          <select className={campo} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {STATUS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select className={campo} value={cidade} onChange={(e) => setCidade(e.target.value)}>
            <option value="">Todas as cidades</option>
            {cidades.map((c) => <option key={c}>{c}</option>)}
          </select>
          {(unidade || status || cidade) && (
            <button onClick={() => { setUnidade(""); setStatus(""); setCidade(""); }} className="text-sm text-primary underline">
              Limpar filtros
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr>
                <th className="p-3">Nome</th><th className="p-3">Telefone</th><th className="p-3">Cidade</th>
                <th className="p-3">Unidade</th><th className="p-3">Interesse</th><th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="p-3 font-medium">{l.nome}</td>
                  <td className="p-3">{l.telefone}</td>
                  <td className="p-3">{l.cidade}</td>
                  <td className="p-3">{nomeUnidade[l.unidade_id] ?? "—"}</td>
                  <td className="p-3">{l.interesse}</td>
                  <td className="p-3"><span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{l.status}</span></td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum lead encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">{filtrados.length} de {data.leads.length} leads</p>
      </div>
    </main>
  );
}
