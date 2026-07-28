import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PhoneFrame } from "@/components/PhoneFrame";
import { TopBar } from "@/components/TopBar";
import { FloatingNav } from "@/components/FloatingNav";
import { Avatar } from "@/components/Avatar";
import { getGroupInfo, startNight, endNight } from "@/api/groups.server";
import { getEvents } from "@/api/events.server";
import { pokeAdmin } from "@/api/notifications.server";
import { getStoredGroupCode, getStoredMemberId, getStoredAvatar, isAuthenticated } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Skull, Flame, TrendingUp, BellRing, PartyPopper, X, Calendar, Plus, Store, ShieldOff } from "lucide-react";
import { avatarOptions } from "@/data/avatars";
import { getTitleForMember } from "@/lib/titles";
import { useState } from "react";


export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Bounty · La Liga" },
      { name: "description", content: "Clasificación de la temporada. Líder, perdedor y el pique en directo." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const groupCode = getStoredGroupCode();
  const currentMemberId = getStoredMemberId();
  const queryClient = useQueryClient();

  if (!isAuthenticated() || !groupCode) {
    navigate({ to: "/" });
    return null;
  }

  const storedAvatar = getStoredAvatar();
  const avatarOption = avatarOptions.find(a => a.emoji === storedAvatar);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["groupInfo", groupCode],
    queryFn: () => getGroupInfo({ data: { code: groupCode! } }),
  });

  // Consultamos los eventos anteriores para el modal del Admin
  const { data: pastEvents } = useQuery({
    queryKey: ["events", groupCode],
    queryFn: () => getEvents({ data: { groupCode: groupCode! } }),
    enabled: !!groupCode,
  });

  const [poked, setPoked] = useState(false);
  
  // Estados para el Modal de Empezar Noche
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState("new");
  const [eventName, setEventName] = useState("");
  
  const pokeMutation = useMutation({
    mutationFn: () => pokeAdmin({ data: { memberId: currentMemberId!, groupCode: groupCode! } }),
    onSuccess: () => {
      if (navigator.vibrate) navigator.vibrate(50);
      setPoked(true);
      setTimeout(() => setPoked(false), 3000);
    }
  });

  // Mutación ajustada para enviar el nombre o el ID del evento
  const startMutation = useMutation({
    mutationFn: () => startNight({ 
      data: { 
        groupCode: groupCode!, 
        memberId: currentMemberId!,
        eventName: selectedEventId === "new" ? eventName : undefined,
        eventId: selectedEventId !== "new" ? selectedEventId : undefined
      } 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupInfo", groupCode] });
      setShowStartModal(false);
      navigate({ to: "/party" });
    }
  });

  if (isLoading) {
    return (
      <PhoneFrame>
        <TopBar title="Cargando..." />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
        <FloatingNav />
      </PhoneFrame>
    );
  }

  if (error || !data) {
    return (
      <PhoneFrame>
        <TopBar title="Error" />
        <div className="flex items-center justify-center min-h-[60vh] px-5">
          <div className="text-destructive text-center">
            <p>Error al cargar el grupo</p>
            <Link to="/" className="mt-4 inline-block rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">
              Volver
            </Link>
          </div>
        </div>
        <FloatingNav />
      </PhoneFrame>
    );
  }

  const { group, members, isLiveMode } = data;
  const leader = members[0];
  const loser = members[members.length - 1];
  const ranking = members;
  
  const me = members.find(m => m.id === currentMemberId);
  const isAdmin = me?.isAdmin || false;

  return (
    <PhoneFrame>
      <TopBar title={group.name} />
      <div className="px-5 pb-40">
        <div className="mt-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {group.season}
          </div>
          <h1 className="mt-1 text-4xl leading-tight">La Liga</h1>
        </div>

        {/* Bento: leader hero + loser + stats */}
        <div className="mt-6 grid grid-cols-6 gap-3">
          <div
            className="col-span-6 relative overflow-hidden rounded-[28px] p-5"
            style={{ background: "var(--gradient-hero)" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/70">
                  <Crown size={14} /> Líder de temporada
                </div>
                <div className="mt-3 flex items-center gap-4">
                  {leader.avatar && !leader.avatar.startsWith("http") && !leader.avatar.startsWith("/") && !leader.avatar.startsWith("data:") ? (
                    <div className={`h-18 w-18 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-5xl`} style={{ width: 72, height: 72 }}>
                      {leader.avatar}
                    </div>
                  ) : (
                    <Avatar src={leader.avatar} name={leader.name} size={72} frame={leader.frame} />
                  )}
                  <div>
                    <div className="text-2xl font-medium">{leader.name}</div>
                    <div className="text-xs text-white/60 italic">"{leader.title || getTitleForMember(1, leader.points, 0, 0)?.name || "Sin título"}"</div>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-light gradient-text">{leader.points}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/50">pts</div>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs text-white/60">
              <TrendingUp size={12} /> +{leader.points} pts esta semana
            </div>
          </div>

          <div className="col-span-4 rounded-[24px] bg-card p-4 hairline">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-destructive/80">
              <Skull size={14} /> Farolillo rojo
            </div>
            <div className="mt-3 flex items-center gap-3">
                {loser.avatar && !loser.avatar.startsWith("http") && !loser.avatar.startsWith("/") && !loser.avatar.startsWith("data:") ? (
                  <div className={`h-11 w-11 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-2xl`} style={{ width: 44, height: 44 }}>
                    {loser.avatar}
                  </div>
                ) : (
                  <Avatar src={loser.avatar} name={loser.name} size={44} />
                )}
              <div>
                <div className="font-medium">{loser.name}</div>
                <div className="text-[11px] text-muted-foreground">Pagará la cena</div>
              </div>
            </div>
          </div>

          <div className="col-span-2 rounded-[24px] bg-card p-4 hairline">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Miembros</div>
            <div className="mt-2 text-3xl font-light">{group.members}</div>
          </div>
        </div>

        {/* ACCIÓN PRINCIPAL DINÁMICA */}
        {isLiveMode ? (
          <div className="mt-4 flex flex-col gap-3 animate-in fade-in">
            <Link
              to="/party"
              className="flex items-center justify-between rounded-[28px] px-6 py-5 text-white shadow-[0_0_40px_-10px_rgba(124,58,237,0.5)] transition active:scale-95"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)" }}
            >
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20">
                  <PartyPopper size={22} className="animate-bounce" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/90">¡En directo!</div>
                  <div className="text-lg font-bold">Entrar a la Fiesta</div>
                </div>
              </div>
              <div className="text-2xl">›</div>
            </Link>

            {isAdmin && (
              <button
                onClick={async () => {
                  if (window.confirm("¿Acabar la noche y pasar a votaciones?")) {
                    await endNight({ data: { groupCode: groupCode!, memberId: currentMemberId! } });
                    navigate({ to: "/voting" });
                  }
                }}
                className="w-full rounded-[24px] border border-destructive/20 bg-destructive/10 py-4 text-sm font-medium text-destructive transition hover:bg-destructive/20 active:scale-95"
              >
                Terminar noche y votar
              </button>
            )}
          </div>
        ) : isAdmin ? (
          <button
            onClick={() => setShowStartModal(true)}
            className="mt-4 w-full flex items-center justify-between rounded-[28px] px-6 py-5 text-white shadow-[0_20px_60px_-20px_oklch(0.65_0.22_295_/_0.7)] transition active:scale-95"
            style={{ background: "var(--gradient-party)" }}
          >
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
                <Flame size={22} />
              </div>
              <div className="text-left">
                <div className="text-xs uppercase tracking-widest text-white/70">Admin</div>
                <div className="text-lg font-medium">Empezar la Noche</div>
              </div>
            </div>
            <div className="text-2xl">›</div>
          </button>
        ) : (
          <button
            onClick={() => pokeMutation.mutate()}
            disabled={pokeMutation.isPending || poked}
            className="mt-4 w-full flex items-center justify-between rounded-[28px] px-6 py-5 text-white shadow-lg transition active:scale-95 disabled:opacity-70 disabled:scale-100"
            style={{ background: poked ? "var(--gradient-party)" : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)" }}
          >
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
                <BellRing size={22} className={pokeMutation.isPending ? "animate-pulse" : poked ? "animate-bounce" : ""} />
              </div>
              <div className="text-left">
                <div className="text-xs uppercase tracking-widest text-white/70">Aviso</div>
                <div className="text-lg font-medium">
                  {pokeMutation.isPending ? "Avisando..." : poked ? "¡Admin avisado!" : "Dar un toque al Admin"}
                </div>
              </div>
            </div>
            <div className="text-2xl">{poked ? "✨" : "👉"}</div>
          </button>
        )}

        {/* Ranking */}
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-lg font-medium">Clasificación</h2>
            <div className="text-xs text-muted-foreground">En directo</div>
          </div>
          <div className="glass rounded-3xl p-2">
            {ranking.map((m, i) => (
              <div key={m.id} className={`flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-white/5 ${m.id === currentMemberId ? 'bg-white/5 border border-white/10' : ''}`}>
                <div className="w-6 text-center text-sm text-muted-foreground">{i + 1}</div>
                <Avatar src={m.avatar} name={m.name} size={36} frame={m.frame} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate font-medium">{m.name}</div>
                    {m.id === currentMemberId && (
                      <span className="shrink-0 rounded-full bg-primary/20 px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-primary">Tú</span>
                    )}
                  </div>
                  <div className="truncate text-[11px] italic text-muted-foreground">"{m.title || getTitleForMember(i + 1, m.points, 0, 0)?.name || "Sin título"}"</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{m.points}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">pts</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <FloatingNav />

      {/* MODAL DE EMPEZAR NOCHE (Solo Admin) */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center animate-in fade-in">
          <div 
            className="w-full max-w-md bg-[#0a0a0f] rounded-t-[32px] sm:rounded-[32px] p-6 border-t sm:border border-white/10 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-medium">Bautiza la noche</h2>
                <p className="text-sm text-muted-foreground mt-1">Elige dónde guardar los recuerdos.</p>
              </div>
              <button 
                onClick={() => setShowStartModal(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/5 hover:bg-white/10 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Selector de Evento */}
              <div className="relative">
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full appearance-none rounded-2xl bg-white/5 px-4 py-4 pr-10 text-sm border border-white/10 outline-none focus:border-primary transition"
                >
                  <option value="new" className="bg-[#0a0a0f]">✨ Crear un álbum nuevo</option>
                  {pastEvents && pastEvents.length > 0 && (
                    <optgroup label="Álbumes Anteriores" className="bg-[#0a0a0f] text-muted-foreground">
                      {pastEvents.map((e: any) => (
                        <option key={e.id} value={e.id} className="text-foreground">
                          {e.name} ({e.date})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  <Calendar size={16} />
                </div>
              </div>

              {/* Input si es evento nuevo */}
              {selectedEventId === "new" && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Ej: Cipotegato 2026"
                    className="w-full rounded-2xl bg-white/5 px-4 py-4 text-sm border border-white/10 outline-none focus:border-primary transition placeholder:text-white/30"
                  />
                  <p className="text-[11px] text-muted-foreground mt-2 ml-1">
                    Si lo dejas en blanco, se llamará "Fiesta {new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long" })}".
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="mt-8 w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-medium text-white transition active:scale-95 disabled:opacity-50 shadow-[0_0_30px_-10px_rgba(124,58,237,0.4)]"
              style={{ background: "var(--gradient-party)" }}
            >
              {startMutation.isPending ? (
                <span className="animate-pulse">Arrancando motores...</span>
              ) : (
                <>
                  <PartyPopper size={18} /> Arrancar Fiesta
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </PhoneFrame>
  );
}