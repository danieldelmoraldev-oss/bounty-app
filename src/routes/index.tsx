import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import heroImg from "@/assets/hero-party.jpg";
import { PhoneFrame } from "@/components/PhoneFrame";
import { ArrowRight, ScanLine, Sparkles, Plus } from "lucide-react";
import { useState, useEffect } from "react";
import { isAuthenticated, isInGroup } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bounty · Entra a tu grupo" },
      { name: "description", content: "Escanea un QR o entra con un código de 5 letras. Sin registros." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [error, setError] = useState("");

  // AUTO-LOGIN: Si abres la app y tienes sesión activa, ¡al dashboard directo!
  useEffect(() => {
    if (isAuthenticated() && isInGroup()) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [navigate]);

  const handleCreateRoom = () => {
    if (!groupName.trim() || !adminName.trim()) {
      setError("Completa todos los campos");
      return;
    }
    localStorage.setItem("bounty_temp_name", adminName.trim());
    navigate({ 
      to: "/auth", 
      search: { groupName: groupName.trim(), action: "create", code: undefined } 
    });
  };

  return (
    <PhoneFrame>
      <div className="relative min-h-dvh">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt=""
            width={1200}
            height={1600}
            className="h-full w-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
        </div>

        <div className="relative flex min-h-dvh flex-col px-6 pb-8 pt-10">
          
          {/* CABECERA CON BOTÓN DE INICIAR SESIÓN */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/70">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-white/10 backdrop-blur">
                <Sparkles size={12} />
              </span>
              Bounty
            </div>
            {!showCreate && (
              <Link 
                to="/auth" 
                search={{ action: "login", code: undefined, groupName: undefined }}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] font-medium uppercase tracking-widest text-white/70 backdrop-blur transition hover:bg-white/10 hover:text-white active:scale-95"
              >
                Iniciar Sesión
              </Link>
            )}
          </div>

          <div className="mt-auto">
            {!showCreate ? (
              <>
                <h1 className="mt-8 text-[54px] leading-[0.95] tracking-tight text-white">
                  La liga <span className="italic gradient-text">secreta</span> de tu grupo.
                </h1>
                <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-white/70">
                  Retos, sabotajes y noches que nunca deberían olvidarse. Sin registros,
                  sin extraños. Solo tu gente.
                </p>

                <div className="mt-8 flex flex-col gap-3">
                  <Link
                    to="/join"
                    className="group flex items-center justify-between rounded-3xl px-6 py-5 text-left text-white shadow-[0_20px_60px_-20px_oklch(0.65_0.22_295_/_0.7)]"
                    style={{ background: "var(--gradient-party)" }}
                  >
                    <div>
                      <div className="text-xs uppercase tracking-widest text-white/80">Empieza</div>
                      <div className="text-lg font-medium">Entrar con código</div>
                    </div>
                    <div className="grid h-11 w-11 place-items-center rounded-full bg-white/15 transition group-hover:translate-x-1">
                      <ArrowRight size={18} />
                    </div>
                  </Link>

                  <Link
                    to="/scan"
                    className="glass flex items-center justify-between rounded-3xl px-6 py-5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-white/10">
                        <ScanLine size={18} />
                      </div>
                      <div>
                        <div className="text-sm text-white/60">Rápido</div>
                        <div className="text-base font-medium">Escanear QR</div>
                      </div>
                    </div>
                    <ArrowRight size={18} className="opacity-60" />
                  </Link>
                </div>

                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-3xl border border-white/10 py-4 text-sm text-white/60 transition hover:border-white/30 hover:text-white/90"
                >
                  <Plus size={16} />
                  Crear una sala nueva
                </button>

                <p className="mt-6 text-center text-[11px] uppercase tracking-widest text-white/40">
                  7 amigos · 3 temporadas · 1 perdedor
                </p>
              </>
            ) : (
              <div>
                <button
                  onClick={() => { setShowCreate(false); setError(""); }}
                  className="mb-6 text-xs uppercase tracking-widest text-white/50 hover:text-white/80"
                >
                  ← Volver
                </button>
                <h2 className="text-3xl font-medium text-white">Crear una sala</h2>
                <p className="mt-2 text-sm text-white/60">
                  Ponle nombre a tu grupo y preséntate.
                </p>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-widest text-white/50">
                      Nombre del grupo
                    </label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Ej: Los Descarriados"
                      className="w-full rounded-2xl bg-white/10 px-5 py-4 text-white placeholder:text-white/30 outline-none backdrop-blur"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs uppercase tracking-widest text-white/50">
                      Tu nombre
                    </label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="Ej: Marta"
                      className="w-full rounded-2xl bg-white/10 px-5 py-4 text-white placeholder:text-white/30 outline-none backdrop-blur"
                    />
                  </div>

                  {error && (
                    <div className="text-sm text-destructive">{error}</div>
                  )}

                  <button
                    onClick={handleCreateRoom}
                    className="w-full rounded-3xl py-4 text-sm font-medium text-white transition disabled:opacity-50 active:scale-95"
                    style={{ background: "var(--gradient-party)" }}
                  >
                    Continuar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PhoneFrame>
  );
}