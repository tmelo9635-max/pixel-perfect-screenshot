import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const item =
  "block rounded-md px-3 py-2 text-sm text-primary-foreground/85 hover:bg-white/10 hover:text-primary-foreground transition-colors";

export function AppShell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["eu"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const meuId = u.user?.id ?? "";
      const papeis = await supabase
        .from("user_roles")
        .select("role, redes(nome), unidades(nome)")
        .eq("user_id", meuId)
        .order("role");
      return { email: u.user?.email ?? "", papeis: (papeis.data ?? []) as Papel[] };
    },
  });

  type Papel = { role: string; redes: { nome: string } | null; unidades: { nome: string } | null };
  const admin = data?.papeis.some((p) => p.role === "admin") ?? false;
  const papel = data?.papeis[0];

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col bg-primary text-primary-foreground sm:flex">
        <div className="px-5 py-5">
          <p className="text-base font-semibold">Gestão de Leads</p>
          <p className="mt-1 text-xs text-primary-foreground/70">
            {papel
              ? `${papel.role === "admin" ? "Admin" : "Franqueado"} · ${papel.redes?.nome ?? ""}${papel.unidades ? " · " + papel.unidades.nome : ""}`
              : "Sem rede vinculada"}
          </p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          <Link to="/leads" activeProps={{ className: cn(item, "bg-white/15 text-primary-foreground") }} className={item}>
            Leads
          </Link>
          <Link to="/" activeProps={{ className: cn(item, "bg-white/15 text-primary-foreground") }} className={item}>
            Sugerir contato com IA
          </Link>
          {admin && (
            <>
              <Link to="/equipe" activeProps={{ className: cn(item, "bg-white/15 text-primary-foreground") }} className={item}>
                Equipe
              </Link>
              <Link to="/rede" activeProps={{ className: cn(item, "bg-white/15 text-primary-foreground") }} className={item}>
                Rede e unidades
              </Link>
            </>
          )}
        </nav>
        <div className="space-y-2 border-t border-white/15 px-5 py-4">
          <p className="truncate text-xs text-primary-foreground/70">{data?.email}</p>
          <button onClick={sair} className="text-sm underline-offset-2 hover:underline">
            Sair
          </button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 bg-primary px-4 py-3 text-primary-foreground sm:hidden">
          <p className="font-semibold">Gestão de Leads</p>
          <nav className="flex gap-3 text-sm">
            <Link to="/leads" className="underline">Leads</Link>
            <Link to="/" className="underline">IA</Link>
            {admin && <Link to="/rede" className="underline">Rede</Link>}
            <button onClick={sair} className="underline">Sair</button>
          </nav>
        </header>
        <main className="min-w-0 flex-1 bg-background">{children}</main>
      </div>
    </div>
  );
}
