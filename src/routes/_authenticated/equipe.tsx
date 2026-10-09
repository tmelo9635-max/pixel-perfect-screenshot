import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const equipeQuery = queryOptions({
  queryKey: ["equipe"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const meuId = u.user?.id ?? "";
    const [roles, unidades, perfis] = await Promise.all([
      supabase.from("user_roles").select("id, user_id, role, rede_id, unidade_id"),
      supabase.from("unidades").select("id, nome, rede_id").order("nome"),
      supabase.from("profiles").select("id, email"),
    ]);
    const todos = roles.data ?? [];
    const redesAdmin = todos.filter((r) => r.user_id === meuId && r.role === "admin").map((r) => r.rede_id);
    return {
      meuId,
      redeId: redesAdmin[0] ?? null,
      roles: todos.filter((r) => redesAdmin.includes(r.rede_id)),
      unidades: (unidades.data ?? []).filter((x) => redesAdmin.includes(x.rede_id)),
      email: Object.fromEntries((perfis.data ?? []).map((p) => [p.id, p.email])) as Record<string, string>,
    };
  },
});

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({
    meta: [
      { title: "Equipe | Gestão de Leads" },
      { name: "description", content: "Vincule e desvincule franqueados e administradores às unidades da rede." },
      { property: "og:title", content: "Equipe | Gestão de Leads" },
      { property: "og:description", content: "Gestão de acessos da rede." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(equipeQuery),
  component: EquipePage,
});

const campo = "rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

function EquipePage() {
  const { data } = useSuspenseQuery(equipeQuery);
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<"franqueado" | "admin">("franqueado");
  const [unidade, setUnidade] = useState("");
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const nomeUnidade = Object.fromEntries(data.unidades.map((u) => [u.id, u.nome]));
  const atualizar = () => Promise.all([qc.invalidateQueries({ queryKey: ["equipe"] }), qc.invalidateQueries({ queryKey: ["leads"] })]);

  if (!data.redeId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
        <div>
          <p className="text-muted-foreground">Apenas administradores da rede podem acessar esta tela.</p>
          <Link to="/leads" className="mt-3 inline-block text-primary underline">Voltar aos leads</Link>
        </div>
      </main>
    );
  }

  async function vincular(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setOcupado(true);
    try {
      const { data: userId } = await supabase.rpc("find_user_by_email", { _email: email });
      if (!userId) { setMsg("Nenhuma conta encontrada com esse e-mail. Peça para a pessoa se cadastrar primeiro."); return; }
      if (papel === "franqueado" && !unidade) { setMsg("Escolha a unidade."); return; }
      if (papel === "franqueado") {
        await supabase.from("user_roles").delete().eq("user_id", userId).eq("rede_id", data.redeId!).eq("role", "franqueado");
      }
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId, role: papel, rede_id: data.redeId!, unidade_id: papel === "franqueado" ? unidade : null,
      });
      if (error) { setMsg(error.code === "23505" ? "Essa pessoa já tem esse papel na rede." : "Não foi possível vincular."); return; }
      setMsg("Vínculo criado. A pessoa já tem acesso à rede."); setEmail("");
      await atualizar();
    } finally { setOcupado(false); }
  }

  async function desvincular(id: string) {
    if (!confirm("Remover este acesso?")) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", id);
    if (error) setMsg("Não foi possível desvincular.");
    await atualizar();
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="flex items-center justify-between bg-primary px-6 py-4 text-primary-foreground">
        <div>
          <h1 className="text-xl font-semibold">Equipe da rede</h1>
          <p className="text-sm opacity-90">Vincule franqueados às unidades ou adicione administradores.</p>
        </div>
        <Link to="/leads" className="text-sm underline">Voltar aos leads</Link>
      </header>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <form onSubmit={vincular} className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-5">
          <div className="flex-1 min-w-56">
            <label className="mb-1 block text-sm font-medium">E-mail da pessoa</label>
            <input type="email" required className={campo + " w-full"} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Papel</label>
            <select className={campo} value={papel} onChange={(e) => setPapel(e.target.value as "franqueado" | "admin")}>
              <option value="franqueado">Franqueado</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          {papel === "franqueado" && (
            <div>
              <label className="mb-1 block text-sm font-medium">Unidade</label>
              <select className={campo} value={unidade} onChange={(e) => setUnidade(e.target.value)}>
                <option value="">Escolha...</option>
                {data.unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
          )}
          <button disabled={ocupado} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            Vincular
          </button>
          {msg && <p className="w-full text-sm text-muted-foreground">{msg}</p>}
        </form>

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-muted-foreground">
              <tr><th className="p-3">E-mail</th><th className="p-3">Papel</th><th className="p-3">Unidade</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {data.roles.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">{data.email[r.user_id] ?? "—"}{r.user_id === data.meuId && " (você)"}</td>
                  <td className="p-3">{r.role === "admin" ? "Administrador" : "Franqueado"}</td>
                  <td className="p-3">{r.unidade_id ? nomeUnidade[r.unidade_id] : "Toda a rede"}</td>
                  <td className="p-3 text-right">
                    {r.user_id !== data.meuId && (
                      <button onClick={() => desvincular(r.id)} className="text-destructive underline">Desvincular</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
