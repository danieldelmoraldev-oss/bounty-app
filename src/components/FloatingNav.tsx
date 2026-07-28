import { Link, useRouterState } from "@tanstack/react-router";
import { Trophy, Swords, Camera, Images, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getGroupInfo } from "@/api/groups.server";
import { getStoredGroupCode } from "@/hooks/use-auth";
import { useState, useEffect } from "react";

type Item = { to: string; label: string; Icon: typeof Trophy; primary?: boolean };
const items: Item[] = [
  { to: "/dashboard", label: "Liga", Icon: Trophy },
  { to: "/challenges", label: "Retos", Icon: Swords },
  { to: "/camera", label: "Cámara", Icon: Camera, primary: true },
  { to: "/album", label: "Álbum", Icon: Images },
  { to: "/profile", label: "Perfil", Icon: User },
];

export function FloatingNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const groupCode = getStoredGroupCode();

  // Consultamos la info global del grupo para ver si hay un recap pendiente
  const { data: groupData } = useQuery({
    queryKey: ["groupInfo", groupCode],
    queryFn: () => getGroupInfo({ data: { code: groupCode! } }),
    enabled: !!groupCode,
  });

  const pendingEventId = (groupData as any)?.pendingRecapEventId;
  const [hasWatched, setHasWatched] = useState(false);

  // Comprobamos en la memoria del móvil si ya hemos visto el recap de esta noche
  useEffect(() => {
    if (pendingEventId) {
      setHasWatched(localStorage.getItem(`recap_watched_${pendingEventId}`) === "true");
    }
  }, [pendingEventId, path]);

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center justify-end px-4 pb-5">
      
      {/* --- PÍLDORA FLOTANTE DE AVISO --- */}
      {pendingEventId && !hasWatched && path !== "/night-recap" && (
        <Link
          to="/night-recap"
          search={{ eventId: pendingEventId }}
          className="pointer-events-auto mb-4 flex animate-bounce items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white shadow-[0_10px_30px_-10px_rgba(239,68,68,0.8)] backdrop-blur-md active:scale-95"
          style={{ background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)" }}
        >
          <span>🍿</span> Tienes un Recap pendiente
        </Link>
      )}

      {/* --- NAVEGACIÓN NORMAL --- */}
      <div className="glass-strong pointer-events-auto flex items-center gap-1 rounded-full px-2 py-2">
        {items.map(({ to, label, Icon, primary }) => {
          const active = path === to;
          if (primary) {
            return (
              <Link
                key={to}
                to={to as never}
                aria-label={label}
                className="mx-1 grid h-14 w-14 place-items-center rounded-full text-white shadow-[0_10px_30px_-6px_oklch(0.65_0.22_295_/_0.6)]"
                style={{ background: "var(--gradient-party)" }}
              >
                <Icon size={22} strokeWidth={1.75} />
              </Link>
            );
          }
          return (
            <Link
              key={to}
              to={to as never}
              aria-label={label}
              className={`grid h-11 w-11 place-items-center rounded-full transition ${
                active ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              <Icon size={20} strokeWidth={1.6} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}