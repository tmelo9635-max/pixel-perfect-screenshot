import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

const redeQuery = queryOptions({
  queryKey: ["rede"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const meuId = u.user?.id ?? "";
    const [roles, unidades] = await Promise.all([
      supabase.from("user_roles").select("rede_id").eq("user_id", meuId).eq("role", "admin"),
      supabase.from("unidades").select("id, rede_id, nome, cidade, estado").order("nome"),
    ]);
    const minhasRedes = (roles.data ?? []).map((r) => r.rede_id);
    const nomesRedes = minhasRedes.length
      ? (await supabase.from("redes").select("id, nome").in("id", minhasRedes)).data ?? []
      : [];
    return {
      meuId,
      redeId: minhasRedes[0] ?? null,
      nomesRedes,
      unidades: (unidades.data ?? []).filter((x) => minhasRedes.includes(x.rede_id)),
    };
  },
});

export const Route = createFileRoute("/_authenticated/rede")({
  head: () => ({
    meta: [
      { title: "Rede e unidades | Gestão de Leads" },
      { name: "description", content: "Cadastre redes e unidades do franqueado, com cidade e estado." },
      { property: "og:title", content: "Rede e unidades | Gestão de Leads" },
      { property: "og:description", content: "Gestão de redes e unidades." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(redeQuery),
  component: RedePage,
});

const campo =
  "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

function RedePage() {
  const { data } = useSuspenseQuery(redeQuery);
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [novaRede, setNovaRede] = useState("");
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const atualizar = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["rede"] }),
    qc.invalidateQueries({ queryKey: ["leads"] }),
    qc.invalidateQueries({ queryKey: ["eu"] }),
  ]);

  if (!data.redeId) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl space-y-6 p-6">
          <h1 className="text-xl font-semibold">Rede e unidades</h1>
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            Você não é administrador de nenhuma rede. Crie a primeira para começar.
          </p>
          <NovaRedeForm rede={data.redeId} meuId={data.meuId} nome={novaRede} setNome={setNovaRede} onOk={atualizar} />
        </div>
      </AppShell>
    );
  }


  async function cadastrarUnidade(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setOcupado(true);
    const { error } = await supabase.from("unidades").insert({ rede_id: data.redeId!, nome, cidade, estado });
    if (error) setMsg("Não foi possível cadastrar a unidade.");
    else { setNome(""); setCidade(""); setEstado(""); await atualizar(); }
    setOcupado(false);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div>
          <h1 className="text-xl font-semibold">Rede e unidades</h1>
          <p className="text-sm text-muted-foreground">
            {data.nomesRedes.find((r) => r.id === data.redeId)?.nome ?? "Rede"}
          </p>
        </div>

        <form onSubmit={cadastrarUnidade} className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-5">
          <div className="min-w-48 flex-1">
            <label className="mb-1 block text-sm font-medium">Nome da unidade *</label>
            <input required className={campo + " w-full"} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Unidade Centro" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Cidade</label>
            <input className={campo} value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Estado (UF)</label>
            <input maxLength={2} className={campo + " w-20 uppercase"} value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase())} placeholder="SP" />
          </div>
          <button disabled={ocupado} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            Cadastrar unidade
          </button>
        </form>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr><th className="p-3">Unidade</th><th className="p-3">Cidade</th><th className="p-3">Estado</th></tr>
            </thead>
            <tbody>
              {data.unidades.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3 font-medium">{u.nome}</td>
                  <td className="p-3">{u.cidade || "—"}</td>
                  <td className="p-3">{u.estado || "—"}</td>
                </tr>
              ))}
              {data.unidades.length === 0 && (
                <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">Nenhuma unidade cadastrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {msg && <p className="text-sm text-destructive">{msg}</p>}

        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="mb-1 font-semibold">Criar outra rede</h2>
          <p className="mb-3 text-sm text-muted-foreground">Para começar uma nova rede do zero. Você será o administrador dela.</p>
          <NovaRedeForm rede={data.redeId} meuId={data.meuId} nome={novaRede} setNome={setNovaRede} onOk={atualizar} />
        </section>
      </div>
    </AppShell>
  );
}

function NovaRedeForm({ rede, meuId, nome, setNome, onOk }: {
  rede: string | null; meuId: string; nome: string; setNome: (v: string) => void; onOk: () => Promise<unknown>;
}) {
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setOcupado(true);
    const { data: nova, error } = await supabase.from("redes").insert({ nome }).select("id").single();
    if (error || !nova) { setMsg("Não foi possível criar a rede."); setOcupado(false); return; }
    const { error: errRole } = await supabase.from("user_roles").insert({ user_id: meuId, role: "admin", rede_id: nova.id, unidade_id: null });
    if (errRole) setMsg("Rede criada, mas não consegui seu acesso de admin nela.");
    else { setNome(""); setMsg("Rede criada! Você é o administrador dela."); await onOk(); }
    setOcupado(false);
  }

  return (
    <form onSubmit={criar} className="flex flex-wrap items-end gap-3">
      <input required className={campo + " min-w-48 flex-1"} placeholder="Nome da rede" value={nome} onChange={(e) => setNome(e.target.value)} />
      <button disabled={ocupado} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
        Criar rede
      </button>
      {msg && <p className="w-full text-sm text-muted-foreground">{msg}</p>}
    </form>
  );
}
