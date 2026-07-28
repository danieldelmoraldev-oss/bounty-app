import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { TopBar } from "@/components/TopBar";
import { FloatingNav } from "@/components/FloatingNav";
import { getMemberChallenges, rerollChallenge } from "@/api/challenges.server";
import { getGroupInfo } from "@/api/groups.server"; 
import { pokeAdmin } from "@/api/notifications.server";
import { getStoredGroupCode, getStoredMemberId, isAuthenticated } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Lock, Dices, Check, Clock } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/challenges")({
  head: () => ({
    meta: [
      { title: "Bounty · Menú de Retos" },
      { name: "description", content: "5 niveles de retos. Empieza fácil, escala al infierno." },
    ],
  }),
  component: Challenges,
});

const levelColors = ["", "oklch(0.75 0.15 155)", "oklch(0.75 0.18 55)", "oklch(0.68 0.2 25)", "oklch(0.65 0.22 340)", "oklch(0.6 0.24 15)"];

function Challenges() {
  const navigate = useNavigate();
  const groupCode = getStoredGroupCode();
  const memberId = getStoredMemberId();

  if (!isAuthenticated() || !groupCode || !memberId) {
    navigate({ to: "/" });
    return null;
  }

  const { data: challenges, isLoading, refetch } = useQuery({
    queryKey: ["challenges", memberId, groupCode],
    queryFn: () => getMemberChallenges({ data: { memberId: memberId!, groupCode: groupCode! } }),
  });

  const { data: groupData } = useQuery({
    queryKey: ["groupInfo", groupCode],
    queryFn: () => getGroupInfo({ data: { code: groupCode! } }),
    enabled: !!groupCode,
  });

  const pokeMutation = useMutation({
    mutationFn: () => pokeAdmin({ data: { memberId: memberId!, groupCode: groupCode! } }),
  });


  const [rerolling, setRerolling] = useState<string | null>(null);
  const [rerollError, setRerollError] = useState("");

  const handleReroll = async (challengeId: string) => {
    setRerolling(challengeId);
    setRerollError("");
    try {
      await rerollChallenge({ data: { challengeId, memberId: memberId! } });
      refetch();
    } catch (err: any) {
      setRerollError(err.message);
    } finally {
      setRerolling(null);
    }
  };
  // --- NUEVO: PANTALLA DE BLOQUEO SI NO HAY FIESTA ---
  if (groupData && !groupData.isLiveMode) {
    const isAdmin = groupData.members.find((m) => m.id === memberId)?.isAdmin;
    
    return (
      <PhoneFrame>
        <TopBar back="/dashboard" title="Retos bloqueados" />
        <div className="flex h-[75vh] flex-col items-center justify-center px-5 text-center animate-in fade-in">
          <div className="mb-6 grid h-20 w-20 place-items-center rounded-full bg-white/5 text-muted-foreground">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-medium">Modo Fiesta apagado</h2>
          <p className="mt-2 max-w-[260px] text-sm text-muted-foreground">
            Los retos están bloqueados. La noche tiene que estar activa para poder ganar puntos.
          </p>

          {isAdmin ? (
            <button 
              onClick={() => navigate({ to: "/dashboard" })} 
              className="mt-8 w-full rounded-3xl py-4 text-sm font-medium text-white shadow-[0_10px_40px_-10px_rgba(124,58,237,0.5)] transition active:scale-95" 
              style={{ background: "var(--gradient-party)" }}
            >
              Ir a Empezar la Noche
            </button>
          ) : (
            <button 
              onClick={() => pokeMutation.mutate()}
              disabled={pokeMutation.isPending || pokeMutation.isSuccess}
              className="mt-8 w-full rounded-3xl bg-white/10 py-4 text-sm font-medium text-white transition active:scale-95 disabled:scale-100 disabled:opacity-50"
            >
              {pokeMutation.isSuccess ? "¡Aviso enviado al admin!" : pokeMutation.isPending ? "Avisando..." : "Dar un toque al Admin"}
            </button>
          )}
        </div>
        <FloatingNav />
      </PhoneFrame>
    );
  }
  // ---------------------------------------------------

  return (
    <PhoneFrame>
      <TopBar back="/party" title="Modo Fiesta" />
      <div className="px-5 pb-40">
        <h1 className="mt-2 text-4xl leading-tight">Retos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Desbloquea niveles completando el anterior. El 5 es <span className="text-foreground">infame</span>.
        </p>

        <div className="mt-6 flex items-center gap-2 rounded-2xl bg-card p-2 hairline">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className="flex-1 rounded-xl px-2 py-2 text-center text-xs"
              style={{
                background: n === 1 ? "color-mix(in oklab, white 6%, transparent)" : "transparent",
                color: n === 1 ? "white" : "oklch(0.68 0.02 270)",
              }}
            >
              <div className="text-[10px] uppercase tracking-widest">Nvl</div>
              <div className="text-base font-medium" style={{ color: levelColors[n] }}>
                {n}
              </div>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="mt-6 text-center text-sm text-muted-foreground">Cargando retos...</div>
        ) : (
          <div className="mt-6 space-y-3">
            {challenges?.map((c) => {
              const locked = c.status === "locked";
              return (
                <Link
                  key={c.id}
                  to="/challenge-detail"
                  search={{ challengeId: c.id }}
                  className={`relative block overflow-hidden rounded-3xl p-5 ${
                    locked ? "bg-card/60" : "bg-card"
                  } hairline`}
                >
                  {locked && (
                    <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
                      <div className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs">
                        <Lock size={12} /> Completa el nivel {c.level - 1}
                      </div>
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest"
                          style={{
                            background: `color-mix(in oklab, ${levelColors[c.level]} 15%, transparent)`,
                            color: levelColors[c.level],
                          }}
                        >
                          Nivel {c.level}
                        </span>
                        <span className="text-xs text-muted-foreground">+{c.points} pts</span>
                      </div>
                      <div className="mt-3 text-lg font-medium">{c.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{c.description}</div>
                    </div>
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/5">
                      {c.status === "done" ? (
                        <Check size={16} />
                      ) : c.status === "pending" ? (
                        <Clock size={16} />
                      ) : (
                        <span>›</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {challenges && challenges.find((c) => c.status === "available") && (
          <button
            onClick={() => {
              const available = challenges.find((c) => c.status === "available");
              if (available) handleReroll(available.id);
            }}
            disabled={rerolling !== null}
            className="mt-6 glass flex w-full items-center justify-center gap-2 rounded-3xl py-4 text-sm disabled:opacity-50"
          >
            <Dices size={16} /> {rerolling ? "Cambiando reto..." : "Re-roll reto activo · 80 pts"}
          </button>
        )}

        {rerollError && (
          <div className="mt-2 text-center text-xs text-destructive">{rerollError}</div>
        )}
      </div>
      <FloatingNav />
    </PhoneFrame>
  );
}