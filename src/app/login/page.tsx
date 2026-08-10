import { NummiqLogo, NummiqSymbol } from "@/components/brand";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar — Nummiq",
};

// Login institucional (DS §66). Split escuro/prateado, sem mascote.
export default function LoginPage() {
  return (
    <div className="dark min-h-screen bg-nummiq-black text-foreground grid lg:grid-cols-2">
      {/* Lado institucional (desktop) */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-border p-12">
        {/* Composição abstrata prateada, discreta (DS §66/§70) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04]"
          style={{ background: "var(--nq-gradient-metal)" }}
        />
        <NummiqLogo size={34} />
        <div className="max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-nummiq-white">
            Precisão financeira,
            <br />
            <span className="text-metal">sob controle.</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-nummiq-silver">
            Patrimônio, receitas, despesas e metas em uma interface escura,
            sofisticada e silenciosa. Suas finanças com clareza.
          </p>
        </div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-nummiq-muted">
          Inteligência financeira
        </p>
      </div>

      {/* Lado do formulário */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Marca no topo (mobile) */}
          <div className="mb-8 flex justify-center lg:hidden">
            <NummiqLogo size={34} />
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold tracking-tight text-nummiq-white">
              Entrar
            </h2>
            <p className="mt-1 text-sm text-nummiq-silver">
              Acesse sua visão financeira com segurança.
            </p>
          </div>

          <LoginForm />

          <p className="mt-8 flex items-center justify-center gap-2 text-[11px] text-nummiq-muted">
            <NummiqSymbol size={14} />
            Acesso restrito · use suas credenciais cadastradas.
          </p>
        </div>
      </div>
    </div>
  );
}
