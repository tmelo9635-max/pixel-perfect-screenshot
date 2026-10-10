import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | Gestão de Leads" },
      { name: "description", content: "Acesse sua conta para ver os leads da sua rede e unidade." },
      { property: "og:title", content: "Entrar | Gestão de Leads" },
      { property: "og:description", content: "Acesso para franqueados e administradores." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const campo =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "cadastrar" | "recuperar" | "nova-senha">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");
  const [carregando, setCarregando] = useState(false);
  const recuperando = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/leads" });
    });
    const { data } = supabase.auth.onAuthStateChange((ev, s) => {
      if (ev === "PASSWORD_RECOVERY") {
        recuperando.current = true;
        setModo("nova-senha");
        return;
      }
      if (ev === "SIGNED_IN" && s && !recuperando.current) navigate({ to: "/leads" });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setMsg(""); setCarregando(true);
    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) setMsg("E-mail ou senha inválidos.");
    } else if (modo === "cadastrar") {
      const { error } = await supabase.auth.signUp({
        email, password: senha, options: { emailRedirectTo: `${window.location.origin}/leads` },
      });
      setMsg(error ? error.message : "Cadastro feito! Confirme pelo link enviado ao seu e-mail.");
    } else if (modo === "recuperar") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      setMsg(error ? error.message : "Enviamos um link de recuperação ao seu e-mail. Abra o link para definir uma nova senha.");
    } else {
      if (senha.length < 6) { setMsg("A senha precisa ter pelo menos 6 caracteres."); setCarregando(false); return; }
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) setMsg("Não foi possível salvar a nova senha. Tente novamente pelo link do e-mail.");
      else {
        recuperando.current = false;
        navigate({ to: "/leads" });
      }
    }
    setCarregando(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) setMsg("Não foi possível entrar com Google.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-6">
        {modo === "nova-senha" ? (
          <>
            <h1 className="text-xl font-semibold">Definir nova senha</h1>
            <form onSubmit={enviar} className="space-y-3">
              <input type="password" required minLength={6} placeholder="Nova senha" className={campo} value={senha} onChange={(e) => setSenha(e.target.value)} />
              <button disabled={carregando} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                Salvar nova senha
              </button>
            </form>
            {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
          </>
        ) : modo === "recuperar" ? (
          <>
            <h1 className="text-xl font-semibold">Recuperar senha</h1>
            <p className="text-sm text-muted-foreground">Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>
            <form onSubmit={enviar} className="space-y-3">
              <input type="email" required placeholder="E-mail" className={campo} value={email} onChange={(e) => setEmail(e.target.value)} />
              <button disabled={carregando} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                Enviar link de recuperação
              </button>
            </form>
            {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
            <button onClick={() => { setModo("entrar"); setMsg(""); }} className="text-sm text-primary underline">
              Voltar para entrar
            </button>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">{modo === "entrar" ? "Entrar" : "Criar conta"}</h1>
            <form onSubmit={enviar} className="space-y-3">
              <input type="email" required placeholder="E-mail" className={campo} value={email} onChange={(e) => setEmail(e.target.value)} />
              <input type="password" required minLength={6} placeholder="Senha" className={campo} value={senha} onChange={(e) => setSenha(e.target.value)} />
              <button disabled={carregando} className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                {modo === "entrar" ? "Entrar" : "Cadastrar"}
              </button>
            </form>
            <button onClick={google} className="w-full rounded-md border border-input px-4 py-2 text-sm hover:bg-accent">
              Continuar com Google
            </button>
            {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
            <div className="flex justify-between text-sm">
              <button onClick={() => setModo(modo === "entrar" ? "cadastrar" : "entrar")} className="text-primary underline">
                {modo === "entrar" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
              </button>
              {modo === "entrar" && (
                <button onClick={() => { setModo("recuperar"); setMsg(""); }} className="text-primary underline">
                  Esqueci a senha
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
