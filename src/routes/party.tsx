import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { TopBar } from "@/components/TopBar";
import { FloatingNav } from "@/components/FloatingNav";
import { Avatar } from "@/components/Avatar";
import { getGroupInfo, endNight } from "@/api/groups.server";
import { getMemberChallenges } from "@/api/challenges.server";
import { getStoredGroupCode, getStoredMemberId, isAuthenticated } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Swords, Store, ShieldOff, Radio } from "lucide-react";
import { useState, useEffect } from "react";




export const Route = createFileRoute("/party")({
  head: () => ({
    meta: [
      { title: "Bounty · Modo Fiesta" },
      { name: "description", content: "La noche está en marcha. Retos, cámara libre y sabotajes en vivo." },
    ],
  }),
  component: Party,
});

function Party() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const groupCode = getStoredGroupCode();
  const memberId = getStoredMemberId();

  if (!isAuthenticated() || !groupCode || !memberId) {
    navigate({ to: "/" });
    return null;
  }

  const { data: groupData } = useQuery({
    queryKey: ["groupInfo", groupCode],
    queryFn: () => getGroupInfo({ data: { code: groupCode! } }),
  });

  const { data: challenges } = useQuery({
    queryKey: ["challenges", memberId, groupCode],
    queryFn: () => getMemberChallenges({ data: { memberId: memberId!, groupCode: groupCode! } }),
  });

  // Temporizador en tiempo real
  const [elapsed, setElapsed] = useState("00:00:00");

  useEffect(() => {
    const startedAt = groupData?.activeEvent?.startedAt;
    if (!startedAt) return;

    const start = new Date(startedAt).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = now - start;
      if (diff < 0) return;
      
      const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, "0");
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, "0");
      const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, "0");
      
      setElapsed(`${h}:${m}:${s}`);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [groupData?.activeEvent?.startedAt]);

  const endNightMutation = useMutation({
    mutationFn: () => endNight({ data: { groupCode: groupCode!, memberId: memberId! } }), // <-- Cambiado a memberId!
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["groupInfo", groupCode] });
      // Redirigimos al NUEVO recap pasándole el ID de la noche que acaba de terminar
      navigate({ to: "/night-recap", search: { eventId: data.eventId } });
    }
  });
  
  const me = groupData?.members.find((m) => m.id === memberId);
  const isAdmin = me?.isAdmin || false;

  const active = challenges?.find((c) => c.status === "available" || c.status === "pending");
  const members = groupData?.members || [];
  const completedCount = challenges?.filter((c) => c.status === "done").length || 0;
  const totalCount = challenges?.length || 5;
  
  // Calcular los puntos reales ganados esta noche
  const nightPoints = challenges?.filter((c) => c.status === "done").reduce((acc, curr) => acc + curr.points, 0) || 0;

  return (
    <PhoneFrame>
      <TopBar title="En directo" />
      <div className="px-5 pb-40">
        <div className="mt-2 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
          </span>
          <span className="text-xs uppercase tracking-[0.25em] text-destructive">Modo Fiesta activo</span>
        </div>
        <h1 className="mt-3 text-[44px] leading-[0.95]">
          La noche es <span className="italic gradient-text">tuya</span>.
        </h1>

        <div className="mt-6 grid grid-cols-6 gap-3">
          {/* Cronómetro Real */}
          <div className="col-span-6 rounded-[28px] p-6 hairline glass">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Arrancó hace
                </div>
                <div className="mt-1 text-4xl font-light tabular-nums">{elapsed}</div>
              </div>
              <div className="flex -space-x-2">
                {members.slice(0, 5).map((m: any) => (
                  <Avatar key={m.id} src={m.avatar} name={m.name} size={32} />
                ))}
              </div>
            </div>
            <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ background: "var(--gradient-party)", width: `${Math.round((completedCount / totalCount) * 100)}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              <span>Retos completados {completedCount}/{totalCount}</span>
              <span className={nightPoints > 0 ? "text-primary font-bold" : ""}>+{nightPoints} pts esta noche</span>
            </div>
          </div>

          {/* Menú de retos y cámara */}
          <Link
            to="/challenges"
            className="col-span-3 relative overflow-hidden rounded-[28px] p-5 transition active:scale-95"
            style={{ background: "var(--gradient-party)" }}
          >
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
            <Swords size={26} />
            <div className="mt-8 text-lg font-medium leading-tight">Menú de retos</div>
            <div className="text-xs text-white/70">5 niveles · re-roll</div>
          </Link>

          <Link
            to="/camera"
            search={{ challengeId: undefined, challengeTitle: undefined }} // <-- AÑADE ESTA LÍNEA
            className="col-span-3 rounded-[28px] bg-card p-5 hairline transition active:scale-95"
          >
            <Camera size={26} />
            <div className="mt-8 text-lg font-medium leading-tight">Cámara libre</div>
            <div className="text-xs text-muted-foreground">Freestyle · sin puntos</div>
          </Link>

          {/* Reto activo */}
          {active ? (
            <Link
              to="/challenge-detail"
              search={{ challengeId: active.id }}
              className="col-span-6 rounded-[28px] p-5 hairline glass transition active:scale-95"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Reto activo · Nivel {active.level}
                </div>
                <div className="rounded-full bg-primary/20 px-3 py-1 text-[10px] uppercase tracking-widest text-primary font-bold">
                  +{active.points} pts
                </div>
              </div>
              <div className="mt-3 text-xl font-medium">{active.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{active.description}</div>
            </Link>
          ) : (
            <div className="col-span-6 rounded-[28px] p-5 hairline glass">
              <div className="text-sm text-muted-foreground text-center py-2">
                No hay retos activos. Revisa los retos disponibles.
              </div>
            </div>
          )}

          {/* Tienda y sabotajes */}
          <Link to="/shop" className="col-span-3 rounded-[28px] bg-card p-5 hairline transition active:scale-95">
            <Store size={22} />
            <div className="mt-6 text-base font-medium">Tienda</div>
            <div className="text-xs text-muted-foreground">Gasta tus puntos</div>
          </Link>

          <Link
            to="/sabotage"
            className="col-span-3 rounded-[28px] p-5 text-white transition active:scale-95"
            style={{ background: "var(--gradient-sabotage)" }}
          >
            <ShieldOff size={22} />
            <div className="mt-6 text-base font-medium">Sabotear</div>
            <div className="text-xs text-white/70">Jode a un amigo</div>
          </Link>

          {/* Feed en vivo (Album Event) */}
          <Link
            to="/album-event"
            search={{ eventId: groupData?.activeEvent?.id || "" }}
            className="col-span-6 flex items-center justify-between rounded-[24px] bg-card px-5 py-4 hairline transition active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-white/5">
                <Radio size={18} />
              </div>
              <div>
                <div className="text-sm font-medium">Feed en vivo del grupo</div>
                <div className="text-xs text-muted-foreground">Álbum de la noche en tiempo real</div>
              </div>
            </div>
            <span className="text-xl text-muted-foreground">›</span>
          </Link>
          {/* BOTÓN DE ACABAR NOCHE (Solo Admin) */}
          {isAdmin && (
            <div className="col-span-6 mt-4">
              <button
                onClick={() => {
                  if (window.confirm("¿Estás seguro de acabar la noche? Se pasará a la fase de votación.")) {
                    endNightMutation.mutate();
                  }
                }}
                disabled={endNightMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-destructive/10 border border-destructive/20 py-5 text-base font-medium text-destructive transition active:scale-95"
              >
                {endNightMutation.isPending ? "Acabando..." : "Terminar Noche y Votar"}
              </button>
            </div>
          )}
        </div>
      </div>
      <FloatingNav />
    </PhoneFrame>
  );
}